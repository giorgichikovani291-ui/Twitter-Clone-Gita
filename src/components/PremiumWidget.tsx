import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function PremiumWidget() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-bg-elevated p-4">
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 blur-2xl"
        style={{ backgroundImage: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))" }}
      />
      <div className="relative flex items-center gap-2">
        <Sparkles size={20} className="text-accent" />
        <h2 className="text-xl font-bold">Subscribe to Premium</h2>
      </div>
      <p className="relative mt-1 text-sm text-[var(--color-text-secondary)]">
        Get a verified badge, fewer ads, and priority replies.
      </p>
      <Link
        href="/premium"
        className="relative mt-3 inline-block accent-gradient text-white font-bold text-sm rounded-full px-4 py-2.5 transition-all active:scale-[0.97]"
      >
        Subscribe
      </Link>
    </div>
  );
}
