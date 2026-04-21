import { NextResponse } from "next/server";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RESULTS = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    select: { workspaceId: true }
  });
  const workspaceIds = memberships.map((m) => m.workspaceId);

  if (workspaceIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const [transactions, debts, workspaces] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { merchant: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } }
        ]
      },
      take: MAX_RESULTS,
      orderBy: { transactionDate: "desc" },
      select: { id: true, title: true, amount: true, transactionType: true, merchant: true, transactionDate: true, workspaceId: true }
    }),
    prisma.debt.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        OR: [
          { counterpartyName: { contains: q, mode: "insensitive" } },
          { purpose: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } }
        ]
      },
      take: MAX_RESULTS,
      orderBy: { createdAt: "desc" },
      select: { id: true, counterpartyName: true, balanceRemaining: true, type: true, status: true }
    }),
    prisma.workspace.findMany({
      where: {
        id: { in: workspaceIds },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } }
        ]
      },
      take: 5,
      select: { id: true, name: true, description: true }
    })
  ]);

  const results = [
    ...transactions.map((tx) => ({
      kind: "transaction" as const,
      id: tx.id,
      title: tx.title,
      subtitle: [tx.merchant, new Date(tx.transactionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })].filter(Boolean).join(" · "),
      href: `/transactions/${tx.id}`,
      amount: Number(tx.amount),
      type: tx.transactionType
    })),
    ...debts.map((d) => ({
      kind: "debt" as const,
      id: d.id,
      title: d.counterpartyName,
      subtitle: `${d.status} · ${d.type}`,
      href: `/debts`,
      amount: Number(d.balanceRemaining),
      type: d.type
    })),
    ...workspaces.map((w) => ({
      kind: "workspace" as const,
      id: w.id,
      title: w.name,
      subtitle: w.description ?? "Workspace",
      href: `/workspaces/${w.id}`,
      amount: null,
      type: null
    }))
  ].slice(0, MAX_RESULTS);

  return NextResponse.json({ data: results, q });
}
