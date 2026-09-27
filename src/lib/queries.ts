import { randomUUID } from "crypto";
import db from "./db";
import { toPublicUser } from "./auth";
import type {
  Tweet,
  User,
  Notification,
  NotificationType,
  Message,
  Conversation,
  Poll,
  Page,
  FollowListEntry,
} from "./types";

const PAGE_SIZE = 15;
const sortKey = (alias = "") => `(${alias}created_at || '|' || ${alias}id)`;

function getPollForTweet(tweetId: string, viewerId: string | null): Poll | null {
  const pollRow = db.prepare("SELECT options FROM polls WHERE tweet_id = ?").get(tweetId) as
    | { options: string }
    | undefined;
  if (!pollRow) return null;

  const options: string[] = JSON.parse(pollRow.options);
  const voteRows = db
    .prepare("SELECT option_index FROM poll_votes WHERE tweet_id = ?")
    .all(tweetId) as { option_index: number }[];

  const votes = new Array(options.length).fill(0);
  for (const v of voteRows) votes[v.option_index]++;

  let myVoteIndex: number | null = null;
  if (viewerId) {
    const mine = db
      .prepare("SELECT option_index FROM poll_votes WHERE tweet_id = ? AND user_id = ?")
      .get(tweetId, viewerId) as { option_index: number } | undefined;
    myVoteIndex = mine ? mine.option_index : null;
  }

  return { options, votes, totalVotes: voteRows.length, myVoteIndex };
}

function hydrateTweet(row: any, viewerId: string | null, depth = 0): Tweet {
  const likeCount = (
    db.prepare("SELECT COUNT(*) as c FROM likes WHERE tweet_id = ?").get(row.id) as any
  ).c;
  const retweetCount = (
    db.prepare("SELECT COUNT(*) as c FROM retweets WHERE tweet_id = ?").get(row.id) as any
  ).c;
  const replyCount = (
    db.prepare("SELECT COUNT(*) as c FROM tweets WHERE parent_id = ?").get(row.id) as any
  ).c;

  let likedByMe = false;
  let retweetedByMe = false;
  let bookmarkedByMe = false;
  if (viewerId) {
    likedByMe = !!db
      .prepare("SELECT 1 FROM likes WHERE user_id = ? AND tweet_id = ?")
      .get(viewerId, row.id);
    retweetedByMe = !!db
      .prepare("SELECT 1 FROM retweets WHERE user_id = ? AND tweet_id = ?")
      .get(viewerId, row.id);
    bookmarkedByMe = !!db
      .prepare("SELECT 1 FROM bookmarks WHERE user_id = ? AND tweet_id = ?")
      .get(viewerId, row.id);
  }

  const authorRow = db.prepare("SELECT * FROM users WHERE id = ?").get(row.user_id);
  let replyingToUsername: string | null = null;
  if (row.parent_id) {
    const parent = db.prepare("SELECT user_id FROM tweets WHERE id = ?").get(row.parent_id) as any;
    if (parent) {
      const parentAuthor = db.prepare("SELECT username FROM users WHERE id = ?").get(parent.user_id) as any;
      replyingToUsername = parentAuthor?.username || null;
    }
  }

  let quotedTweet: Tweet | null = null;
  if (row.quote_of_id && depth === 0) {
    const quotedRow = db.prepare("SELECT * FROM tweets WHERE id = ?").get(row.quote_of_id);
    if (quotedRow) quotedTweet = hydrateTweet(quotedRow, viewerId, depth + 1);
  }

  return {
    id: row.id,
    content: row.content,
    imageUrl: row.image_url,
    parentId: row.parent_id,
    quoteOfId: row.quote_of_id,
    quotedTweet,
    poll: getPollForTweet(row.id, viewerId),
    viewCount: row.view_count || 0,
    createdAt: row.created_at,
    author: toPublicUser(authorRow),
    likeCount,
    retweetCount,
    replyCount,
    likedByMe,
    retweetedByMe,
    bookmarkedByMe,
    replyingToUsername,
  };
}

function toPage(rows: any[], limit: number, viewerId: string | null, keyOf: (r: any) => string): Page<Tweet> {
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const items = page.map((r) => hydrateTweet(r, viewerId));
  const nextCursor = hasMore && page.length > 0 ? keyOf(page[page.length - 1]) : null;
  return { items, nextCursor };
}

