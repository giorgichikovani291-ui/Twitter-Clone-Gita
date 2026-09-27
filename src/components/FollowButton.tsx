"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollowAction } from "@/lib/actions";

export default function FollowButton({
  targetUserId,
  initialFollowing,
  compact = false,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  compact?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [hovering, setHovering] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    setFollowing((v) => !v);
    startTransition(async () => {
      await toggleFollowAction(targetUserId);
      router.refresh();
    });
  }

  const base = compact
    ? "px-4 py-1.5 text-sm"
    : "px-4 py-1.5 text-sm";

  if (following) {
    return (
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        disabled={isPending}
        className={`${base} rounded-full font-bold border transition-all active:scale-95 ${
          hovering
            ? "border-danger text-danger bg-transparent"
            : "border-[var(--color-border)] bg-transparent text-text"
        }`}
      >
        {hovering ? "Unfollow" : "Following"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`${base} rounded-full font-bold bg-text text-bg hover:opacity-90 active:scale-95 transition-all`}
    >
      Follow
    </button>
  );
}
