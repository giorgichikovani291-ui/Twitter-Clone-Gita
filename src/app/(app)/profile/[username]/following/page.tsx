export const revalidate = 0;
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUserByUsername, getFollowingList } from "@/lib/queries";
import UserRow from "@/components/UserRow";
import TabBar from "@/components/TabBar";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await requireUser();
  const profileUser = await getUserByUsername(username);
  if (!profileUser) notFound();

  const list = await getFollowingList(profileUser.id, viewer.id);

  return (
    <div>
      <div className="sticky top-0 bg-bg/80 backdrop-blur-md z-10 flex items-center gap-6 px-4 py-2 border-b border-[var(--color-border)]">
        <Link href={`/profile/${username}`} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--color-hover)]">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-bold text-lg leading-tight">{profileUser.name}</h1>
          <p className="text-[var(--color-text-secondary)] text-xs">@{profileUser.username}</p>
        </div>
      </div>

      <TabBar
        layoutId="follow-list-tab-underline"
        activeKey="following"
        tabs={[
          { key: "following", label: "Following", href: `/profile/${username}/following` },
          { key: "followers", label: "Followers", href: `/profile/${username}/followers` },
        ]}
      />

      {list.length === 0 ? (
        <div className="px-4 py-16 text-center text-[var(--color-text-secondary)]">
          @{profileUser.username} isn&apos;t following anyone yet.
        </div>
      ) : (
        list.map((entry) => <UserRow key={entry.user.id} entry={entry} viewerId={viewer.id} />)
      )}
    </div>
  );
}