export function getFeed(
  viewerId: string,
  mode: "for-you" | "following",
  cursor: string | null = null,
  limit = PAGE_SIZE
): Page<Tweet> {
  const fetchLimit = limit + 1;
  const mutedIds = getMutedUserIds(viewerId);
  const mutedParams: Record<string, string> = {};
  mutedIds.forEach((id, i) => (mutedParams[`muted${i}`] = id));
  const mutedFilter =
    mutedIds.length > 0
      ? `AND t.user_id NOT IN (${mutedIds.map((_, i) => `@muted${i}`).join(",")})`
      : "";
  let rows: any[];
  if (mode === "following") {
    rows = db
      .prepare(
        `SELECT t.* FROM tweets t
         WHERE t.parent_id IS NULL
         AND (t.user_id IN (SELECT following_id FROM follows WHERE follower_id = @viewerId) OR t.user_id = @viewerId)
         AND (@cursor IS NULL OR ${sortKey("t.")} < @cursor)
         ${mutedFilter}
         ORDER BY ${sortKey("t.")} DESC
         LIMIT @fetchLimit`
      )
      .all({ viewerId, cursor, fetchLimit, ...mutedParams });
  } else {
    rows = db
      .prepare(
        `SELECT t.* FROM tweets t WHERE t.parent_id IS NULL
         AND (@cursor IS NULL OR ${sortKey("t.")} < @cursor)
         ${mutedFilter}
         ORDER BY ${sortKey("t.")} DESC
         LIMIT @fetchLimit`
      )
      .all({ cursor, fetchLimit, ...mutedParams });
  }
  return toPage(rows, limit, viewerId, (r) => `${r.created_at}|${r.id}`);
}

export function getTweetById(id: string, viewerId: string | null): Tweet | null {
  const row = db.prepare("SELECT * FROM tweets WHERE id = ?").get(id);
  if (!row) return null;
  return hydrateTweet(row, viewerId);
}

export function incrementViewCount(id: string) {
  db.prepare("UPDATE tweets SET view_count = view_count + 1 WHERE id = ?").run(id);
}

export function getReplies(tweetId: string, viewerId: string | null): Tweet[] {
  const rows = db
    .prepare("SELECT * FROM tweets WHERE parent_id = ? ORDER BY created_at ASC")
    .all(tweetId);
  return rows.map((r) => hydrateTweet(r, viewerId));
}

export function getUserTweets(
  userId: string,
  viewerId: string | null,
  cursor: string | null = null,
  limit = PAGE_SIZE
): Page<Tweet> {
  const rows = db
    .prepare(
      `SELECT * FROM tweets WHERE user_id = @userId AND parent_id IS NULL
       AND (@cursor IS NULL OR ${sortKey()} < @cursor)
       ORDER BY ${sortKey()} DESC
       LIMIT @fetchLimit`
    )
    .all({ userId, cursor, fetchLimit: limit + 1 });
  return toPage(rows, limit, viewerId, (r) => `${r.created_at}|${r.id}`);
}

export function getUserReplies(
  userId: string,
  viewerId: string | null,
  cursor: string | null = null,
  limit = PAGE_SIZE
): Page<Tweet> {
  const rows = db
    .prepare(
      `SELECT * FROM tweets WHERE user_id = @userId AND parent_id IS NOT NULL
       AND (@cursor IS NULL OR ${sortKey()} < @cursor)
       ORDER BY ${sortKey()} DESC
       LIMIT @fetchLimit`
    )
    .all({ userId, cursor, fetchLimit: limit + 1 });
  return toPage(rows, limit, viewerId, (r) => `${r.created_at}|${r.id}`);
}

export function getUserLikedTweets(
  userId: string,
  viewerId: string | null,
  cursor: string | null = null,
  limit = PAGE_SIZE
): Page<Tweet> {
  const rows = db
    .prepare(
      `SELECT t.*, l.created_at AS sort_created_at, l.tweet_id AS sort_id
       FROM tweets t JOIN likes l ON l.tweet_id = t.id
       WHERE l.user_id = @userId
       AND (@cursor IS NULL OR (l.created_at || '|' || l.tweet_id) < @cursor)
       ORDER BY (l.created_at || '|' || l.tweet_id) DESC
       LIMIT @fetchLimit`
    )
    .all({ userId, cursor, fetchLimit: limit + 1 });
  return toPage(rows, limit, viewerId, (r) => `${r.sort_created_at}|${r.sort_id}`);
}

export function getBookmarks(
  userId: string,
  cursor: string | null = null,
  limit = PAGE_SIZE
): Page<Tweet> {
  const rows = db
    .prepare(
      `SELECT t.*, b.created_at AS sort_created_at, b.tweet_id AS sort_id
       FROM tweets t JOIN bookmarks b ON b.tweet_id = t.id
       WHERE b.user_id = @userId
       AND (@cursor IS NULL OR (b.created_at || '|' || b.tweet_id) < @cursor)
       ORDER BY (b.created_at || '|' || b.tweet_id) DESC
       LIMIT @fetchLimit`
    )
    .all({ userId, cursor, fetchLimit: limit + 1 });
  return toPage(rows, limit, userId, (r) => `${r.sort_created_at}|${r.sort_id}`);
}

