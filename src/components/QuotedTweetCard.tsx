import Link from "next/link";
import Avatar from "./Avatar";
import type { Tweet } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.max(1, Math.floor(diff))}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function QuotedTweetCard({ tweet }: { tweet: Tweet }) {
  return (
    <Link
      href={`/tweet/${tweet.id}`}
      onClick={(e) => e.stopPropagation()}
      className="block mt-3 border border-[var(--color-border)] rounded-2xl p-3 hover:bg-[var(--color-hover)]/40 transition-colors"
    >
      <div className="flex items-center gap-2 text-sm">
        <Avatar name={tweet.author.name} size={20} src={tweet.author.avatarUrl} />
        <span className="font-bold">{tweet.author.name}</span>
        <span className="text-[var(--color-text-secondary)]">
          @{tweet.author.username} · {timeAgo(tweet.createdAt)}
        </span>
      </div>
      <p className="text-sm mt-1 whitespace-pre-wrap break-words line-clamp-4">{tweet.content}</p>
      {tweet.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tweet.imageUrl} alt="" className="mt-2 rounded-xl max-h-64 w-full object-cover" />
      )}
    </Link>
  );
}
