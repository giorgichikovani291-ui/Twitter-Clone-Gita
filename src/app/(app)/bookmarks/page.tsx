export const dynamic = 'force-dynamic';
import { requireUser } from "@/lib/auth";
import { getBookmarks } from "@/lib/queries";
import { getMoreBookmarksAction } from "@/lib/actions";
import InfiniteFeed from "@/components/InfiniteFeed";

export default async function BookmarksPage() {
  const user = await requireUser();
  const page = await getBookmarks(user.id);

  return (
    <div>
      <div className="sticky top-0 bg-bg/80 backdrop-blur-md z-10 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-bold px-4 py-3">Bookmarks</h1>
        <p className="text-[var(--color-text-secondary)] text-sm px-4 pb-3">@{user.username}</p>
      </div>

      <InfiniteFeed
        initialItems={page.items}
        initialCursor={page.nextCursor}
        currentUserId={user.id}
        loadMore={getMoreBookmarksAction}
        emptyMessage="Posts you bookmark will show up here."
      />
    </div>
  );
}
