"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { votePollAction } from "@/lib/actions";
import type { Poll } from "@/lib/types";

export default function PollDisplay({ tweetId, poll }: { tweetId: string; poll: Poll }) {
  const [myVoteIndex, setMyVoteIndex] = useState(poll.myVoteIndex);
  const [votes, setVotes] = useState(poll.votes);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const total = votes.reduce((a, b) => a + b, 0);
  const voted = myVoteIndex !== null;

  function handleVote(e: React.MouseEvent, index: number) {
    e.stopPropagation();
    if (voted || isPending) return;
    setMyVoteIndex(index);
    setVotes((v) => v.map((c, i) => (i === index ? c + 1 : c)));
    startTransition(async () => {
      await votePollAction(tweetId, index);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2 max-w-[420px]" onClick={(e) => e.stopPropagation()}>
      {poll.options.map((option, i) => {
        const pct = total > 0 ? Math.round((votes[i] / total) * 100) : 0;
        const isMine = myVoteIndex === i;
        return (
          <button
            key={i}
            onClick={(e) => handleVote(e, i)}
            disabled={voted}
            className={`relative overflow-hidden rounded-full border px-4 py-2 text-sm text-left transition-colors ${
              voted
                ? "cursor-default " + (isMine ? "border-accent" : "border-[var(--color-border)]")
                : "cursor-pointer hover:bg-accent/10 border-accent text-accent"
            }`}
          >
            {voted && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`absolute inset-y-0 left-0 ${isMine ? "bg-accent/25" : "bg-[var(--color-hover)]"}`}
              />
            )}
            <span className="relative flex items-center justify-between font-medium">
              <span>{option}</span>
              {voted && <span>{pct}%</span>}
            </span>
          </button>
        );
      })}
      <p className="text-[var(--color-text-secondary)] text-xs mt-1">{total} votes</p>
    </div>
  );
}
