"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Inbox } from "lucide-react";
import TweetCard from "./TweetCard";
import type { Tweet, Page } from "@/lib/types";

export default function InfiniteFeed({
  initialItems,
  initialCursor,
  currentUserId,
  loadMore,
  emptyMessage,
  excludeId,
}: {
  initialItems: Tweet[];
  initialCursor: string | null;
  currentUserId: string;
  loadMore: (cursor: string) => Promise<Page<Tweet>>;
  emptyMessage: string;
  excludeId?: string;
}) {
  const filterOut = (list: Tweet[]) => (excludeId ? list.filter((t) => t.id !== excludeId) : list);
  const [items, setItems] = useState(filterOut(initialItems));
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setItems(filterOut(initialItems));
    setCursor(initialCursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItems, initialCursor]);

  useEffect(() => {
    if (!cursor) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchMore();
      },
      { rootMargin: "900px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  async function fetchMore() {
    if (loadingRef.current || !cursor) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const page = await loadMore(cursor);
      setItems((prev) => [...prev, ...filterOut(page.items)]);
      setCursor(page.nextCursor);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-20 text-center text-[var(--color-text-secondary)] flex flex-col items-center gap-3">
        <Inbox size={40} className="opacity-40" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {items.map((t) => (
        <TweetCard key={t.id} tweet={t} currentUserId={currentUserId} />
      ))}
      {cursor && (
        <div ref={sentinelRef} className="py-8 flex justify-center">
          {loading && <Loader2 size={22} className="animate-spin text-accent" />}
        </div>
      )}
      {!cursor && items.length > 8 && (
        <div className="py-8 text-center text-[var(--color-text-secondary)] text-sm">
          You&apos;re all caught up ✦
        </div>
      )}
    </div>
  );
}
