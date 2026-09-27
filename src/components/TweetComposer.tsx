"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, X, BarChart2, Plus } from "lucide-react";
import { createTweetAction } from "@/lib/actions";
import Avatar from "./Avatar";
import QuotedTweetCard from "./QuotedTweetCard";
import CharCountRing from "./CharCountRing";
import type { User, Tweet } from "@/lib/types";

const MAX_LEN = 280;
const MAX_POLL_OPTIONS = 4;

export default function TweetComposer({
  user,
  parentId = null,
  quoteTweet = null,
  placeholder = "What's happening?",
  buttonLabel = "Post",
  autoFocus = false,
  onDone,
}: {
  user: User;
  parentId?: string | null;
  quoteTweet?: Tweet | null;
  placeholder?: string;
  buttonLabel?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [pollOptions, setPollOptions] = useState<string[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const remaining = MAX_LEN - content.length;
  const pollReady = pollOptions === null || pollOptions.filter((o) => o.trim()).length >= 2;
  const canSubmit =
    content.trim().length > 0 && remaining >= 0 && pollReady && !isPending && !uploading;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setImageUrl(data.url);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function togglePoll() {
    setPollOptions((v) => (v ? null : ["", ""]));
    setImageUrl("");
  }

  function updatePollOption(i: number, value: string) {
    setPollOptions((v) => v!.map((o, idx) => (idx === i ? value : o)));
  }

  function addPollOption() {
    setPollOptions((v) => (v && v.length < MAX_POLL_OPTIONS ? [...v, ""] : v));
  }

  function removePollOption(i: number) {
    setPollOptions((v) => (v && v.length > 2 ? v.filter((_, idx) => idx !== i) : v));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const text = content;
    const img = imageUrl;
    const poll = pollOptions ? pollOptions.map((o) => o.trim()).filter(Boolean) : null;
    setContent("");
    setImageUrl("");
    setPollOptions(null);
    startTransition(async () => {
      await createTweetAction(text, parentId, img, quoteTweet?.id || null, poll && poll.length >= 2 ? poll : null);
      router.refresh();
      onDone?.();
    });
  }

  const canAttach = !quoteTweet;

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-[var(--color-border)]">
      <Avatar name={user.name} size={44} src={user.avatarUrl} />
      <div className="flex-1 flex flex-col min-w-0">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={parentId || quoteTweet ? 2 : 3}
          className="w-full bg-transparent outline-none resize-none text-xl placeholder:text-[var(--color-text-secondary)] py-2"
        />

        {imageUrl && (
          <div className="relative w-fit mt-1 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="max-h-64 rounded-2xl border border-[var(--color-border)]" />
            <button
              onClick={() => setImageUrl("")}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {pollOptions && (
          <div className="border border-[var(--color-border)] rounded-2xl p-3 mt-1 mb-2 flex flex-col gap-2">
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={opt}
                  onChange={(e) => updatePollOption(i, e.target.value)}
                  placeholder={`Choice ${i + 1}`}
                  maxLength={40}
                  className="flex-1 bg-transparent border border-[var(--color-border)] rounded-full px-3 py-2 text-sm outline-none focus:border-accent"
                />
                {pollOptions.length > 2 && (
                  <button
                    onClick={() => removePollOption(i)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between">
              {pollOptions.length < MAX_POLL_OPTIONS ? (
                <button
                  onClick={addPollOption}
                  className="flex items-center gap-1 text-accent text-sm font-bold hover:underline"
                >
                  <Plus size={14} /> Add a choice
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={togglePoll}
                className="text-danger text-sm hover:underline"
              >
                Remove poll
              </button>
            </div>
          </div>
        )}

        {quoteTweet && <QuotedTweetCard tweet={quoteTweet} />}

        <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !canAttach || !!pollOptions}
              className="w-9 h-9 rounded-full flex items-center justify-center text-accent hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ImageIcon size={20} />
            </button>
            <button
              onClick={togglePoll}
              disabled={!canAttach || !!imageUrl}
              className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed ${
                pollOptions ? "text-accent bg-accent/10" : "text-accent"
              }`}
            >
              <BarChart2 size={20} />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex items-center gap-3">
            {uploading && <span className="text-xs text-[var(--color-text-secondary)]">Uploading...</span>}
            <CharCountRing current={content.length} max={MAX_LEN} />
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-accent hover:bg-[var(--color-accent-hover)] hover:shadow-[0_0_20px_-4px_var(--color-accent)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold px-5 py-1.5 rounded-full active:scale-95 transition-all"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
