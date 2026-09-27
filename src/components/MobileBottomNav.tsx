"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Bell, Mail, Feather } from "lucide-react";
import { useCompose } from "./ComposeContext";
import Avatar from "./Avatar";
import type { User } from "@/lib/types";

export default function MobileBottomNav({
  user,
  unreadCount,
  unreadMessageCount,
}: {
  user: User;
  unreadCount: number;
  unreadMessageCount: number;
}) {
  const pathname = usePathname();
  const { openCompose } = useCompose();

  const links = [
    { href: "/", icon: Home },
    { href: "/explore", icon: Search },
    { href: "/notifications", icon: Bell, badge: unreadCount },
    { href: "/messages", icon: Mail, badge: unreadMessageCount },
  ];

  return (
    <>
      <button
        onClick={() => openCompose()}
        className="md:hidden fixed z-30 bg-accent hover:bg-[var(--color-accent-hover)] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg active:scale-95 transition-all"
        style={{ right: "16px", bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <Feather size={22} />
      </button>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg/95 backdrop-blur-md border-t border-[var(--color-border)] flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex-1 flex items-center justify-center py-3 relative"
            >
              <span className="relative">
                <Icon size={24} strokeWidth={active ? 2.5 : 2} className={active ? "text-text" : "text-[var(--color-text-secondary)]"} />
                {!!link.badge && (
                  <span className="absolute -top-1 -right-2 bg-accent text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
                    {link.badge > 9 ? "9+" : link.badge}
                  </span>
                )}
              </span>
            </Link>
          );
        })}

        <Link
          href={`/profile/${user.username}`}
          className="flex-1 flex items-center justify-center py-3"
        >
          <Avatar name={user.name} size={26} src={user.avatarUrl} />
        </Link>
      </nav>
    </>
  );
}
