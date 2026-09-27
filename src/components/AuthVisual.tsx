"use client";

import { useEffect, useState } from "react";

export function XWatermark() {
  return (
    <div
      aria-hidden
      className="hidden lg:block pointer-events-none absolute right-[-8%] top-1/2 -translate-y-1/2 w-[720px] h-[720px] opacity-[0.14]"
    >
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path
          d="M18.9 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.65h2.039L6.486 3.24H4.298Z"
          fill="none"
          stroke="var(--color-text-secondary)"
          strokeWidth="0.3"
        />
      </svg>
    </div>
  );
}

export function AuthFooter() {
  const links = [
    "About",
    "Help",
    "Terms",
    "Privacy",
    "Cookies",
    "Careers",
    "Developers",
    "Accessibility",
  ];
  return (
    <div className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-1 px-10 py-4 text-xs text-[var(--color-text-secondary)]">
      {links.map((l) => (
        <span key={l} className="hover:underline cursor-default">
          {l}
        </span>
      ))}
      <span>© 2026 Twitter Clone</span>
    </div>
  );
}
export function QrPanel() {
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const qrSrc = origin
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(origin)}`
    : null;

  return (
    <div className="hidden lg:flex absolute bottom-10 right-10 bg-bg-elevated border border-[var(--color-border)] rounded-2xl p-4 items-center gap-3 shadow-2xl z-10">
      <div className="w-[88px] h-[88px] rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
        {qrSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrSrc} alt="QR code" className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full animate-pulse bg-gray-200" />
        )}
      </div>
      <p className="text-sm font-bold max-w-[92px] leading-tight">Scan to open the app</p>
    </div>
  );
}
