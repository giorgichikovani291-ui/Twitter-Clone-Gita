export const revalidate = 0;
import Link from "next/link";
import { Mail } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getConversations } from "@/lib/queries";
import Avatar from "@/components/Avatar";

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.max(1, Math.floor(diff))}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default async function MessagesPage() {
  const user = await requireUser();
  const conversations = await getConversations(user.id);

  return (
    <div>
      <div className="sticky top-0 bg-bg/80 backdrop-blur-md z-10 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-bold px-4 py-3">Messages</h1>
      </div>

      {conversations.length === 0 ? (
        <div className="px-4 py-16 text-center text-[var(--color-text-secondary)] flex flex-col items-center gap-3">
          <Mail size={40} />
          <p>No messages yet.</p>
          <p className="text-sm">Open someone&apos;s profile and tap the message button.</p>
        </div>
      ) : (
        conversations.map((c) => (
          <Link
            key={c.otherUser.id}
            href={`/messages/${c.otherUser.username}`}
            className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-hover)]/50 ${
              c.unreadCount > 0 ? "bg-accent/5" : ""
            }`}
          >
            <Avatar name={c.otherUser.name} size={48} src={c.otherUser.avatarUrl} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{c.otherUser.name}</span>
                <span className="text-[var(--color-text-secondary)] text-xs">
                  {timeAgo(c.lastMessage.createdAt)}
                </span>
              </div>
              <p className="text-[var(--color-text-secondary)] text-sm truncate">
                {c.lastMessage.sender.id === user.id ? "You: " : ""}
                {c.lastMessage.content}
              </p>
            </div>
            {c.unreadCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" />}
          </Link>
        ))
      )}
    </div>
  );
}
