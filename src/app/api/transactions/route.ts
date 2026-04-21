import { MoneyRecordType } from "@prisma/client";
import { NextResponse } from "next/server";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { createTransactionSchema } from "@/lib/validators/transaction";
import { createRecordFromTransaction } from "@/lib/money-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Phase 9: reads now use MoneyRecord as the canonical source. The POST
// handler still dual-writes to the legacy Transaction table so older
// clients and the legacy UI remain unaffected.
const DEPRECATION_HEADERS = {
  Deprecation: "true",
  "Sunset": "2026-09-01",
  Link: '</api/records>; rel="successor-version"'
};

const TRANSACTION_TYPES: MoneyRecordType[] = [
  MoneyRecordType.EXPENSE,
  MoneyRecordType.INCOME,
  MoneyRecordType.TRANSFER,
  MoneyRecordType.REIMBURSEMENT
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

  // Phase 9: read from MoneyRecord, project to legacy Transaction shape.
  const records = await prisma.moneyRecord.findMany({
    where: {
      workspaceId,
      type: { in: TRANSACTION_TYPES }
    },
    orderBy: { occurredAt: "desc" },
    take: 100
  });

  const data = records.map((r) => ({
    id: r.id,
    workspaceId: r.workspaceId,
    createdById: r.createdById,
    categoryId: r.categoryId,
    title: r.title ?? "",
    amount: Number(r.amount),
    currency: r.currency,
    transactionType: recordTypeToTransactionType(r.type),
    merchant: r.merchant,
    transactionDate: r.occurredAt,
    paymentMethod: r.paymentMethod,
    accountMask: null,
    notes: r.notes,
    aiSource: r.aiSource,
    splitConfig: null,
    metadata: r.metadata,
    moneyRecordId: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }));

  return NextResponse.json({ data }, { headers: DEPRECATION_HEADERS });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createTransactionSchema.safeParse(body);

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

  const transaction = await prisma.transaction.create({
    data: {
      workspaceId: payload.workspaceId,
      createdById: user.id,
      categoryId: payload.categoryId,
      title: payload.title,
      amount: payload.amount,
      transactionType: payload.transactionType,
      currency: payload.currency.toUpperCase(),
      merchant: payload.merchant,
      transactionDate: payload.transactionDate,
      paymentMethod: payload.paymentMethod,
      notes: payload.notes
    }
  });

  // Dual-write: mirror into the unified MoneyRecord table. Non-blocking
  // for the user: if mirroring fails we log but still return the
  // created transaction so the legacy path cannot regress.
  try {
    const record = await createRecordFromTransaction(transaction);
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { moneyRecordId: record.id }
    });
  } catch (err) {
    console.error("[money-records] Failed to mirror transaction", {
      transactionId: transaction.id,
      error: err
    });
  }

  return NextResponse.json(
    {
      data: {
        ...transaction,
        amount: Number(transaction.amount)
      }
    },
    { status: 201, headers: DEPRECATION_HEADERS }
  );
}

function recordTypeToTransactionType(type: MoneyRecordType): string {
  switch (type) {
    case MoneyRecordType.INCOME: return "INCOME";
    case MoneyRecordType.TRANSFER: return "TRANSFER";
    case MoneyRecordType.REIMBURSEMENT: return "REIMBURSEMENT";
    default: return "EXPENSE";
  }
}
