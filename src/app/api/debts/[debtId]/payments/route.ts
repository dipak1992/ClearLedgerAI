import { NextResponse } from "next/server";

import { computeStatus } from "@/app/api/debts/route";
import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { addDebtPaymentSchema } from "@/lib/validators/debt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ debtId: string }> }) {
  const body = await request.json();
  const parsed = addDebtPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getRequestUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { debtId } = await params;

  const debt = await prisma.debt.findUnique({ where: { id: debtId } });

  if (!debt) {
    return NextResponse.json({ error: "Debt not found" }, { status: 404 });
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: debt.workspaceId,
      userId: user.id
    }
  });

  if (!membership) {
    return NextResponse.json({ error: "You do not have access to this workspace" }, { status: 403 });
  }

  const payment = await prisma.debtPayment.create({
    data: {
      debtId,
      createdById: user.id,
      amount: parsed.data.amount,
      paymentDate: parsed.data.paymentDate,
      method: parsed.data.method,
      notes: parsed.data.notes
    }
  });

  const nextPaidAmount = Number(debt.amountPaid) + parsed.data.amount;
  const nextBalance = Math.max(0, Number(debt.amountTotal) - nextPaidAmount);

  const updated = await prisma.debt.update({
    where: { id: debtId },
    data: {
      amountPaid: nextPaidAmount,
      balanceRemaining: nextBalance,
      status: computeStatus(Number(debt.amountTotal), nextPaidAmount, debt.dueDate)
    }
  });

  return NextResponse.json({
    data: {
      payment: {
        ...payment,
        amount: Number(payment.amount)
      },
      debt: {
        ...updated,
        amountTotal: Number(updated.amountTotal),
        amountPaid: Number(updated.amountPaid),
        balanceRemaining: Number(updated.balanceRemaining)
      }
    }
  });
}
