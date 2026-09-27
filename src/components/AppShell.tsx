"use client";

import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";
import { ComposeProvider } from "./ComposeContext";
import type { User } from "@/lib/types";

export default function AppShell({
  user,
  unreadCount,
  unreadMessageCount,
  children,
  rightSidebar,
}: {
  user: User;
  unreadCount: number;
  unreadMessageCount: number;
  children: React.ReactNode;
  rightSidebar: React.ReactNode;
}) {
  return (
    <ComposeProvider user={user}>
      <div className="flex justify-center max-w-[1300px] mx-auto">
        <Sidebar user={user} unreadCount={unreadCount} unreadMessageCount={unreadMessageCount} />
        <main className="w-full max-w-[600px] min-h-screen border-x border-[var(--color-border)] pb-16 md:pb-0">
          {children}
        </main>
        {rightSidebar}
      </div>
      <MobileBottomNav user={user} unreadCount={unreadCount} unreadMessageCount={unreadMessageCount} />
    </ComposeProvider>
  );
}
