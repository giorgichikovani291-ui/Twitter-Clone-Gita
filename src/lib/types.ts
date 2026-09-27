export type User = {
  id: string;
  username: string;
  name: string;
  bio: string;
  location: string;
  avatarUrl: string;
  headerUrl: string;
  verified: boolean;
  pinnedTweetId: string | null;
  createdAt: string;
};

export type Poll = {
  options: string[];
  votes: number[];
  totalVotes: number;
  myVoteIndex: number | null;
};

export type Tweet = {
  id: string;
  content: string;
  imageUrl: string;
  parentId: string | null;
  quoteOfId: string | null;
  quotedTweet: Tweet | null;
  poll: Poll | null;
  viewCount: number;
  createdAt: string;
  author: User;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  likedByMe: boolean;
  retweetedByMe: boolean;
  bookmarkedByMe: boolean;
  replyingToUsername?: string | null;
};

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};

export type FollowListEntry = {
  user: User;
  isFollowedByViewer: boolean;
};

export type NotificationType = "like" | "retweet" | "reply" | "follow" | "mention" | "quote";

export type Notification = {
  id: string;
  type: NotificationType;
  createdAt: string;
  isRead: boolean;
  actor: User;
  tweet: Tweet | null;
};

export type Message = {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender: User;
  recipient: User;
};

export type Conversation = {
  otherUser: User;
  lastMessage: Message;
  unreadCount: number;
};
