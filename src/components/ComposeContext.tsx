"use client";

import { createContext, useContext, useState } from "react";
import ComposeModal from "./ComposeModal";
import type { User, Tweet } from "@/lib/types";

type ComposeContextValue = {
  openCompose: (quoteTweet?: Tweet) => void;
};

const ComposeContext = createContext<ComposeContextValue>({ openCompose: () => {} });

export function ComposeProvider({ user, children }: { user: User; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [quoteTweet, setQuoteTweet] = useState<Tweet | null>(null);

  function openCompose(tweet?: Tweet) {
    setQuoteTweet(tweet || null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuoteTweet(null);
  }

  return (
    <ComposeContext.Provider value={{ openCompose }}>
      {children}
      <ComposeModal user={user} open={open} onClose={close} quoteTweet={quoteTweet} />
    </ComposeContext.Provider>
  );
}

export function useCompose() {
  return useContext(ComposeContext);
}
