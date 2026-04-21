import { redirect } from "next/navigation";
import Link from "next/link";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { AppNav } from "@/components/layout/app-nav";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export default async function SettingsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/sign-in");

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: { workspace: { select: { id: true, name: true, currency: true } } },
    orderBy: { joinedAt: "asc" },
  });

  const initial = (user.name ?? user.email ?? "?")[0].toUpperCase();

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl">

        {/* Top bar */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link
            className="text-xl font-bold tracking-tight text-[var(--brand-500)]"
            href="/dashboard"
          >
            ClearLedger
          </Link>
          <AppNav />
          <SignOutButton />
        </header>

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1.5 text-[var(--muted)]">Manage your account, workspaces, and plan.</p>
        </div>

        {/* Profile card */}
        <section className="mb-6 card-surface rounded-[1.75rem] p-6">
          <h2 className="mb-5 text-base font-semibold text-white/60 uppercase tracking-widest text-xs">Profile</h2>
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--brand-600)] text-2xl font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">{user.name ?? "—"}</p>
              <p className="truncate text-sm text-[var(--muted)]">{user.email}</p>
            </div>
          </div>
        </section>

        {/* Plan card */}
        <section className="mb-6 card-surface rounded-[1.75rem] p-6">
          <h2 className="mb-5 text-xs font-semibold text-white/60 uppercase tracking-widest">Plan</h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">Free</p>
              <p className="mt-0.5 text-sm text-[var(--muted)]">Up to 3 workspaces, 200 transactions/mo, CSV export.</p>
            </div>
            <Link
              href="/pricing"
              className="shrink-0 rounded-full bg-[var(--brand-600)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-500)]"
            >
              Upgrade
            </Link>
          </div>
        </section>

        {/* Workspaces */}
        <section className="card-surface rounded-[1.75rem] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/8">
            <h2 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Your Workspaces</h2>
          </div>
          {memberships.length === 0 ? (
            <p className="px-6 py-8 text-center text-white/40">No workspaces yet.</p>
          ) : (
            <ul>
              {memberships.map((m, i) => (
                <li
                  key={m.workspaceId}
                  className={`flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-white/4 ${i < memberships.length - 1 ? "border-b border-white/5" : ""}`}
                >
                  <div>
                    <p className="font-medium">{m.workspace.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">{m.workspace.currency} · {m.role}</p>
                  </div>
                  <Link
                    href={`/workspaces/${m.workspaceId}`}
                    className="shrink-0 rounded-full bg-white/8 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/14 hover:text-white"
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </main>
  );
}