function extractMentions(content: string): string[] {
  const matches = content.match(/@[a-zA-Z0-9_]+/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

export function createTweet(
  userId: string,
  content: string,
  parentId: string | null,
  imageUrl: string = "",
  quoteOfId: string | null = null,
  pollOptions: string[] | null = null
): Tweet {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO tweets (id, user_id, content, image_url, parent_id, quote_of_id, view_count, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)"
  ).run(id, userId, content, imageUrl, parentId, quoteOfId, createdAt);

  if (pollOptions && pollOptions.length >= 2) {
    createPoll(id, pollOptions);
  }

  if (parentId) {
    const parent = db.prepare("SELECT user_id FROM tweets WHERE id = ?").get(parentId) as any;
    if (parent && parent.user_id !== userId) {
      addNotification(parent.user_id, userId, "reply", id);
    }
  }

  if (quoteOfId) {
    const quoted = db.prepare("SELECT user_id FROM tweets WHERE id = ?").get(quoteOfId) as any;
    if (quoted && quoted.user_id !== userId) {
      addNotification(quoted.user_id, userId, "quote", id);
    }
  }

  for (const username of extractMentions(content)) {
    const mentioned = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as any;
    if (mentioned && mentioned.id !== userId) {
      addNotification(mentioned.id, userId, "mention", id);
    }
  }

  return getTweetById(id, userId)!;
}

export function deleteTweet(tweetId: string, userId: string): boolean {
  const row = db.prepare("SELECT user_id FROM tweets WHERE id = ?").get(tweetId) as any;
  if (!row || row.user_id !== userId) return false;
  db.prepare("UPDATE users SET pinned_tweet_id = NULL WHERE pinned_tweet_id = ?").run(tweetId);
  db.prepare("DELETE FROM tweets WHERE id = ?").run(tweetId);
  return true;
}

export function pinTweet(userId: string, tweetId: string): boolean {
  const row = db.prepare("SELECT user_id FROM tweets WHERE id = ?").get(tweetId) as any;
  if (!row || row.user_id !== userId) return false;
  db.prepare("UPDATE users SET pinned_tweet_id = ? WHERE id = ?").run(tweetId, userId);
  return true;
}

export function unpinTweet(userId: string) {
  db.prepare("UPDATE users SET pinned_tweet_id = NULL WHERE id = ?").run(userId);
}

export function toggleLike(userId: string, tweetId: string): boolean {
  const existing = db
    .prepare("SELECT 1 FROM likes WHERE user_id = ? AND tweet_id = ?")
    .get(userId, tweetId);
  if (existing) {
    db.prepare("DELETE FROM likes WHERE user_id = ? AND tweet_id = ?").run(userId, tweetId);
    return false;
  }
  db.prepare("INSERT INTO likes (user_id, tweet_id, created_at) VALUES (?, ?, ?)").run(
    userId,
    tweetId,
    new Date().toISOString()
  );
  const tweet = db.prepare("SELECT user_id FROM tweets WHERE id = ?").get(tweetId) as any;
  if (tweet && tweet.user_id !== userId) addNotification(tweet.user_id, userId, "like", tweetId);
  return true;
}

export function toggleRetweet(userId: string, tweetId: string): boolean {
  const existing = db
    .prepare("SELECT 1 FROM retweets WHERE user_id = ? AND tweet_id = ?")
    .get(userId, tweetId);
  if (existing) {
    db.prepare("DELETE FROM retweets WHERE user_id = ? AND tweet_id = ?").run(userId, tweetId);
    return false;
  }
  db.prepare("INSERT INTO retweets (user_id, tweet_id, created_at) VALUES (?, ?, ?)").run(
    userId,
    tweetId,
    new Date().toISOString()
  );
  const tweet = db.prepare("SELECT user_id FROM tweets WHERE id = ?").get(tweetId) as any;
  if (tweet && tweet.user_id !== userId) addNotification(tweet.user_id, userId, "retweet", tweetId);
  return true;
}

export function toggleBookmark(userId: string, tweetId: string): boolean {
  const existing = db
    .prepare("SELECT 1 FROM bookmarks WHERE user_id = ? AND tweet_id = ?")
    .get(userId, tweetId);
  if (existing) {
    db.prepare("DELETE FROM bookmarks WHERE user_id = ? AND tweet_id = ?").run(userId, tweetId);
    return false;
  }
  db.prepare("INSERT INTO bookmarks (user_id, tweet_id, created_at) VALUES (?, ?, ?)").run(
    userId,
    tweetId,
    new Date().toISOString()
  );
  return true;
}

export function getUserTweetCount(userId: string): number {
  return (
    db
      .prepare("SELECT COUNT(*) as c FROM tweets WHERE user_id = ? AND parent_id IS NULL")
      .get(userId) as any
  ).c;
}

export function getUserByUsername(username: string): User | null {
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!row) return null;
  return toPublicUser(row);
}

