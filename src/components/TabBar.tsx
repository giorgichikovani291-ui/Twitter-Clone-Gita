"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function TabBar({
  tabs,
  activeKey,
  layoutId,
}: {
  tabs: { key: string; label: string; href: string }[];
  activeKey: string;
  layoutId: string;
}) {
  return (
    <div className="flex border-b border-[var(--color-border)]">
      {tabs.map((t) => {
        const active = t.key === activeKey;
        return (
          <Link
            key={t.key}
            href={t.href}
            className="flex-1 text-center py-4 hover:bg-[var(--color-hover)] relative font-bold transition-colors"
            style={{ color: active ? "var(--color-text)" : "var(--color-text-secondary)" }}
          >
            {t.label}
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-accent rounded-full"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
