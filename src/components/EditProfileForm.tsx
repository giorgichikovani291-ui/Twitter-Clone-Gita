"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, LogOut } from "lucide-react";
import { updateProfileAction, logoutAction } from "@/lib/actions";
import Avatar from "./Avatar";
import type { User } from "@/lib/types";

async function uploadFile(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url as string;
}

export function EditProfileForm({ user }: { user: User }) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, undefined);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [headerUrl, setHeaderUrl] = useState(user.headerUrl);
  const [uploading, setUploading] = useState<"avatar" | "header" | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("avatar");
    const url = await uploadFile(file);
    if (url) setAvatarUrl(url);
    setUploading(null);
  }

  async function handleHeaderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("header");
    const url = await uploadFile(file);
    if (url) setHeaderUrl(url);
    setUploading(null);
  }

  return (
    <div>
      <div className="sticky top-0 bg-bg/80 backdrop-blur-md z-10 flex items-center gap-6 px-4 py-2 border-b border-[var(--color-border)]">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--color-hover)]"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-lg">Edit profile</h1>
      </div>

      <div
        className="h-32 sm:h-48 bg-bg-elevated bg-cover bg-center relative cursor-pointer group"
        style={headerUrl ? { backgroundImage: `url(${headerUrl})` } : undefined}
        onClick={() => headerInputRef.current?.click()}
      >
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Camera size={24} className="text-white" />
        </div>
        <input ref={headerInputRef} type="file" accept="image/*" onChange={handleHeaderChange} className="hidden" />
      </div>

      <div className="px-4 -mt-10">
        <div
          className="relative w-fit rounded-full border-4 border-bg cursor-pointer group"
          onClick={() => avatarInputRef.current?.click()}
        >
          <Avatar name={user.name} size={80} src={avatarUrl} />
          <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera size={20} className="text-white" />
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>
        {uploading && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Uploading {uploading === "avatar" ? "avatar" : "header"}...</p>
        )}
      </div>

      <form action={formAction} className="flex flex-col gap-5 p-4">
        <input type="hidden" name="avatarUrl" value={avatarUrl} />
        <input type="hidden" name="headerUrl" value={headerUrl} />

        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-secondary)]">Name</span>
          <input
            name="name"
            defaultValue={user.name}
            className="w-full bg-transparent border border-[var(--color-border)] rounded-md px-3 py-2 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-secondary)]">Bio</span>
          <textarea
            name="bio"
            defaultValue={user.bio}
            rows={3}
            maxLength={160}
            className="w-full bg-transparent border border-[var(--color-border)] rounded-md px-3 py-2 outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-secondary)]">Location</span>
          <input
            name="location"
            defaultValue={user.location}
            className="w-full bg-transparent border border-[var(--color-border)] rounded-md px-3 py-2 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>

        {state?.error && <p className="text-danger text-sm">{state.error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="self-end bg-text text-bg font-bold rounded-full px-5 py-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? "..." : "Save"}
        </button>
      </form>

      <div className="md:hidden px-4 pb-8">
        <button
          onClick={() => logoutAction()}
          className="w-full flex items-center justify-center gap-2 border border-[var(--color-border)] rounded-full py-2.5 text-danger font-bold text-sm hover:bg-danger/10 transition-colors"
        >
          <LogOut size={16} /> Log out @{user.username}
        </button>
      </div>
    </div>
  );
}
