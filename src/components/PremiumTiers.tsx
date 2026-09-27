"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Check, X, CreditCard, Lock, BadgeCheck } from "lucide-react";

type Tier = {
  name: string;
  price: string;
  priceValue: string;
  highlight?: boolean;
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: "Basic",
    price: "Free",
    priceValue: "$0",
    features: ["Standard post length", "Basic analytics", "Ads shown"],
  },
  {
    name: "Premium",
    price: "$8 / month",
    priceValue: "$8",
    highlight: true,
    features: [
      "Verified checkmark badge",
      "50% fewer ads",
      "Priority ranking in replies",
      "Longer posts and video uploads",
      "Edit posts after publishing",
    ],
  },
  {
    name: "Premium+",
    price: "$16 / month",
    priceValue: "$16",
    features: [
      "Everything in Premium",
      "Ad-free feed",
      "Even higher priority in replies",
      "Exclusive profile customization",
    ],
  },
];

function formatCardNumber(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function PremiumTiers({ firstName }: { firstName: string }) {
  const [activeTier, setActiveTier] = useState<Tier | null>(null);
  const [step, setStep] = useState<"form" | "processing" | "done">("form");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [subscribedTier, setSubscribedTier] = useState<string | null>(null);

  const formValid =
    cardName.trim().length > 1 &&
    cardNumber.replace(/\s/g, "").length === 16 &&
    /^\d{2}\/\d{2}$/.test(expiry) &&
    cvc.length >= 3;

  function openCheckout(tier: Tier) {
    setActiveTier(tier);
    setStep("form");
    setCardName("");
    setCardNumber("");
    setExpiry("");
    setCvc("");
  }

  function closeCheckout() {
    setActiveTier(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || !activeTier) return;
    setStep("processing");
    setTimeout(() => {
      setSubscribedTier(activeTier.name);
      setStep("done");
    }, 1400);
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-4">
        {TIERS.map((tier) => {
          const isCurrent = tier.name === "Basic" && !subscribedTier;
          const isSubscribed = subscribedTier === tier.name;
          return (
            <div
              key={tier.name}
              className={`rounded-2xl border p-5 transition-colors ${
                tier.highlight
                  ? "border-accent bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
                  : "border-[var(--color-border)] bg-bg-elevated"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-bold flex items-center gap-1.5">
                  {tier.name}
                  {tier.highlight && <Sparkles size={16} className="text-accent" />}
                  {isSubscribed && <BadgeCheck size={16} className="text-accent fill-accent/20" />}
                </h3>
                <span className="font-bold text-accent">{tier.price}</span>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-retweet shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent || isSubscribed}
                onClick={() => tier.name !== "Basic" && openCheckout(tier)}
                className={`mt-4 w-full rounded-full py-2.5 font-bold text-sm transition-all active:scale-[0.98] ${
                  isCurrent || isSubscribed
                    ? "bg-[var(--color-hover)] text-[var(--color-text-secondary)] cursor-default"
                    : "accent-gradient text-white"
                }`}
              >
                {isSubscribed ? "Subscribed ✓" : isCurrent ? "Your current plan" : "Subscribe"}
              </button>
            </div>
          );
        })}
        <p className="text-xs text-[var(--color-text-secondary)] text-center px-4">
          This is a demo page — payment is simulated and you won&apos;t actually be charged.
        </p>
      </div>

      <AnimatePresence>
        {activeTier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={closeCheckout}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-bg border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xl"
            >
              <button
                onClick={closeCheckout}
                className="absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-hover)] z-10"
              >
                <X size={16} />
              </button>

              {step !== "done" && (
                <div className="px-6 pt-6 pb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-accent" />
                    <h3 className="font-bold text-lg">
                      Subscribe: {activeTier.name}
                    </h3>
                  </div>
                  <p className="text-[var(--color-text-secondary)] text-sm mt-1">
                    {activeTier.priceValue} / month, billed automatically each month.
                  </p>
                </div>
              )}

              {step === "form" && (
                <form onSubmit={handleSubmit} className="px-6 pb-6 flex flex-col gap-3">
                  <input
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Cardholder name"
                    required
                    className="w-full bg-bg-elevated border border-[var(--color-border)] rounded-lg px-3.5 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <div className="relative">
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      inputMode="numeric"
                      required
                      className="w-full bg-bg-elevated border border-[var(--color-border)] rounded-lg px-3.5 py-3 pr-9 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                    <CreditCard size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                  </div>
                  <div className="flex gap-3">
                    <input
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      required
                      className="w-1/2 bg-bg-elevated border border-[var(--color-border)] rounded-lg px-3.5 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                    <input
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="CVC"
                      inputMode="numeric"
                      required
                      className="w-1/2 bg-bg-elevated border border-[var(--color-border)] rounded-lg px-3.5 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!formValid}
                    className="mt-2 w-full accent-gradient text-white font-bold rounded-full py-3 disabled:opacity-40 active:scale-[0.98] transition-all"
                  >
                    Pay {activeTier.priceValue}
                  </button>
                  <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                    <Lock size={12} /> Secure payment (demo mode)
                  </p>
                </form>
              )}

              {step === "processing" && (
                <div className="px-6 pb-10 pt-4 flex flex-col items-center gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent"
                  />
                  <p className="text-sm text-[var(--color-text-secondary)]">Processing payment...</p>
                </div>
              )}

              {step === "done" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-6 pb-8 pt-10 flex flex-col items-center text-center gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-retweet/15 flex items-center justify-center">
                    <Check size={28} className="text-retweet" />
                  </div>
                  <h3 className="text-lg font-bold">
                    Congrats, {firstName}! 🎉
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    You&apos;re now a {activeTier.name} member. Changes take effect immediately.
                  </p>
                  <button
                    onClick={closeCheckout}
                    className="mt-2 w-full accent-gradient text-white font-bold rounded-full py-3 active:scale-[0.98] transition-all"
                  >
                    Close
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
