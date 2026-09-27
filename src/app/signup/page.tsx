"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X as XIcon } from "lucide-react";
import { signupAction, checkUsernameAvailableAction } from "@/lib/actions";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";
import { XWatermark, QrPanel, AuthFooter } from "@/components/AuthVisual";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" />
    </svg>
  );
}

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signupAction, undefined);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean.length < 2) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const available = await checkUsernameAvailableAction(clean);
      setUsernameStatus(available ? "free" : "taken");
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  const passwordValid = isPasswordValid(password);

  const nameRef = useRef<HTMLInputElement>(null);

  function handleGoogleDemo() {
    // demo-only: Google sign-up isn't wired to a real OAuth flow here
    nameRef.current?.focus();
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <XWatermark />
      <QrPanel />

      <div className="flex-1 flex items-center px-6 sm:px-10 lg:px-20 py-16">
        <div className="w-full max-w-[380px]">
          <svg viewBox="0 0 24 24" className="w-9 h-9 fill-text mb-10 lg:hidden">
            <path d="M18.9 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.65h2.039L6.486 3.24H4.298Z" />
          </svg>

          <h1 className="text-5xl font-extrabold leading-tight mb-10">
            Join today.
          </h1>

          <button
            type="button"
            onClick={handleGoogleDemo}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold rounded-full py-2.5 hover:bg-white/90 active:scale-[0.98] transition-all"
          >
            <GoogleIcon /> Sign up with Google
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-[var(--color-text-secondary)] text-sm">or</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <form ref={formRef} action={formAction} className="flex flex-col gap-3">
            <input
              ref={nameRef}
              name="name"
              placeholder="Name"
              required
              className="w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-3.5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />

            <div className="relative">
              <input
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                className="w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-3.5 pr-10 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
              {usernameStatus === "free" && (
                <Check size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-retweet" />
              )}
              {usernameStatus === "taken" && (
                <XIcon size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-danger" />
              )}
              {usernameStatus === "taken" && (
                <p className="text-danger text-xs mt-1.5">That username is already taken.</p>
              )}
            </div>

            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-3.5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />

            <div>
              <input
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                placeholder="Password"
                required
                className="w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-3.5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
              {(passwordFocused || password.length > 0) && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 flex flex-col gap-1 overflow-hidden bg-bg-elevated border border-[var(--color-border)] rounded-lg px-3 py-2"
                >
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(password);
                    return (
                      <li
                        key={rule.id}
                        className={`flex items-center gap-2 text-xs ${
                          ok ? "text-retweet" : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {ok ? <Check size={14} /> : <XIcon size={14} />}
                        {rule.label}
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </div>

            {state?.error && (
              <p className="text-danger text-sm bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || !passwordValid || usernameStatus === "taken"}
              className="mt-1 w-full bg-white text-black font-bold rounded-full py-2.5 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {isPending ? "..." : "Sign up"}
            </button>
          </form>

          <p className="text-[var(--color-text-secondary)] text-xs mt-4">
            By signing up, you agree to our Terms of Service, Privacy Policy and Cookie Use.
          </p>

          <p className="mt-8 text-[var(--color-text-secondary)]">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}
