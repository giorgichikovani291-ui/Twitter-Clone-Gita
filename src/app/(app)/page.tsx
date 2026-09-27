export const dynamic = 'force-dynamic';
import { requireUser } from "@/lib/auth";
import { getFeed } from "@/lib/queries";
import { getMoreFeedAction } from "@/lib/actions";
import TweetComposer from "@/components/TweetComposer";
import InfiniteFeed from "@/components/InfiniteFeed";
import TabBar from "@/components/TabBar";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const mode = tab === "following" ? "following" : "for-you";
  const page = await getFeed(user.id, mode);

  return (
    <div>
      <div className="sticky top-0 bg-bg/80 backdrop-blur-md z-10 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-bold px-4 py-3">Home</h1>
        <TabBar
          layoutId="home-tab-underline"
          activeKey={mode}
          tabs={[
            { key: "for-you", label: "For you", href: "/" },
            { key: "following", label: "Following", href: "/?tab=following" },
          ]}
        />
      </div>

      <TweetComposer user={user} />

      <InfiniteFeed
        key={mode}
        initialItems={page.items}
        initialCursor={page.nextCursor}
        currentUserId={user.id}
        loadMore={getMoreFeedAction.bind(null, mode)}
        emptyMessage={
          mode === "following"
            ? "You're not following anyone yet — follow some people to see their posts here."
            : "Nothing to see here yet."
        }
      />
    </div>
  );
}
