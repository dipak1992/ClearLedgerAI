import { WorkspaceRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(WorkspaceRole).default(WorkspaceRole.EDITOR)
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  // Caller must be an ADMIN of this workspace
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: user.id, role: WorkspaceRole.ADMIN }
  });
  if (!membership) {
    return NextResponse.json(
      { error: "You must be a workspace admin to invite members" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, role } = parsed.data;

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMembership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: existingUser.id }
    });
    if (existingMembership) {
      return NextResponse.json(
        { error: "This user is already a member of this workspace" },
        { status: 409 }
      );
    }

    // Auto-join for existing users
    const newMembership = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: existingUser.id,
        role,
        invitedEmail: email
      }
    });
    return NextResponse.json({ data: newMembership }, { status: 201 });
  }

  // For non-existing users: create a pending invite record (userId will be filled on first login)
  const existingInvite = await prisma.workspaceMember.findFirst({
    where: { workspaceId, invitedEmail: email }
  });
  if (existingInvite) {
    return NextResponse.json(
      { error: "An invite for this email already exists" },
      { status: 409 }
    );
  }

  // The current schema requires a userId on WorkspaceMember so we cannot
  // store a fully-pending (user-less) invite today. Return a clear error
  // so callers know the invited user must sign up first, then be added.
  return NextResponse.json(
    {
      error:
        "No account found for that email. Ask the person to sign up first, then invite them.",
      code: "USER_NOT_FOUND"
    },
    { status: 404 }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: user.id }
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } }
    },
    orderBy: { joinedAt: "asc" }
  });

  return NextResponse.json({
    data: members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      invitedEmail: m.invitedEmail,
      user: m.user
    }))
  });
}
