"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import TweetComposer from "./TweetComposer";
import QuotedTweetCard from "./QuotedTweetCard";
import type { User, Tweet } from "@/lib/types";

export default function ComposeModal({
  user,
  open,
  onClose,
  quoteTweet,
}: {
  user: User;
  open: boolean;
  onClose: () => void;
  quoteTweet?: Tweet | null;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-8 sm:pt-16"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="bg-bg rounded-2xl w-full max-w-[600px] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-2 py-2">
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--color-hover)]"
              >
                <X size={20} />
              </button>
            </div>
            <TweetComposer
              user={user}
              buttonLabel={quoteTweet ? "Quote" : "Post"}
              autoFocus
              onDone={onClose}
              quoteTweet={quoteTweet}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
