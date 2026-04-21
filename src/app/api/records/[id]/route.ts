import { MoneyRecordStatus, MoneyRecordType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { updateRecord } from "@/lib/money-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateRecordSchema = z.object({
  type: z.nativeEnum(MoneyRecordType).optional(),
  title: z.string().min(1).max(180).optional(),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().length(3).optional(),
  occurredAt: z.coerce.date().optional(),
  status: z.nativeEnum(MoneyRecordStatus).optional(),
  merchant: z.string().max(120).optional().nullable(),
  paymentMethod: z.string().max(60).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  counterpartyName: z.string().max(120).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable()
});

async function resolveRecord(id: string, userId: string) {
  const record = await prisma.moneyRecord.findUnique({
    where: { id },
    select: { id: true, workspaceId: true }
  });
  if (!record) return null;

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId: record.workspaceId, userId }
  });
  return membership ? record : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const record = await prisma.moneyRecord.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId: record.workspaceId, userId: user.id }
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    data: { ...record, amount: Number(record.amount), amountPaid: Number(record.amountPaid) }
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const resolved = await resolveRecord(id, user.id);
  if (!resolved) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });

  const body = await request.json();
  const parsed = updateRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateRecord(id, parsed.data);
  return NextResponse.json({
    data: { ...updated, amount: Number(updated.amount), amountPaid: Number(updated.amountPaid) }
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const resolved = await resolveRecord(id, user.id);
  if (!resolved) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });

  await prisma.moneyRecord.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
