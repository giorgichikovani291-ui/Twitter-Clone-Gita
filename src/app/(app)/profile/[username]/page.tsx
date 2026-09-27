export const revalidate = 0;
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, BadgeCheck, Pin, Mail, Bookmark } from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  getUserByUsername,
  getUserTweets,
  getUserReplies,
  getUserLikedTweets,
  getUserTweetCount,
  getFollowCounts,
  isFollowing,
  getTweetById,
} from "@/lib/queries";
import { getMoreProfileTweetsAction } from "@/lib/actions";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import TweetCard from "@/components/TweetCard";
import TabBar from "@/components/TabBar";
import InfiniteFeed from "@/components/InfiniteFeed";
import { formatCount } from "@/lib/format";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  const currentUser = await requireUser();
  const profileUser = await getUserByUsername(username);
  if (!profileUser) notFound();

  const isOwn = profileUser.id === currentUser.id;
  const activeTab = tab === "replies" ? "replies" : tab === "likes" ? "likes" : "posts";

  const [following, { followers, following: followingCount }, tweetCount, page, pinnedTweet] =
    await Promise.all([
      isOwn ? Promise.resolve(false) : isFollowing(currentUser.id, profileUser.id),
      getFollowCounts(profileUser.id),
      getUserTweetCount(profileUser.id),
      activeTab === "replies"
        ? getUserReplies(profileUser.id, currentUser.id)
        : activeTab === "likes"
        ? getUserLikedTweets(profileUser.id, currentUser.id)
        : getUserTweets(profileUser.id, currentUser.id),
      profileUser.pinnedTweetId ? getTweetById(profileUser.pinnedTweetId, currentUser.id) : null,
    ]);

  const joined = new Date(profileUser.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const tabs = [
    { key: "posts", label: "Posts" },
    { key: "replies", label: "Replies" },
    { key: "likes", label: "Likes" },
  ];

  const emptyMessages: Record<string, string> = {
    posts: "Nothing here yet.",
    replies: "No replies here yet.",
    likes: "Liked posts will show up here.",
  };

  return (
    <div>
      <div className="sticky top-0 bg-bg/80 backdrop-blur-md z-10 flex items-center gap-6 px-4 py-2 border-b border-[var(--color-border)]">
        <Link href="/" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--color-hover)]">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-bold text-lg leading-tight flex items-center gap-1">
            {profileUser.name}
            {profileUser.verified && <BadgeCheck size={16} className="text-accent fill-accent/20" />}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs">{tweetCount} posts</p>
        </div>
      </div>

      <div
        className="h-32 sm:h-48 bg-gradient-to-br from-accent/30 via-bg-elevated to-bg-elevated bg-cover bg-center"
        style={profileUser.headerUrl ? { backgroundImage: `url(${profileUser.headerUrl})` } : undefined}
      />

      <div className="px-4">
        <div className="flex items-end justify-between -mt-12 sm:-mt-16">
          <div className="rounded-full border-4 border-bg overflow-hidden">
            <Avatar name={profileUser.name} size={96} src={profileUser.avatarUrl} />
          </div>
          <div className="mt-14 flex items-center gap-2">
            {!isOwn && (
              <Link
                href={`/messages/${profileUser.username}`}
                className="w-9 h-9 rounded-full border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-hover)] active:scale-95 transition-all"
              >
                <Mail size={18} />
              </Link>
            )}
            {isOwn && (
              <Link
                href="/bookmarks"
                className="md:hidden w-9 h-9 rounded-full border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-hover)] active:scale-95 transition-all"
              >
                <Bookmark size={18} />
              </Link>
            )}
            {isOwn ? (
              <Link
                href={`/profile/${profileUser.username}/edit`}
                className="px-4 py-1.5 rounded-full border border-[var(--color-border)] font-bold text-sm hover:bg-[var(--color-hover)] active:scale-95 transition-all"
              >
                Edit profile
              </Link>
            ) : (
              <FollowButton targetUserId={profileUser.id} initialFollowing={following} />
            )}
          </div>
        </div>

        <div className="mt-3">
          <h2 className="text-xl font-bold flex items-center gap-1">
            {profileUser.name}
            {profileUser.verified && <BadgeCheck size={18} className="text-accent fill-accent/20" />}
          </h2>
          <p className="text-[var(--color-text-secondary)]">@{profileUser.username}</p>
        </div>

        {profileUser.bio && <p className="mt-3 text-[15px]">{profileUser.bio}</p>}

        <div className="flex flex-wrap gap-3 mt-3 text-[var(--color-text-secondary)] text-sm">
          {profileUser.location && (
            <span className="flex items-center gap-1">
              <MapPin size={16} /> {profileUser.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar size={16} /> Joined {joined}
          </span>
        </div>

        <div className="flex gap-4 mt-3 text-sm">
          <Link href={`/profile/${username}/following`} className="hover:underline">
            <b>{formatCount(followingCount)}</b>{" "}
            <span className="text-[var(--color-text-secondary)]">Following</span>
          </Link>
          <Link href={`/profile/${username}/followers`} className="hover:underline">
            <b>{formatCount(followers)}</b> <span className="text-[var(--color-text-secondary)]">Followers</span>
          </Link>
        </div>
      </div>

      <TabBar
        layoutId="profile-tab-underline"
        activeKey={activeTab}
        tabs={tabs.map((t) => ({
          key: t.key,
          label: t.label,
          href: t.key === "posts" ? `/profile/${username}` : `/profile/${username}?tab=${t.key}`,
        }))}
      />

      {activeTab === "posts" && pinnedTweet && (
        <div>
          <div className="flex items-center gap-2 px-4 pt-3 text-[var(--color-text-secondary)] text-xs font-bold">
            <Pin size={14} /> Pinned post
          </div>
          <TweetCard tweet={pinnedTweet} currentUserId={currentUser.id} />
        </div>
      )}

      <InfiniteFeed
        key={activeTab}
        initialItems={page.items}
        initialCursor={page.nextCursor}
        currentUserId={currentUser.id}
        loadMore={getMoreProfileTweetsAction.bind(null, username, activeTab)}
        emptyMessage={emptyMessages[activeTab]}
        excludeId={activeTab === "posts" ? pinnedTweet?.id : undefined}
      />
    </div>
  );
}
