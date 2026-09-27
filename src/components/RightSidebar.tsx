import Link from "next/link";
import { Search, BadgeCheck } from "lucide-react";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import PremiumWidget from "./PremiumWidget";
import { getTrending, getSuggestedUsers } from "@/lib/queries";
import { formatCount } from "@/lib/format";
import type { User } from "@/lib/types";

export default async function RightSidebar({ currentUser }: { currentUser: User }) {
  const trending = await getTrending();
  const suggestions = await getSuggestedUsers(currentUser.id, 5);

  return (
    <div className="hidden lg:flex flex-col gap-4 w-[290px] xl:w-[350px] shrink-0 py-2 px-4 sticky top-0 max-h-screen overflow-y-auto scrollbar-none">
      <form action="/explore" className="relative sticky top-0 bg-bg z-10 pt-2 -mt-2">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
        />
        <input
          name="q"
          placeholder="Search"
          className="w-full bg-bg-elevated border border-transparent rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-[var(--color-text-secondary)] transition-colors"
        />
      </form>

      <PremiumWidget />

      {trending.length > 0 && (
        <div className="bg-bg-elevated rounded-2xl overflow-hidden border border-[var(--color-border)]">
          <h2 className="text-xl font-bold px-4 pt-3 pb-1">Trends</h2>
          {trending.map((t, i) => (
            <Link
              key={t.tag}
              href={`/explore?q=${encodeURIComponent(t.tag)}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-hover)] transition-colors"
            >
              <span className="text-[var(--color-text-secondary)] text-sm font-bold w-3 pt-0.5">
                {i + 1}
              </span>
              <div>
                <div className="font-bold text-sm">{t.tag}</div>
                <div className="text-[var(--color-text-secondary)] text-xs">
                  {formatCount(t.count)} posts
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="bg-bg-elevated rounded-2xl overflow-hidden border border-[var(--color-border)]">
          <h2 className="text-xl font-bold px-4 pt-3 pb-1">Who to follow</h2>
          {suggestions.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-hover)] transition-colors"
            >
              <Link href={`/profile/${u.username}`}>
                <Avatar name={u.name} size={40} src={u.avatarUrl} />
              </Link>
              <Link href={`/profile/${u.username}`} className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate flex items-center gap-0.5">
                  {u.name}
                  {u.verified && <BadgeCheck size={14} className="text-accent fill-accent/20 shrink-0" />}
                </div>
                <div className="text-[var(--color-text-secondary)] text-sm truncate">
                  @{u.username}
                </div>
              </Link>
              <FollowButton targetUserId={u.id} initialFollowing={false} compact />
            </div>
          ))}
          <Link
            href="/explore"
            className="block px-4 py-3 text-accent text-sm hover:bg-[var(--color-hover)] transition-colors"
          >
            Show more
          </Link>
        </div>
      )}
      <div className="h-2" />
    </div>
  );
}
