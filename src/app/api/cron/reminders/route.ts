import { NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/server/prisma";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Nightly reminder cron — called by Vercel Cron or an external scheduler.
 * Secured by a shared secret in CRON_SECRET env var.
 *
 * Creates Notification rows for:
 *  - Overdue debts (status OVERDUE)
 *  - Debts due in the next 7 days (upcoming)
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = env.CRON_SECRET;

  // Require authorization in all environments when secret is configured.
  // If CRON_SECRET is not set, allow only in development to simplify local testing.
  if (expectedSecret) {
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 401 });
  }

  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  // Find overdue debts
  const overdueDebts = await prisma.debt.findMany({
    where: { status: "OVERDUE" },
    select: { id: true, workspaceId: true, createdById: true, counterpartyName: true, balanceRemaining: true, currency: true }
  });

  // Find debts due soon (not already overdue)
  const dueSoonDebts = await prisma.debt.findMany({
    where: {
      status: { in: ["OPEN", "PARTIAL"] },
      dueDate: { gte: now, lte: sevenDays }
    },
    select: { id: true, workspaceId: true, createdById: true, counterpartyName: true, balanceRemaining: true, currency: true, dueDate: true }
  });

  const notificationsToCreate = [
    ...overdueDebts.map((d) => ({
      workspaceId: d.workspaceId,
      userId: d.createdById,
      type: NotificationType.REMINDER,
      title: `Overdue: ${d.counterpartyName}`,
      body: `${d.currency} ${Number(d.balanceRemaining).toFixed(2)} is past due. Take action now.`
    })),
    ...dueSoonDebts.map((d) => ({
      workspaceId: d.workspaceId,
      userId: d.createdById,
      type: NotificationType.REMINDER,
      title: `Due soon: ${d.counterpartyName}`,
      body: `${d.currency} ${Number(d.balanceRemaining).toFixed(2)} due ${(d.dueDate ?? new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`
    }))
  ];

  let created = 0;
  if (notificationsToCreate.length > 0) {
    const result = await prisma.notification.createMany({
      data: notificationsToCreate,
      skipDuplicates: false
    });
    created = result.count;
  }

  return NextResponse.json({
    ok: true,
    processed: {
      overdue: overdueDebts.length,
      dueSoon: dueSoonDebts.length,
      notificationsCreated: created
    }
  });
}
