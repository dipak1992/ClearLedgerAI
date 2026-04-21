import { DebtStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { createDebtSchema } from "@/lib/validators/debt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId query param is required" }, { status: 400 });
  }

  const debts = await prisma.debt.findMany({
    where: { workspaceId },
    include: {
      payments: {
        orderBy: {
          paymentDate: "desc"
        }
      }
    },
    orderBy: {
      dueDate: "asc"
    },
    take: 100
  });

  return NextResponse.json({
    data: debts.map((debt) => ({
      ...debt,
      amountTotal: Number(debt.amountTotal),
      amountPaid: Number(debt.amountPaid),
      balanceRemaining: Number(debt.balanceRemaining),
      payments: debt.payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount)
      }))
    }))
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createDebtSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getRequestUser();
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

  return NextResponse.json(
    {
      data: {
        ...debt,
        amountTotal: Number(debt.amountTotal),
        amountPaid: Number(debt.amountPaid),
        balanceRemaining: Number(debt.balanceRemaining)
      }
    },
    { status: 201 }
  );
}

function computeStatus(total: number, paid: number, dueDate: Date | null) {
  if (paid >= total) {
    return DebtStatus.PAID;
  }

  if (paid > 0) {
    return DebtStatus.PARTIAL;
  }

  if (dueDate && dueDate.getTime() < Date.now()) {
    return DebtStatus.OVERDUE;
  }

  return DebtStatus.OPEN;
}

export { computeStatus };
