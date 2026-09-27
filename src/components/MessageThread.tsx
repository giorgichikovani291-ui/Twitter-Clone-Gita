"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { sendMessageAction } from "@/lib/actions";
import type { Message, User } from "@/lib/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageThread({
  currentUser,
  otherUser,
  initialMessages,
}: {
  currentUser: User;
  otherUser: User;
  initialMessages: Message[];
}) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [initialMessages.length]);

  function handleSend() {
    if (!content.trim() || isPending) return;
    const text = content;
    setContent("");
    startTransition(async () => {
      await sendMessageAction(otherUser.id, text);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {initialMessages.length === 0 && (
          <p className="text-center text-[var(--color-text-secondary)] text-sm mt-8">
            Send the first message to @{otherUser.username}.
          </p>
        )}
        {initialMessages.map((m) => {
          const mine = m.sender.id === currentUser.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                  mine ? "bg-accent text-white rounded-br-sm" : "bg-bg-elevated rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p
                  className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-[var(--color-text-secondary)]"}`}
                >
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--color-border)]">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Start a message..."
          className="flex-1 bg-bg-elevated rounded-full px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-[var(--color-text-secondary)]"
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || isPending}
          className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-40 hover:bg-[var(--color-accent-hover)] transition-colors shrink-0"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
