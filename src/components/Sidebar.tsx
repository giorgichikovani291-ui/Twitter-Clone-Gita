"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Bell,
  Bookmark,
  User,
  Mail,
  Feather,
  Moon,
  Sun,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import Avatar from "./Avatar";
import { useTheme } from "./ThemeProvider";
import { useCompose } from "./ComposeContext";
import { logoutAction } from "@/lib/actions";
import type { User as UserType } from "@/lib/types";

export default function Sidebar({
  user,
  unreadCount,
  unreadMessageCount,
}: {
  user: UserType;
  unreadCount: number;
  unreadMessageCount: number;
}) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { openCompose } = useCompose();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Search },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { href: "/messages", label: "Messages", icon: Mail, badge: unreadMessageCount },
    { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { href: `/profile/${user.username}`, label: "Profile", icon: User },
  ];

  return (
    <div className="hidden md:flex h-screen sticky top-0 flex-col justify-between py-2 px-2 xl:px-4 w-[68px] xl:w-[275px] shrink-0">
      <div className="flex flex-col gap-1">
        <Link
          href="/"
          className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[var(--color-hover)] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-text">
            <path d="M18.9 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.65h2.039L6.486 3.24H4.298Z" />
          </svg>
        </Link>

        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-4 px-3 py-3 rounded-full hover:bg-[var(--color-hover)] transition-colors w-fit xl:w-auto relative"
            >
              <span className="relative">
                <Icon size={26} strokeWidth={active ? 2.5 : 2} />
                {!!link.badge && (
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
                    {link.badge > 9 ? "9+" : link.badge}
                  </span>
                )}
              </span>
              <span
                className="hidden xl:inline text-xl"
                style={{ fontWeight: active ? 700 : 400 }}
              >
                {link.label}
              </span>
            </Link>
          );
        })}

        <button
          onClick={toggleTheme}
          className="flex items-center gap-4 px-3 py-3 rounded-full hover:bg-[var(--color-hover)] transition-colors w-fit xl:w-auto"
        >
          {theme === "dark" ? <Sun size={26} /> : <Moon size={26} />}
          <span className="hidden xl:inline text-xl">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>

        <button
          onClick={() => openCompose()}
          className="mt-3 bg-accent hover:bg-[var(--color-accent-hover)] hover:shadow-[0_0_24px_-4px_var(--color-accent)] text-white rounded-full w-12 h-12 xl:w-full xl:h-auto xl:py-3 flex items-center justify-center active:scale-95 transition-all"
        >
          <Feather size={22} className="xl:hidden" />
          <span className="hidden xl:inline text-lg font-bold">Post</span>
        </button>
      </div>

      <div className="relative">
        {menuOpen && (
          <div className="absolute bottom-full mb-2 left-0 w-56 bg-bg-elevated border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden py-1 z-20">
            <button
              onClick={() => logoutAction()}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-hover)] text-left"
            >
              <LogOut size={18} />
              <span>Log out @{user.username}</span>
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-3 px-2 py-2 rounded-full hover:bg-[var(--color-hover)] w-full transition-colors"
        >
          <Avatar name={user.name} size={40} src={user.avatarUrl} />
          <div className="hidden xl:flex flex-col items-start overflow-hidden">
            <span className="font-bold text-sm truncate max-w-[140px]">{user.name}</span>
            <span className="text-[var(--color-text-secondary)] text-sm truncate max-w-[140px]">
              @{user.username}
            </span>
          </div>
          <MoreHorizontal size={18} className="hidden xl:block ml-auto" />
        </button>
      </div>
    </div>
  );
}
