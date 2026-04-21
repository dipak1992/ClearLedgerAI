"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export function AuthActions({ emailEnabled }: { emailEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email) {
      return;
    }

    setLoading(true);
    await signIn("email", {
      email,
      callbackUrl: "/dashboard"
    });
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <button
        className="flex h-12 w-full items-center justify-center rounded-full bg-[var(--brand-600)] font-medium text-slate-950 transition hover:bg-[var(--brand-500)]"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        type="button"
      >
        Continue with Google
      </button>

      {emailEnabled ? (
        <form className="space-y-3" onSubmit={handleEmailSignIn}>
          <input
            className="h-12 w-full rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none ring-0 placeholder:text-white/45 focus:border-white/25"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            type="email"
            value={email}
          />
          <button
            className="flex h-12 w-full items-center justify-center rounded-full border border-white/10 bg-white/5 font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || !email}
            type="submit"
          >
            {loading ? "Sending magic link..." : "Continue with Email"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
