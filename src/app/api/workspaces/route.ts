import { NextResponse } from "next/server";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { createWorkspaceSchema } from "@/lib/validators/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET() {
  const user = await getRequestUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: {
      workspace: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json({
    data: memberships.map((item) => ({
      id: item.workspace.id,
      name: item.workspace.name,
      slug: item.workspace.slug,
      description: item.workspace.description,
      role: item.role
    }))
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createWorkspaceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getRequestUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const baseSlug = toSlug(parsed.data.name);

  const workspace = await prisma.workspace.create({
    data: {
      ownerId: user.id,
      name: parsed.data.name,
      slug: `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`,
      description: parsed.data.description,
      members: {
        create: {
          userId: user.id,
          role: "ADMIN",
          joinedAt: new Date()
        }
      }
    }
  });

  return NextResponse.json({ data: workspace }, { status: 201 });
}
