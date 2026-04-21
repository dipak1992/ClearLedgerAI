import { redirect } from "next/navigation";
import Link from "next/link";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { AppShell, Card } from "@/components/shell";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/sign-in");

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: { workspace: { select: { id: true, name: true, currency: true } } },
    orderBy: { joinedAt: "asc" }
  });

  const initial = (user.name ?? user.email ?? "?")[0].toUpperCase();

  return (
    <AppShell topBarRight={<SignOutButton />}>
      <div className="mx-auto w-full max-w-3xl">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
          <p className="mt-1.5 text-sm text-white/50">Manage your account, workspaces, and plan.</p>
        </div>

        {/* Profile card */}
        <Card className="mb-4">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/40">Profile</h2>
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--brand-600)] text-2xl font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">{user.name ?? "—"}</p>
              <p className="truncate text-sm text-white/50">{user.email}</p>
            </div>
          </div>
        </Card>

        {/* Plan card */}
        <Card className="mb-4">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/40">Plan</h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">Free</p>
              <p className="mt-0.5 text-sm text-white/50">Up to 3 workspaces, 200 transactions/mo, CSV export.</p>
            </div>
            <Link
              href="/pricing"
              className="shrink-0 rounded-full bg-[var(--brand-600)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-500)]"
            >
              Upgrade
            </Link>
          </div>
        </Card>

        {/* Workspaces */}
        <Card className="p-0">
          <div className="border-b border-white/8 px-6 py-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">Your Workspaces</h2>
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
                    <p className="mt-0.5 text-xs text-white/40">{m.workspace.currency} · {m.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/workspaces/${m.workspaceId}/shared`}
                      className="shrink-0 rounded-full bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
                    >
                      Members
                    </Link>
                    <Link
                      href={`/workspaces/${m.workspaceId}`}
                      className="shrink-0 rounded-full bg-white/8 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/14 hover:text-white"
                    >
                      Open →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

      </div>
    </AppShell>
  );
}
