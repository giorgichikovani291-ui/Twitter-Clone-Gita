import Link from "next/link";
import { Search, SearchX } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { searchAll, getTrending } from "@/lib/queries";
import Avatar from "@/components/Avatar";
import TweetCard from "@/components/TweetCard";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const currentUser = await requireUser();
  const { q } = await searchParams;
  const query = (q || "").trim();
  const results = query ? await searchAll(query, currentUser.id) : null;
  const trending = !query ? await getTrending() : [];

  return (
    <div>
      <div className="sticky top-0 bg-bg/80 backdrop-blur-md z-10 px-4 py-2 border-b border-[var(--color-border)]">
        <form action="/explore" className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search Twitter"
            className="w-full bg-bg-elevated rounded-full pl-11 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-[var(--color-text-secondary)]"
          />
        </form>
      </div>

      {!query && (
        <div>
          <h2 className="text-xl font-bold px-4 py-3">Trending today</h2>
          {trending.length === 0 ? (
            <p className="px-4 pb-8 text-[var(--color-text-secondary)]">Nothing trending yet.</p>
          ) : (
            trending.map((t) => (
              <Link
                key={t.tag}
                href={`/explore?q=${encodeURIComponent(t.tag)}`}
                className="block px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-hover)]"
              >
                <div className="font-bold">{t.tag}</div>
                <div className="text-[var(--color-text-secondary)] text-sm">{t.count} posts</div>
              </Link>
            ))
          )}
        </div>
      )}

      {results && (
        <div>
          {results.users.length > 0 && (
            <div className="border-b border-[var(--color-border)]">
              {results.users.map((u) => (
                <Link
                  key={u.id}
                  href={`/profile/${u.username}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-hover)]"
                >
                  <Avatar name={u.name} size={40} src={u.avatarUrl} />
                  <div>
                    <div className="font-bold text-sm">{u.name}</div>
                    <div className="text-[var(--color-text-secondary)] text-sm">@{u.username}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {results.tweets.length === 0 && results.users.length === 0 ? (
            <div className="px-4 py-20 text-center text-[var(--color-text-secondary)] flex flex-col items-center gap-3">
              <SearchX size={40} className="opacity-40" />
              <p>No results for &quot;{query}&quot;.</p>
            </div>
          ) : (
            results.tweets.map((t) => (
              <TweetCard key={t.id} tweet={t} currentUserId={currentUser.id} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
