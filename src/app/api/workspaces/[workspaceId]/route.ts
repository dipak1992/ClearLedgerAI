import { NextResponse } from "next/server";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { updateWorkspaceSchema } from "@/lib/validators/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAdminMembership(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      role: "ADMIN"
    },
    include: {
      workspace: {
        select: {
          id: true,
          ownerId: true
        }
      }
    }
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const body = await request.json();
  const parsed = updateWorkspaceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getRequestUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const membership = await getAdminMembership(workspaceId, user.id);

  if (!membership) {
    return NextResponse.json(
      { error: "You must be a workspace admin to edit this workspace" },
      { status: 403 }
    );
  }

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description
    }
  });

  return NextResponse.json({ data: workspace });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const user = await getRequestUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const membership = await getAdminMembership(workspaceId, user.id);

  if (!membership) {
    return NextResponse.json(
      { error: "You must be a workspace admin to delete this workspace" },
      { status: 403 }
    );
  }

  if (membership.workspace.ownerId !== user.id) {
    return NextResponse.json(
      { error: "Only the workspace owner can delete this workspace" },
      { status: 403 }
    );
  }

  await prisma.workspace.delete({
    where: { id: workspaceId }
  });

  return NextResponse.json({ ok: true });
}
