import { DebtStatus, MoneyRecordStatus, MoneyRecordType } from "@prisma/client";
import { NextResponse } from "next/server";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { createDebtSchema } from "@/lib/validators/debt";
import { balanceRemaining, createRecordFromDebt } from "@/lib/money-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Phase 9: reads now use MoneyRecord as the canonical source. The POST
// handler still dual-writes to the legacy Debt table so older clients
// and the legacy UI remain unaffected.
const DEPRECATION_HEADERS = {
  Deprecation: "true",
  Sunset: "2026-09-01",
  Link: '</api/records>; rel="successor-version"'
};

const DEBT_TYPES: MoneyRecordType[] = [
  MoneyRecordType.DEBT_GIVEN,
  MoneyRecordType.DEBT_BORROWED
];

const OPEN_STATUSES: MoneyRecordStatus[] = [
  MoneyRecordStatus.PENDING,
  MoneyRecordStatus.PARTIAL,
  MoneyRecordStatus.OVERDUE
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId query param is required" }, { status: 400 });
  }

  const user = await getRequestUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: user.id
    }
  });

  if (!membership) {
    return NextResponse.json({ error: "You do not have access to this workspace" }, { status: 403 });
  }

  // Phase 9: read from MoneyRecord, project to legacy Debt shape.
  const records = await prisma.moneyRecord.findMany({
    where: {
      workspaceId,
      type: { in: DEBT_TYPES }
    },
    include: {
      payments: {
        orderBy: { paymentDate: "desc" }
      }
    },
    orderBy: [
      { status: "asc" },
      { dueDate: "asc" }
    ],
    take: 100
  });

  const data = records.map((r) => ({
    id: r.id,
    workspaceId: r.workspaceId,
    createdById: r.createdById,
    counterpartyName: r.counterpartyName ?? "",
    amountTotal: Number(r.amount),
    amountPaid: Number(r.amountPaid),
    balanceRemaining: balanceRemaining(r.amount, r.amountPaid),
    currency: r.currency,
    type: r.type === MoneyRecordType.DEBT_GIVEN ? "LENT" : "BORROWED",
    status: recordStatusToDebtStatus(r.status),
    purpose: r.title ?? r.notes ?? null,
    dueDate: r.dueDate,
    method: r.paymentMethod,
    notes: r.notes,
    moneyRecordId: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    payments: r.payments.map((p) => ({
      id: p.id,
      recordId: p.recordId,
      debtId: p.recordId,
      amount: Number(p.amount),
      paymentDate: p.paymentDate,
      method: p.method,
      notes: p.notes,
      createdAt: p.createdAt
    }))
  }));

  return NextResponse.json({ data }, { headers: DEPRECATION_HEADERS });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createDebtSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getRequestUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = parsed.data;

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: payload.workspaceId,
      userId: user.id
    }
  });

  if (!membership) {
    return NextResponse.json({ error: "You do not have access to this workspace" }, { status: 403 });
  }

  const debt = await prisma.debt.create({
    data: {
      workspaceId: payload.workspaceId,
      createdById: user.id,
      counterpartyName: payload.counterpartyName,
      amountTotal: payload.amountTotal,
      amountPaid: 0,
      balanceRemaining: payload.amountTotal,
      type: payload.type,
      status: payload.status,
      purpose: payload.purpose,
      dateCreated: payload.dateCreated ?? new Date(),
      dueDate: payload.dueDate,
      method: payload.method,
      notes: payload.notes
    }
  });

  // Dual-write to the unified MoneyRecord table. Best-effort: failures
  // are logged but do not block the legacy success response.
  try {
    const record = await createRecordFromDebt(debt);
    await prisma.debt.update({
      where: { id: debt.id },
      data: { moneyRecordId: record.id }
    });
  } catch (err) {
    console.error("[money-records] Failed to mirror debt", {
      debtId: debt.id,
      error: err
    });
  }

  return NextResponse.json(
    {
      data: {
        ...debt,
        amountTotal: Number(debt.amountTotal),
        amountPaid: Number(debt.amountPaid),
        balanceRemaining: Number(debt.balanceRemaining)
      }
    },
    { status: 201, headers: DEPRECATION_HEADERS }
  );
}

function recordStatusToDebtStatus(status: MoneyRecordStatus): string {
  switch (status) {
    case MoneyRecordStatus.PAID: return "PAID";
    case MoneyRecordStatus.PARTIAL: return "PARTIAL";
    case MoneyRecordStatus.OVERDUE: return "OVERDUE";
    default: return "OPEN";
  }
}

function computeStatus(total: number, paid: number, dueDate: Date | null) {
  if (paid >= total) return DebtStatus.PAID;
  if (paid > 0) return DebtStatus.PARTIAL;
  if (dueDate && dueDate.getTime() < Date.now()) return DebtStatus.OVERDUE;
  return DebtStatus.OPEN;
}

export { computeStatus, OPEN_STATUSES };
