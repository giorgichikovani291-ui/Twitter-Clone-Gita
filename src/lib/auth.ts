import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import db from "./db";
import type { User } from "./types";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-only-secret-change-me-please"
);
const COOKIE_NAME = "session";

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);

  // Only mark the cookie Secure when the request actually arrives over HTTPS.
  // Hardcoding it in production breaks http://localhost: the browser silently
  // drops the cookie and the app bounces between / and /login forever.
  const h = await headers();
  const isHttps =
    h.get("x-forwarded-proto") === "https" || (h.get("origin") || "").startsWith("https://");

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload.userId as string) || null;
  } catch {
    return null;
  }
}

export function toPublicUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    bio: row.bio,
    location: row.location,
    avatarUrl: row.avatar_url,
    headerUrl: row.header_url,
    verified: !!row.verified,
    pinnedTweetId: row.pinned_tweet_id,
    createdAt: row.created_at,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!row) return null;
  return toPublicUser(row);
}

// Layouts and pages render in parallel, so a redirect in the layout does NOT
// stop a page from running. Every protected page must guard for itself.
//
// If the cookie's JWT is validly signed but points at a user that no longer
// exists (e.g. data/app.db was deleted/reseeded while the browser still held
// an old cookie), proxy.ts has no way to know that — it only checks the JWT
// signature, never the database, because it runs on the Edge runtime where
// better-sqlite3 can't load. Left alone it would keep treating that cookie
// as "authenticated" forever and bounce the browser between / and /login in
// an infinite redirect loop. Routing through /api/auth/clear-session (a real
// Route Handler, which — unlike a Server Component — is allowed to modify
// cookies) clears it before landing on /login, breaking the loop.
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/clear-session");
  return user;
}