export function getUserById(id: string): User | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!row) return null;
  return toPublicUser(row);
}

export function getFollowCounts(userId: string) {
  const followers = (
    db.prepare("SELECT COUNT(*) as c FROM follows WHERE following_id = ?").get(userId) as any
  ).c;
  const following = (
    db.prepare("SELECT COUNT(*) as c FROM follows WHERE follower_id = ?").get(userId) as any
  ).c;
  return { followers, following };
}

export function isFollowing(followerId: string, followingId: string): boolean {
  return !!db
    .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
    .get(followerId, followingId);
}

export function toggleFollow(followerId: string, followingId: string): boolean {
  if (followerId === followingId) return false;
  const existing = db
    .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
    .get(followerId, followingId);
  if (existing) {
    db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(
      followerId,
      followingId
    );
    return false;
  }
  db.prepare("INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)").run(
    followerId,
    followingId,
    new Date().toISOString()
  );
  addNotification(followingId, followerId, "follow", null);
  return true;
}

export function getFollowersList(userId: string, viewerId: string | null): FollowListEntry[] {
  const rows = db
    .prepare(
      `SELECT u.* FROM users u JOIN follows f ON f.follower_id = u.id
       WHERE f.following_id = ? ORDER BY f.created_at DESC`
    )
    .all(userId);
  return rows.map((r: any) => ({
    user: toPublicUser(r),
    isFollowedByViewer: viewerId ? isFollowing(viewerId, r.id) : false,
  }));
}

export function getFollowingList(userId: string, viewerId: string | null): FollowListEntry[] {
  const rows = db
    .prepare(
      `SELECT u.* FROM users u JOIN follows f ON f.following_id = u.id
       WHERE f.follower_id = ? ORDER BY f.created_at DESC`
    )
    .all(userId);
  return rows.map((r: any) => ({
    user: toPublicUser(r),
    isFollowedByViewer: viewerId ? isFollowing(viewerId, r.id) : false,
  }));
}

export function searchAll(query: string, viewerId: string | null) {
  const q = `%${query}%`;
  const userRows = db
    .prepare("SELECT * FROM users WHERE username LIKE ? OR name LIKE ? LIMIT 10")
    .all(q, q);
  const tweetRows = db
    .prepare("SELECT * FROM tweets WHERE content LIKE ? ORDER BY created_at DESC LIMIT 20")
    .all(q);
  return {
    users: userRows.map(toPublicUser),
    tweets: tweetRows.map((r) => hydrateTweet(r, viewerId)),
  };
}

export function getSuggestedUsers(viewerId: string, limit = 3): User[] {
  const rows = db
    .prepare(
      `SELECT * FROM users WHERE id != ? AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
       ORDER BY verified DESC, created_at DESC LIMIT ?`
    )
    .all(viewerId, viewerId, limit);
  return rows.map(toPublicUser);
}

