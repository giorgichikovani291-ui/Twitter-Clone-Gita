"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import db from "./db";
import { createSession, destroySession, getCurrentUser } from "./auth";
import { validatePassword } from "./password";
import * as q from "./queries";

export type ActionResult = { error?: string } | void;

export async function signupAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") || "").trim();
  const username = String(formData.get("username") || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !username || !email) {
    return { error: "Please fill in all fields." };
  }

  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    return { error: "Password does not meet requirements: " + passwordErrors.join(", ") };
  }

  const existing = db
    .prepare("SELECT 1 FROM users WHERE username = ? OR email = ?")
    .get(username, email);
  if (existing) {
    return { error: "A user with that username or email already exists." };
  }

  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (id, username, name, email, password_hash, bio, location, avatar_url, header_url, verified, created_at)
     VALUES (?, ?, ?, ?, ?, '', '', '', '', 0, ?)`
  ).run(id, username, name, email, passwordHash, new Date().toISOString());

  await createSession(id);
  redirect("/");
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const identifier = String(formData.get("identifier") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const row = db
    .prepare("SELECT * FROM users WHERE username = ? OR email = ?")
    .get(identifier, identifier) as any;

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return { error: "Incorrect username or password." };
  }

  await createSession(row.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function createTweetAction(
  content: string,
  parentId: string | null,
  imageUrl: string = "",
  quoteOfId: string | null = null,
  pollOptions: string[] | null = null
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if ((!content.trim() && !imageUrl && !pollOptions) || content.length > 280)
    throw new Error("Invalid tweet content");
  q.createTweet(user.id, content.trim(), parentId, imageUrl, quoteOfId, pollOptions);
  revalidatePath("/");
  if (parentId) revalidatePath(`/tweet/${parentId}`);
}

export async function deleteTweetAction(tweetId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  q.deleteTweet(tweetId, user.id);
  revalidatePath("/");
}

export async function pinTweetAction(tweetId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  q.pinTweet(user.id, tweetId);
  revalidatePath(`/profile/${user.username}`);
}

export async function unpinTweetAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  q.unpinTweet(user.id);
  revalidatePath(`/profile/${user.username}`);
}

export async function toggleLikeAction(tweetId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const liked = q.toggleLike(user.id, tweetId);
  revalidatePath("/");
  return liked;
}

export async function toggleRetweetAction(tweetId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const retweeted = q.toggleRetweet(user.id, tweetId);
  revalidatePath("/");
  return retweeted;
}

export async function toggleBookmarkAction(tweetId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const bookmarked = q.toggleBookmark(user.id, tweetId);
  revalidatePath("/bookmarks");
  return bookmarked;
}

export async function toggleFollowAction(targetUserId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const following = q.toggleFollow(user.id, targetUserId);
  revalidatePath("/");
  return following;
}

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const name = String(formData.get("name") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const avatarUrl = String(formData.get("avatarUrl") || "");
  const headerUrl = String(formData.get("headerUrl") || "");

  if (!name) return { error: "Name is required." };

  db.prepare(
    "UPDATE users SET name = ?, bio = ?, location = ?, avatar_url = ?, header_url = ? WHERE id = ?"
  ).run(name, bio, location, avatarUrl, headerUrl, user.id);

  revalidatePath(`/profile/${user.username}`);
  redirect(`/profile/${user.username}`);
}

export async function markNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) return;
  q.markNotificationsRead(user.id);
  revalidatePath("/notifications");
}

export async function sendMessageAction(recipientId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!content.trim()) throw new Error("Empty message");
  q.sendMessage(user.id, recipientId, content.trim());
  revalidatePath(`/messages/${recipientId}`);
  revalidatePath("/messages");
}

export async function checkUsernameAvailableAction(username: string): Promise<boolean> {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (clean.length < 2) return false;
  return !q.isUsernameTaken(clean);
}

export async function votePollAction(tweetId: string, optionIndex: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  q.votePoll(tweetId, user.id, optionIndex);
  revalidatePath("/");
}

export async function getMoreFeedAction(mode: "for-you" | "following", cursor: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return q.getFeed(user.id, mode, cursor);
}

export async function getMoreProfileTweetsAction(
  username: string,
  tab: "posts" | "replies" | "likes",
  cursor: string
) {
  const viewer = await getCurrentUser();
  if (!viewer) throw new Error("Unauthorized");
  const profileUser = q.getUserByUsername(username);
  if (!profileUser) throw new Error("Not found");
  if (tab === "replies") return q.getUserReplies(profileUser.id, viewer.id, cursor);
  if (tab === "likes") return q.getUserLikedTweets(profileUser.id, viewer.id, cursor);
  return q.getUserTweets(profileUser.id, viewer.id, cursor);
}

export async function getMoreBookmarksAction(cursor: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return q.getBookmarks(user.id, cursor);
}

export async function toggleMuteAction(targetUserId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const muted = q.toggleMute(user.id, targetUserId);
  revalidatePath("/");
  return muted;
}
