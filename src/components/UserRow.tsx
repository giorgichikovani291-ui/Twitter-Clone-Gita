import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import type { FollowListEntry } from "@/lib/types";

export default function UserRow({
  entry,
  viewerId,
}: {
  entry: FollowListEntry;
  viewerId: string;
}) {
  const { user } = entry;
  const isSelf = user.id === viewerId;

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-hover)]/40 transition-colors">
      <Link href={`/profile/${user.username}`}>
        <Avatar name={user.name} size={44} src={user.avatarUrl} />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.username}`} className="flex items-center gap-1 font-bold text-sm hover:underline w-fit">
          {user.name}
          {user.verified && <BadgeCheck size={14} className="text-accent fill-accent/20" />}
        </Link>
        <p className="text-[var(--color-text-secondary)] text-sm">@{user.username}</p>
        {user.bio && <p className="text-sm mt-1 line-clamp-2">{user.bio}</p>}
      </div>
      {!isSelf && <FollowButton targetUserId={user.id} initialFollowing={entry.isFollowedByViewer} compact />}
    </div>
  );
}
