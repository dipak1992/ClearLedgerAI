import { MoneyRecordType } from "@prisma/client";
import { NextResponse } from "next/server";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { updateTransactionSchema } from "@/lib/validators/transaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toMoneyRecordType(type: string): MoneyRecordType {
  switch (type) {
    case "INCOME":
      return MoneyRecordType.INCOME;
    case "TRANSFER":
      return MoneyRecordType.TRANSFER;
    case "REIMBURSEMENT":
      return MoneyRecordType.REIMBURSEMENT;
    default:
      return MoneyRecordType.EXPENSE;
  }
}

async function getEditableTarget(transactionId: string, userId: string) {
  const moneyRecord = await prisma.moneyRecord.findUnique({
    where: { id: transactionId },
    include: {
      transaction: true
    }
  });

  if (moneyRecord) {
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: moneyRecord.workspaceId,
        userId
      }
    });

    if (!membership) {
      return { error: NextResponse.json({ error: "You do not have access to this workspace" }, { status: 403 }) };
    }

    return { moneyRecord, transaction: moneyRecord.transaction };
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId }
  });

  if (!transaction) {
    return { error: NextResponse.json({ error: "Transaction not found" }, { status: 404 }) };
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: transaction.workspaceId,
      userId
    }
  });

  if (!membership) {
    return { error: NextResponse.json({ error: "You do not have access to this workspace" }, { status: 403 }) };
  }

  const linkedRecord = transaction.moneyRecordId
    ? await prisma.moneyRecord.findUnique({ where: { id: transaction.moneyRecordId } })
    : null;

  return { transaction, moneyRecord: linkedRecord };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await params;
  const body = await request.json();
  const parsed = updateTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getRequestUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const target = await getEditableTarget(transactionId, user.id);

  if ("error" in target) {
    return target.error;
  }

  const payload = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    let updatedTransaction = target.transaction;
    let updatedMoneyRecord = target.moneyRecord;

    if (target.transaction) {
      updatedTransaction = await tx.transaction.update({
        where: { id: target.transaction.id },
        data: {
          title: payload.title,
          amount: payload.amount,
          transactionType: payload.transactionType,
          currency: payload.currency.toUpperCase(),
          merchant: payload.merchant,
          transactionDate: payload.transactionDate,
          paymentMethod: payload.paymentMethod,
          notes: payload.notes,
          categoryId: payload.categoryId
        }
      });
    }

    if (target.moneyRecord) {
      updatedMoneyRecord = await tx.moneyRecord.update({
        where: { id: target.moneyRecord.id },
        data: {
          title: payload.title,
          amount: payload.amount,
          type: toMoneyRecordType(payload.transactionType),
          currency: payload.currency.toUpperCase(),
          merchant: payload.merchant,
          occurredAt: payload.transactionDate,
          paymentMethod: payload.paymentMethod,
          notes: payload.notes,
          categoryId: payload.categoryId
        }
      });
    }

    return { updatedTransaction, updatedMoneyRecord };
  });

  const transaction = result.updatedTransaction;
  const moneyRecord = result.updatedMoneyRecord;

  return NextResponse.json({
    data: transaction
      ? { ...transaction, amount: Number(transaction.amount) }
      : moneyRecord
        ? {
            id: moneyRecord.id,
            title: moneyRecord.title ?? "",
            amount: Number(moneyRecord.amount),
            currency: moneyRecord.currency,
            transactionType: moneyRecord.type,
            merchant: moneyRecord.merchant,
            transactionDate: moneyRecord.occurredAt,
            paymentMethod: moneyRecord.paymentMethod,
            notes: moneyRecord.notes,
            categoryId: moneyRecord.categoryId,
            workspaceId: moneyRecord.workspaceId
          }
        : null
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await params;
  const user = await getRequestUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const target = await getEditableTarget(transactionId, user.id);

  if ("error" in target) {
    return target.error;
  }

  await prisma.$transaction(async (tx) => {
    if (target.transaction && target.transaction.moneyRecordId) {
      await tx.moneyRecord.delete({
        where: { id: target.transaction.moneyRecordId }
      });
      await tx.transaction.delete({
        where: { id: target.transaction.id }
      });
      return;
    }

    if (target.transaction) {
      await tx.transaction.delete({
        where: { id: target.transaction.id }
      });
      return;
    }

    if (target.moneyRecord) {
      await tx.moneyRecord.delete({
        where: { id: target.moneyRecord.id }
      });
    }
  });

  return NextResponse.json({ ok: true });
}
