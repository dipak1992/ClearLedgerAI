import { NextResponse } from "next/server";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { createTransactionSchema } from "@/lib/validators/transaction";
import { createRecordFromTransaction } from "@/lib/money-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const data = await prisma.transaction.findMany({
    where: {
      workspaceId
    },
    orderBy: {
      transactionDate: "desc"
    },
    take: 100
  });

  return NextResponse.json({
    data: data.map((item) => ({
      ...item,
      amount: Number(item.amount)
    }))
  });
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
    { status: 201 }
  );
}