export function getTrending(): { tag: string; count: number }[] {
  const rows = db.prepare("SELECT content FROM tweets").all() as { content: string }[];
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const matches = row.content.match(/#[\p{L}0-9_]+/gu) || [];
    for (const m of matches) counts[m] = (counts[m] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// --- polls ---

export function createPoll(tweetId: string, options: string[]) {
  db.prepare("INSERT INTO polls (tweet_id, options, created_at) VALUES (?, ?, ?)").run(
    tweetId,
    JSON.stringify(options),
    new Date().toISOString()
  );
}

export function votePoll(tweetId: string, userId: string, optionIndex: number): boolean {
  const poll = db.prepare("SELECT options FROM polls WHERE tweet_id = ?").get(tweetId) as
    | { options: string }
    | undefined;
  if (!poll) return false;
  const options: string[] = JSON.parse(poll.options);
  if (optionIndex < 0 || optionIndex >= options.length) return false;

  const existing = db
    .prepare("SELECT 1 FROM poll_votes WHERE tweet_id = ? AND user_id = ?")
    .get(tweetId, userId);
  if (existing) return false;

  db.prepare(
    "INSERT INTO poll_votes (tweet_id, user_id, option_index, created_at) VALUES (?, ?, ?, ?)"
  ).run(tweetId, userId, optionIndex, new Date().toISOString());
  return true;
}

function addNotification(
  userId: string,
  actorId: string,
  type: NotificationType,
  tweetId: string | null
) {
  if (userId === actorId) return;
  db.prepare(
    "INSERT INTO notifications (id, user_id, actor_id, type, tweet_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)"
  ).run(randomUUID(), userId, actorId, type, tweetId, new Date().toISOString());
}

export function getNotifications(userId: string): Notification[] {
  const rows = db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(userId) as any[];
  return rows.map((row) => {
    const actorRow = db.prepare("SELECT * FROM users WHERE id = ?").get(row.actor_id);
    const tweet = row.tweet_id ? getTweetById(row.tweet_id, userId) : null;
    return {
      id: row.id,
      type: row.type,
      createdAt: row.created_at,
      isRead: !!row.is_read,
      actor: toPublicUser(actorRow),
      tweet,
    };
  });
}

export function markNotificationsRead(userId: string) {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(userId);
}

export function getUnreadNotificationCount(userId: string): number {
  return (
    db
      .prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0")
      .get(userId) as any
  ).c;
}

// --- direct messages ---

export function sendMessage(senderId: string, recipientId: string, content: string): Message {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO messages (id, sender_id, recipient_id, content, is_read, created_at) VALUES (?, ?, ?, ?, 0, ?)"
  ).run(id, senderId, recipientId, content, createdAt);
  const senderRow = db.prepare("SELECT * FROM users WHERE id = ?").get(senderId);
  const recipientRow = db.prepare("SELECT * FROM users WHERE id = ?").get(recipientId);
  return {
    id,
    content,
    createdAt,
    isRead: false,
    sender: toPublicUser(senderRow),
    recipient: toPublicUser(recipientRow),
  };
}

export function getMessages(userId: string, otherUserId: string): Message[] {
  const rows = db
    .prepare(
      `SELECT * FROM messages
       WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
       ORDER BY created_at ASC`
    )
    .all(userId, otherUserId, otherUserId, userId) as any[];
  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    isRead: !!row.is_read,
    sender: toPublicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(row.sender_id)),
    recipient: toPublicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(row.recipient_id)),
  }));
}

export function markMessagesRead(userId: string, otherUserId: string) {
  db.prepare(
    "UPDATE messages SET is_read = 1 WHERE recipient_id = ? AND sender_id = ?"
  ).run(userId, otherUserId);
}

export function getConversations(userId: string): Conversation[] {
  const partnerIds = db
    .prepare(
      `SELECT DISTINCT CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END as other_id
       FROM messages WHERE sender_id = ? OR recipient_id = ?`
    )
    .all(userId, userId, userId) as { other_id: string }[];

  const conversations: Conversation[] = partnerIds.map(({ other_id }) => {
    const messages = getMessages(userId, other_id);
    const lastMessage = messages[messages.length - 1];
    const unreadCount = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM messages WHERE recipient_id = ? AND sender_id = ? AND is_read = 0"
        )
        .get(userId, other_id) as any
    ).c;
    return {
      otherUser: getUserById(other_id)!,
      lastMessage,
      unreadCount,
    };
  });

  return conversations.sort(
    (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
  );
}

export function getUnreadMessageCount(userId: string): number {
  return (
    db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE recipient_id = ? AND is_read = 0")
      .get(userId) as any
  ).c;
}

export function isUsernameTaken(username: string): boolean {
  return !!db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
}

// --- mutes ---

export function toggleMute(muterId: string, mutedId: string): boolean {
  if (muterId === mutedId) return false;
  const existing = db
    .prepare("SELECT 1 FROM mutes WHERE muter_id = ? AND muted_id = ?")
    .get(muterId, mutedId);
  if (existing) {
    db.prepare("DELETE FROM mutes WHERE muter_id = ? AND muted_id = ?").run(muterId, mutedId);
    return false;
  }
  db.prepare("INSERT INTO mutes (muter_id, muted_id, created_at) VALUES (?, ?, ?)").run(
    muterId,
    mutedId,
    new Date().toISOString()
  );
  return true;
}

export function isMuted(muterId: string, mutedId: string): boolean {
  return !!db.prepare("SELECT 1 FROM mutes WHERE muter_id = ? AND muted_id = ?").get(muterId, mutedId);
}

export function getMutedUserIds(muterId: string): string[] {
  return (
    db.prepare("SELECT muted_id FROM mutes WHERE muter_id = ?").all(muterId) as { muted_id: string }[]
  ).map((r) => r.muted_id);
}
