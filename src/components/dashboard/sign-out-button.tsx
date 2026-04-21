"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="rounded-full px-4 py-2 text-sm text-[var(--muted)] ring-1 ring-white/10 transition-all hover:bg-white/8 hover:text-white"
      onClick={() => signOut({ callbackUrl: "/sign-in" })}
    >
      Sign out
    </button>
  );
}
