import { MoneyRecordType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { createRecord, listRecords } from "@/lib/money-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createRecordSchema = z.object({
  workspaceId: z.string().cuid(),
  type: z.nativeEnum(MoneyRecordType).default(MoneyRecordType.EXPENSE),
  title: z.string().min(1).max(180),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default("USD"),
  occurredAt: z.coerce.date().default(() => new Date()),
  merchant: z.string().max(120).optional().nullable(),
  paymentMethod: z.string().max(60).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  counterpartyName: z.string().max(120).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId query param is required" }, { status: 400 });
  }

  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: user.id }
  });
  if (!membership) {
    return NextResponse.json({ error: "You do not have access to this workspace" }, { status: 403 });
  }

  const q = searchParams.get("q") ?? undefined;
  const typesParam = searchParams.get("types");
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;
  const take = Math.min(Number(searchParams.get("take") ?? "100"), 200);
  const skip = Number(searchParams.get("skip") ?? "0");

  const records = await listRecords({
    workspaceId,
    q,
    types: typesParam ? (typesParam.split(",") as MoneyRecordType[]) : undefined,
    from,
    to,
    take,
    skip
  });

  return NextResponse.json({
    data: records.map((r) => ({
      ...r,
      amount: Number(r.amount),
      amountPaid: Number(r.amountPaid)
    }))
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { workspaceId } = parsed.data;
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: user.id }
  });
  if (!membership) {
    return NextResponse.json({ error: "You do not have access to this workspace" }, { status: 403 });
  }

  const record = await createRecord({
    workspaceId,
    createdById: user.id,
    type: parsed.data.type,
    title: parsed.data.title,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    occurredAt: parsed.data.occurredAt,
    merchant: parsed.data.merchant,
    paymentMethod: parsed.data.paymentMethod,
    notes: parsed.data.notes,
    categoryId: parsed.data.categoryId,
    counterpartyName: parsed.data.counterpartyName,
    dueDate: parsed.data.dueDate
  });

  return NextResponse.json(
    { data: { ...record, amount: Number(record.amount), amountPaid: Number(record.amountPaid) } },
    { status: 201 }
  );
}
