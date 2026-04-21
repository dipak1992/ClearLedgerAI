import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { AppShell, Card } from "@/components/shell";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { InviteMemberForm } from "./invite-form";

export const dynamic = "force-dynamic";

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-[var(--brand-600)]/20 text-[var(--brand-500)]",
  EDITOR: "bg-blue-500/15 text-blue-400",
  VIEWER: "bg-white/8 text-white/50"
};

export default async function SharedWorkspacePage({
  params
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getRequestUser();
  if (!user) redirect("/sign-in");

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    include: { workspace: { select: { name: true } } }
  });
  if (!membership) notFound();

  const isAdmin = membership.role === "ADMIN";

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } }
    },
    orderBy: { joinedAt: "asc" }
  });

  return (
    <AppShell topBarRight={<SignOutButton />}>
      <div className="mx-auto w-full max-w-2xl">

        {/* Back */}
        <Link
          href={`/workspaces/${workspaceId}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {membership.workspace.name}
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Members</h1>
          <p className="mt-1.5 text-sm text-white/50">
            {members.length} member{members.length !== 1 ? "s" : ""} · {membership.workspace.name}
          </p>
        </div>

        {/* Invite form */}
        {isAdmin && (
          <Card className="mb-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
              Invite a member
            </h2>
            <InviteMemberForm workspaceId={workspaceId} />
          </Card>
        )}

        {/* Member list */}
        <Card className="p-0">
          <div className="border-b border-white/8 px-6 py-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Current members
            </h2>
          </div>
          <ul>
            {members.map((m, i) => {
              const displayName = m.user.name ?? m.invitedEmail ?? m.user.email ?? "—";
              const email = m.invitedEmail ?? m.user.email ?? "";
              const isYou = m.userId === user.id;
              const badgeClass = ROLE_COLOR[m.role] ?? "bg-white/8 text-white/50";

              return (
                <li
                  key={m.id}
                  className={`flex items-center gap-4 px-6 py-4 ${i < members.length - 1 ? "border-b border-white/5" : ""}`}
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/70">
                    {(displayName[0] ?? "?").toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {displayName}
                      {isYou && <span className="ml-2 text-xs text-white/40">(you)</span>}
                    </p>
                    {email && email !== displayName && (
                      <p className="truncate text-xs text-white/40">{email}</p>
                    )}
                    {m.invitedEmail && !m.user.email && (
                      <p className="mt-0.5 text-xs text-yellow-400/80">Invite pending</p>
                    )}
                  </div>

                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
                    {m.role.charAt(0) + m.role.slice(1).toLowerCase()}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Role guide */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { role: "Admin", desc: "Full control: invite members, edit, delete, export." },
            { role: "Editor", desc: "Add and edit records; cannot manage members." },
            { role: "Viewer", desc: "Read-only access to this workspace." }
          ].map((r) => (
            <div key={r.role} className="rounded-2xl border border-white/8 p-4">
              <p className="text-xs font-semibold text-white/70">{r.role}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/40">{r.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}
