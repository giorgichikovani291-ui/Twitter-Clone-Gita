import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUserByUsername, getMessages, markMessagesRead } from "@/lib/queries";
import Avatar from "@/components/Avatar";
import MessageThread from "@/components/MessageThread";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const currentUser = await requireUser();
  const otherUser = await getUserByUsername(username);
  if (!otherUser || otherUser.id === currentUser.id) notFound();

  const messages = await getMessages(currentUser.id, otherUser.id);
  await markMessagesRead(currentUser.id, otherUser.id);

  return (
    <div>
      <div className="sticky top-0 bg-bg/80 backdrop-blur-md z-10 flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)]">
        <Link href="/messages" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--color-hover)]">
          <ArrowLeft size={18} />
        </Link>
        <Avatar name={otherUser.name} size={36} src={otherUser.avatarUrl} />
        <div>
          <p className="font-bold text-sm leading-tight">{otherUser.name}</p>
          <p className="text-[var(--color-text-secondary)] text-xs">@{otherUser.username}</p>
        </div>
      </div>

      <MessageThread currentUser={currentUser} otherUser={otherUser} initialMessages={messages} />
    </div>
  );
}
