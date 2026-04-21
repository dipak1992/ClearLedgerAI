import { redirect } from "next/navigation";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { AppShell } from "@/components/shell";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

import { RecordsClient } from "./records-client";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/sign-in");

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: { workspace: { select: { id: true, name: true } } },
    orderBy: { workspace: { createdAt: "asc" } }
  });

  const workspaces = memberships.map((m) => ({ id: m.workspace.id, name: m.workspace.name }));
  const defaultWorkspaceId = workspaces[0]?.id ?? "";

  return (
    <AppShell topBarRight={<SignOutButton />}>
      <RecordsClient workspaces={workspaces} defaultWorkspaceId={defaultWorkspaceId} />
    </AppShell>
  );
}
