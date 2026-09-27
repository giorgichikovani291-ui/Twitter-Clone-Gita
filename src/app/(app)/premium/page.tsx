import { requireUser } from "@/lib/auth";
import { BadgeCheck, Sparkles } from "lucide-react";
import PremiumTiers from "@/components/PremiumTiers";

export default async function PremiumPage() {
  const user = await requireUser();

  return (
    <div>
      <div className="sticky top-0 bg-bg/80 backdrop-blur-md z-10 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-bold px-4 py-3 flex items-center gap-2">
          <Sparkles size={20} className="text-accent" /> Premium
        </h1>
      </div>

      <div className="relative overflow-hidden px-6 py-10 text-center border-b border-[var(--color-border)]">
        <div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-25 blur-3xl"
          style={{ backgroundImage: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))" }}
        />
        <BadgeCheck size={44} className="relative mx-auto text-accent fill-accent/20" />
        <h2 className="relative text-2xl font-bold mt-3">Stand out, {user.name.split(" ")[0]}</h2>
        <p className="relative text-[var(--color-text-secondary)] mt-1 max-w-sm mx-auto">
          Become a Premium member and get verification, fewer ads, and more features.
        </p>
      </div>

      <PremiumTiers firstName={user.name.split(" ")[0]} />
    </div>
  );
}
