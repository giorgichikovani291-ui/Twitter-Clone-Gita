export const revalidate = 0;
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTweetById, getReplies, incrementViewCount } from "@/lib/queries";
import Avatar from "@/components/Avatar";
import TweetCard from "@/components/TweetCard";
import TweetComposer from "@/components/TweetComposer";
import QuotedTweetCard from "@/components/QuotedTweetCard";
import PollDisplay from "@/components/PollDisplay";
import TweetActionBar from "@/components/TweetActionBar";
import { formatCount } from "@/lib/format";

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function TweetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await requireUser();
  const tweet = await getTweetById(id, currentUser.id);
  if (!tweet) notFound();

  await incrementViewCount(id);
  const replies = await getReplies(id, currentUser.id);

  return (
    <div>
      <div className="sticky top-0 bg-bg/80 backdrop-blur-md z-10 flex items-center gap-6 px-4 py-2 border-b border-[var(--color-border)]">
        <Link href="/" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--color-hover)]">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-bold text-lg">Post</h1>
      </div>

      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${tweet.author.username}`}>
            <Avatar name={tweet.author.name} size={44} src={tweet.author.avatarUrl} />
          </Link>
          <div>
            <Link href={`/profile/${tweet.author.username}`} className="font-bold hover:underline block">
              {tweet.author.name}
            </Link>
            <span className="text-[var(--color-text-secondary)] text-sm">@{tweet.author.username}</span>
          </div>
        </div>

        <p className="whitespace-pre-wrap break-words text-xl mt-4">{tweet.content}</p>

        {tweet.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tweet.imageUrl} alt="" className="mt-3 rounded-2xl border border-[var(--color-border)] max-h-[500px] w-full object-cover" />
        )}

        {tweet.quotedTweet && <QuotedTweetCard tweet={tweet.quotedTweet} />}

        {tweet.poll && <PollDisplay tweetId={tweet.id} poll={tweet.poll} />}

        <p className="text-[var(--color-text-secondary)] text-sm mt-4">
          {formatFullDate(tweet.createdAt)}
        </p>

        <div className="flex gap-5 mt-3 py-3 border-y border-[var(--color-border)] text-sm">
          <span>
            <b>{formatCount(tweet.retweetCount)}</b>{" "}
            <span className="text-[var(--color-text-secondary)]">Reposts</span>
          </span>
          <span>
            <b>{formatCount(tweet.likeCount)}</b>{" "}
            <span className="text-[var(--color-text-secondary)]">Likes</span>
          </span>
          <span className="flex items-center gap-1">
            <BarChart2 size={16} className="text-[var(--color-text-secondary)]" />
            <b>{formatCount(tweet.viewCount)}</b>{" "}
            <span className="text-[var(--color-text-secondary)]">Views</span>
          </span>
        </div>

        <TweetActionBar tweet={tweet} currentUserId={currentUser.id} large />
      </div>

      <TweetComposer
        user={currentUser}
        parentId={tweet.id}
        placeholder="Post your reply"
        buttonLabel="Reply"
      />

      {replies.map((r) => (
        <TweetCard key={r.id} tweet={r} currentUserId={currentUser.id} showParentContext={false} />
      ))}
    </div>
  );
}
