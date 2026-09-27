"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trash2, MoreHorizontal, BadgeCheck, Pin, PinOff, VolumeX, Volume2, Link2 } from "lucide-react";
import Avatar from "./Avatar";
import QuotedTweetCard from "./QuotedTweetCard";
import PollDisplay from "./PollDisplay";
import TweetActionBar from "./TweetActionBar";
import { deleteTweetAction, pinTweetAction, unpinTweetAction, toggleMuteAction } from "@/lib/actions";
import { linkifyContent } from "@/lib/linkify";
import type { Tweet } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.max(1, Math.floor(diff))}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TweetCard({
  tweet,
  currentUserId,
  showParentContext = true,
  isMuted = false,
}: {
  tweet: Tweet;
  currentUserId: string;
  showParentContext?: boolean;
  isMuted?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted] = useState(isMuted);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const isOwn = tweet.author.id === currentUserId;
  const isPinned = tweet.author.pinnedTweetId === tweet.id;

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [menuOpen]);

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleDelete(e: React.MouseEvent) {
    stop(e);
    setMenuOpen(false);
    startTransition(async () => {
      await deleteTweetAction(tweet.id);
      router.refresh();
    });
  }

  function handleTogglePin(e: React.MouseEvent) {
    stop(e);
    setMenuOpen(false);
    startTransition(async () => {
      if (isPinned) await unpinTweetAction();
      else await pinTweetAction(tweet.id);
      router.refresh();
    });
  }

  function handleToggleMute(e: React.MouseEvent) {
    stop(e);
    setMenuOpen(false);
    setMuted((v) => !v);
    startTransition(async () => {
      await toggleMuteAction(tweet.author.id);
      router.refresh();
    });
  }

  function handleCopyLink(e: React.MouseEvent) {
    stop(e);
    setMenuOpen(false);
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(`${window.location.origin}/tweet/${tweet.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onClick={() => router.push(`/tweet/${tweet.id}`)}
      className="flex gap-3 px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-hover)]/50 cursor-pointer transition-colors"
    >
      <Link href={`/profile/${tweet.author.username}`} onClick={stop}>
        <Avatar name={tweet.author.name} size={44} src={tweet.author.avatarUrl} />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          <Link
            href={`/profile/${tweet.author.username}`}
            onClick={stop}
            className="font-bold hover:underline truncate flex items-center gap-0.5"
          >
            {tweet.author.name}
            {tweet.author.verified && (
              <BadgeCheck size={15} className="text-accent fill-accent/20 shrink-0" />
            )}
          </Link>
          <span className="text-[var(--color-text-secondary)] truncate">
            @{tweet.author.username}
          </span>
          <span className="text-[var(--color-text-secondary)]">·</span>
          <span className="text-[var(--color-text-secondary)] whitespace-nowrap">
            {timeAgo(tweet.createdAt)}
          </span>

          <div className="relative ml-auto" ref={menuRef}>
            <button
              onClick={(e) => {
                stop(e);
                setMenuOpen((v) => !v);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent/10 hover:text-accent text-[var(--color-text-secondary)] -mr-2"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                onClick={stop}
                className="absolute right-0 top-8 w-52 bg-bg-elevated border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden z-10"
              >
                {isOwn ? (
                  <>
                    <button
                      onClick={handleTogglePin}
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[var(--color-hover)] text-sm text-left"
                    >
                      {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                      {isPinned ? "Unpin from profile" : "Pin to your profile"}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-4 py-3 text-danger hover:bg-danger/10 text-sm text-left"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[var(--color-hover)] text-sm text-left"
                    >
                      <Link2 size={16} /> {copied ? "Copied!" : "Copy link"}
                    </button>
                    <button
                      onClick={handleToggleMute}
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[var(--color-hover)] text-sm text-left"
                    >
                      {muted ? <Volume2 size={16} /> : <VolumeX size={16} />}
                      {muted ? `Unmute @${tweet.author.username}` : `Mute @${tweet.author.username}`}
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {showParentContext && tweet.replyingToUsername && (
          <div className="text-[var(--color-text-secondary)] text-sm mb-0.5">
            Replying to{" "}
            <Link
              href={`/profile/${tweet.replyingToUsername}`}
              onClick={stop}
              className="text-accent hover:underline"
            >
              @{tweet.replyingToUsername}
            </Link>
          </div>
        )}

        <p className="whitespace-pre-wrap break-words text-[15px] leading-normal">
          {linkifyContent(tweet.content)}
        </p>

        {tweet.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tweet.imageUrl}
            alt=""
            onClick={stop}
            className="mt-3 rounded-2xl border border-[var(--color-border)] max-h-96 w-full object-cover"
          />
        )}

        {tweet.quotedTweet && (
          <div onClick={stop}>
            <QuotedTweetCard tweet={tweet.quotedTweet} />
          </div>
        )}

        {tweet.poll && <PollDisplay tweetId={tweet.id} poll={tweet.poll} />}

        <TweetActionBar tweet={tweet} currentUserId={currentUserId} />
      </div>
    </motion.div>
  );
}
