import { NextResponse } from "next/server";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";

  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: user.id }
  });
  if (!membership) {
    return NextResponse.json({ error: "You do not have access to this workspace" }, { status: 403 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true }
  });

  const transactions = await prisma.transaction.findMany({
    where: { workspaceId },
    orderBy: { transactionDate: "desc" },
    include: { category: { select: { name: true } } }
  });

  if (format === "json") {
    return NextResponse.json({
      workspace: workspace?.name,
      exportedAt: new Date().toISOString(),
      count: transactions.length,
      data: transactions.map((tx) => ({
        id: tx.id,
        title: tx.title,
        amount: Number(tx.amount),
        currency: tx.currency,
        type: tx.transactionType,
        merchant: tx.merchant,
        category: tx.category?.name ?? null,
        paymentMethod: tx.paymentMethod,
        date: tx.transactionDate.toISOString().slice(0, 10),
        notes: tx.notes
      }))
    });
  }

  // CSV
  const headers = ["id", "date", "title", "type", "amount", "currency", "merchant", "category", "paymentMethod", "notes"];
  const rows = transactions.map((tx) => [
    tx.id,
    tx.transactionDate.toISOString().slice(0, 10),
    tx.title,
    tx.transactionType,
    Number(tx.amount).toFixed(2),
    tx.currency,
    tx.merchant ?? "",
    tx.category?.name ?? "",
    tx.paymentMethod ?? "",
    tx.notes ?? ""
  ]);

  const csv = [headers.map(escapeCSV).join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join("\n");

  const fileName = `clearledger-${(workspace?.name ?? workspaceId).replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
