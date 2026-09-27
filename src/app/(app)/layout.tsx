import { requireUser } from "@/lib/auth";
import { getUnreadNotificationCount, getUnreadMessageCount } from "@/lib/queries";
import AppShell from "@/components/AppShell";
import RightSidebar from "@/components/RightSidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const [unreadCount, unreadMessageCount] = await Promise.all([
    getUnreadNotificationCount(user.id),
    getUnreadMessageCount(user.id),
  ]);

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      unreadMessageCount={unreadMessageCount}
      rightSidebar={<RightSidebar currentUser={user} />}
    >
      {children}
    </AppShell>
  );
}
