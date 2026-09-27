"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/actions";
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

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  function handleGoogleDemo() {
    if (idRef.current) idRef.current.value = "chiko";
    if (pwRef.current) pwRef.current.value = "Password123";
    formRef.current?.requestSubmit();
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
            Happening now.
          </h1>

          <button
            type="button"
            onClick={handleGoogleDemo}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold rounded-full py-2.5 hover:bg-white/90 active:scale-[0.98] transition-all"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-[var(--color-text-secondary)] text-sm">or</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <form ref={formRef} action={formAction} className="flex flex-col gap-3">
            <input
              ref={idRef}
              name="identifier"
              placeholder="Email or username"
              required
              className="w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-3.5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
            <input
              ref={pwRef}
              name="password"
              type="password"
              placeholder="Password"
              required
              className="w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-3.5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />

            {state?.error && (
              <p className="text-danger text-sm bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-1 w-full bg-white text-black font-bold rounded-full py-2.5 hover:bg-white/90 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {isPending ? "..." : "Continue"}
            </button>
          </form>

          <p className="text-[var(--color-text-secondary)] text-xs mt-4">
            By continuing, you agree to our Terms of Service, Privacy Policy and Cookie Use.
          </p>

          <p className="mt-8 text-[var(--color-text-secondary)]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-accent hover:underline font-medium">
              Sign up
            </Link>
          </p>

          <p className="mt-6 text-xs text-[var(--color-text-secondary)] bg-bg-elevated border border-[var(--color-border)] rounded-lg px-3 py-2 inline-block">
            Try the demo: <b className="text-text">chiko</b> / <b className="text-text">Password123</b>
          </p>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}
