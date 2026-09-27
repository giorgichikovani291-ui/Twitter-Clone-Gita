"use client";

import Link from "next/link";
import { useState, useTransition, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Repeat2, Heart, Bookmark, Share, Quote } from "lucide-react";
import {
  toggleLikeAction,
  toggleRetweetAction,
  toggleBookmarkAction,
} from "@/lib/actions";
import { useCompose } from "./ComposeContext";
import { formatCount } from "@/lib/format";
import type { Tweet } from "@/lib/types";

export default function TweetActionBar({
  tweet,
  currentUserId,
  large = false,
}: {
  tweet: Tweet;
  currentUserId: string;
  large?: boolean;
}) {
  const [liked, setLiked] = useState(tweet.likedByMe);
  const [likeCount, setLikeCount] = useState(tweet.likeCount);
  const [retweeted, setRetweeted] = useState(tweet.retweetedByMe);
  const [retweetCount, setRetweetCount] = useState(tweet.retweetCount);
  const [bookmarked, setBookmarked] = useState(tweet.bookmarkedByMe);
  const [retweetMenuOpen, setRetweetMenuOpen] = useState(false);
  const [, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const { openCompose } = useCompose();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setRetweetMenuOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleLike(e: React.MouseEvent) {
    stop(e);
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    startTransition(async () => {
      await toggleLikeAction(tweet.id);
    });
  }

  function handleRepost(e: React.MouseEvent) {
    stop(e);
    setRetweetMenuOpen(false);
    setRetweeted((v) => !v);
    setRetweetCount((c) => (retweeted ? c - 1 : c + 1));
    startTransition(async () => {
      await toggleRetweetAction(tweet.id);
    });
  }

  function handleQuote(e: React.MouseEvent) {
    stop(e);
    setRetweetMenuOpen(false);
    openCompose(tweet);
  }

  function handleBookmark(e: React.MouseEvent) {
    stop(e);
    setBookmarked((v) => !v);
    startTransition(async () => {
      await toggleBookmarkAction(tweet.id);
    });
  }

  function handleShare(e: React.MouseEvent) {
    stop(e);
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(`${window.location.origin}/tweet/${tweet.id}`);
    }
  }

  const iconSize = large ? 22 : 18;
  const width = large ? "max-w-full" : "max-w-[420px]";

  return (
    <div className={`flex items-center justify-between ${width} mt-3 -ml-2`}>
      <Link
        href={`/tweet/${tweet.id}`}
        onClick={stop}
        className="group flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-accent"
      >
        <span className="p-2 rounded-full group-hover:bg-accent/10">
          <MessageCircle size={iconSize} />
        </span>
        <span className="text-sm">{tweet.replyCount ? formatCount(tweet.replyCount) : ""}</span>
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            stop(e);
            setRetweetMenuOpen((v) => !v);
          }}
          className={`group flex items-center gap-1 ${
            retweeted ? "text-retweet" : "text-[var(--color-text-secondary)]"
          } hover:text-retweet`}
        >
          <span className="p-2 rounded-full group-hover:bg-retweet/10">
            <Repeat2 size={iconSize} />
          </span>
          <span className="text-sm">{retweetCount ? formatCount(retweetCount) : ""}</span>
        </button>

        {retweetMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 bottom-full mb-1 w-48 bg-bg-elevated border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden z-20"
          >
            <button
              onClick={handleRepost}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-hover)] text-sm text-left"
            >
              <Repeat2 size={16} /> {retweeted ? "Undo repost" : "Repost"}
            </button>
            <button
              onClick={handleQuote}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-hover)] text-sm text-left"
            >
              <Quote size={16} /> Quote
            </button>
          </motion.div>
        )}
      </div>

      <button
        onClick={handleLike}
        className={`group flex items-center gap-1 ${
          liked ? "text-like" : "text-[var(--color-text-secondary)]"
        } hover:text-like`}
      >
        <motion.span
          whileTap={{ scale: 1.4 }}
          className="p-2 rounded-full group-hover:bg-like/10 inline-block"
        >
          <Heart size={iconSize} fill={liked ? "currentColor" : "none"} />
        </motion.span>
        <span className="text-sm">{likeCount ? formatCount(likeCount) : ""}</span>
      </button>

      <button
        onClick={handleBookmark}
        className={`group flex items-center gap-1 ${
          bookmarked ? "text-accent" : "text-[var(--color-text-secondary)]"
        } hover:text-accent`}
      >
        <span className="p-2 rounded-full group-hover:bg-accent/10">
          <Bookmark size={iconSize} fill={bookmarked ? "currentColor" : "none"} />
        </span>
      </button>

      <button
        onClick={handleShare}
        className="group flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-accent"
      >
        <span className="p-2 rounded-full group-hover:bg-accent/10">
          <Share size={iconSize} />
        </span>
      </button>
    </div>
  );
}
