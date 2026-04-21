import { MoneyRecordStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const addPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.string().max(60).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  paymentDate: z.coerce.date().default(() => new Date())
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const record = await prisma.moneyRecord.findUnique({
    where: { id },
    select: { id: true, workspaceId: true, amount: true, amountPaid: true, status: true }
  });
  if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId: record.workspaceId, userId: user.id }
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = addPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { amount, method, notes, paymentDate } = parsed.data;
  const total = Number(record.amount);
  const prevPaid = Number(record.amountPaid);
  const newPaid = Math.min(prevPaid + amount, total);
  const newStatus: MoneyRecordStatus =
    newPaid >= total ? MoneyRecordStatus.PAID : MoneyRecordStatus.PARTIAL;

  const [payment] = await prisma.$transaction([
    prisma.moneyRecordPayment.create({
      data: {
        recordId: id,
        createdById: user.id,
        amount,
        method: method ?? undefined,
        notes: notes ?? undefined,
        paymentDate
      }
    }),
    prisma.moneyRecord.update({
      where: { id },
      data: { amountPaid: newPaid, status: newStatus }
    })
  ]);

  return NextResponse.json({ data: { ...payment, amount: Number(payment.amount) } }, { status: 201 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const record = await prisma.moneyRecord.findUnique({
    where: { id },
    select: { workspaceId: true }
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId: record.workspaceId, userId: user.id }
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payments = await prisma.moneyRecordPayment.findMany({
    where: { recordId: id },
    orderBy: { paymentDate: "desc" }
  });

  return NextResponse.json({
    data: payments.map((p) => ({ ...p, amount: Number(p.amount) }))
  });
}
