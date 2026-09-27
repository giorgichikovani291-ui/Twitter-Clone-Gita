import Link from "next/link";
import { Heart, Repeat2, MessageCircle, UserPlus, AtSign, Quote, Bell } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getNotifications, markNotificationsRead } from "@/lib/queries";
import Avatar from "@/components/Avatar";

const ICONS = {
  like: { Icon: Heart, className: "text-like" },
  retweet: { Icon: Repeat2, className: "text-retweet" },
  reply: { Icon: MessageCircle, className: "text-accent" },
  follow: { Icon: UserPlus, className: "text-accent" },
  mention: { Icon: AtSign, className: "text-accent" },
  quote: { Icon: Quote, className: "text-accent" },
};

const LABELS = {
  like: "liked your post",
  retweet: "reposted your post",
  reply: "replied to your post",
  follow: "followed you",
  mention: "mentioned you in a post",
  quote: "quoted your post",
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await getNotifications(user.id);
  await markNotificationsRead(user.id);

  return (
    <div>
      <div className="sticky top-0 bg-bg/80 backdrop-blur-md z-10 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-bold px-4 py-3">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="px-4 py-20 text-center text-[var(--color-text-secondary)] flex flex-col items-center gap-3">
          <Bell size={40} className="opacity-40" />
          <p>Nothing here yet. Activity on your posts will show up here.</p>
        </div>
      ) : (
        notifications.map((n) => {
          const { Icon, className } = ICONS[n.type];
          return (
            <Link
              key={n.id}
              href={n.tweet ? `/tweet/${n.tweet.id}` : `/profile/${n.actor.username}`}
              className={`flex gap-3 px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-hover)]/50 ${
                !n.isRead ? "bg-accent/5" : ""
              }`}
            >
              <Icon size={22} className={className} />
              <div className="flex-1 min-w-0">
                <Avatar name={n.actor.name} size={32} src={n.actor.avatarUrl} />
                <p className="mt-2 text-sm">
                  <span className="font-bold">{n.actor.name}</span>{" "}
                  <span className="text-[var(--color-text-secondary)]">{LABELS[n.type]}</span>
                </p>
                {n.tweet && (
                  <p className="text-[var(--color-text-secondary)] text-sm mt-1 truncate">
                    {n.tweet.content}
                  </p>
                )}
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
