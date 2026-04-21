import type { Prisma, PrismaClient } from "@prisma/client";
import {
  MoneyRecordStatus,
  MoneyRecordType
} from "@prisma/client";

import { prisma } from "@/lib/server/prisma";

import {
  debtToRecordData,
  transactionToRecordData,
  type DebtToRecordInput,
  type TransactionToRecordInput
} from "./mappers";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export interface CreateRecordInput {
  workspaceId: string;
  createdById: string;
  type: MoneyRecordType;
  amount: Prisma.Decimal | number | string;
  occurredAt: Date;
  categoryId?: string | null;
  status?: MoneyRecordStatus;
  title?: string | null;
  currency?: string;
  dueDate?: Date | null;
  counterpartyName?: string | null;
  counterpartyUserId?: string | null;
  merchant?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  aiSource?: string | null;
  metadata?: Prisma.InputJsonValue;
}

const DEBT_TYPES: ReadonlySet<MoneyRecordType> = new Set([
  MoneyRecordType.DEBT_GIVEN,
  MoneyRecordType.DEBT_BORROWED
]);

/**
 * Create a MoneyRecord. Thin, validated wrapper around Prisma.create
 * used by the new `/api/records` handlers and by dual-write in the
 * legacy transaction and debt handlers.
 */
export function createRecord(input: CreateRecordInput, client: PrismaLike = prisma) {
  const status = input.status ?? defaultStatus(input.type);

  return client.moneyRecord.create({
    data: {
      workspaceId: input.workspaceId,
      createdById: input.createdById,
      categoryId: input.categoryId ?? null,
      type: input.type,
      status,
      title: input.title ?? null,
      amount: input.amount,
      currency: (input.currency ?? "USD").toUpperCase(),
      occurredAt: input.occurredAt,
      dueDate: input.dueDate ?? null,
      counterpartyName: input.counterpartyName ?? null,
      counterpartyUserId: input.counterpartyUserId ?? null,
      merchant: input.merchant ?? null,
      paymentMethod: input.paymentMethod ?? null,
      notes: input.notes ?? null,
      aiSource: input.aiSource ?? null,
      metadata: input.metadata ?? undefined
    }
  });
}

function defaultStatus(type: MoneyRecordType): MoneyRecordStatus {
  return DEBT_TYPES.has(type) ? MoneyRecordStatus.PENDING : MoneyRecordStatus.CLEARED;
}

export interface UpdateRecordInput {
  status?: MoneyRecordStatus;
  title?: string | null;
  amount?: Prisma.Decimal | number | string;
  currency?: string;
  occurredAt?: Date;
  dueDate?: Date | null;
  counterpartyName?: string | null;
  counterpartyUserId?: string | null;
  merchant?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export function updateRecord(id: string, input: UpdateRecordInput, client: PrismaLike = prisma) {
  return client.moneyRecord.update({
    where: { id },
    data: {
      ...input,
      currency: input.currency ? input.currency.toUpperCase() : undefined
    }
  });
}

export interface ListRecordsFilters {
  workspaceId: string;
  types?: MoneyRecordType[];
  statuses?: MoneyRecordStatus[];
  from?: Date;
  to?: Date;
  counterparty?: string;
  /** Free-text query against title, notes, counterparty, merchant (ILIKE). */
  q?: string;
  take?: number;
  skip?: number;
}

/**
 * List records for a workspace with common filters. Uses case-insensitive
 * substring matching for `q` (Postgres ILIKE via Prisma's `contains`
 * with `mode: "insensitive"`).
 */
export function listRecords(filters: ListRecordsFilters, client: PrismaLike = prisma) {
  const where: Prisma.MoneyRecordWhereInput = {
    workspaceId: filters.workspaceId
  };

  if (filters.types?.length) {
    where.type = { in: filters.types };
  }

  if (filters.statuses?.length) {
    where.status = { in: filters.statuses };
  }

  if (filters.from || filters.to) {
    where.occurredAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {})
    };
  }

  if (filters.counterparty) {
    where.counterpartyName = {
      contains: filters.counterparty,
      mode: "insensitive"
    };
  }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { notes: { contains: filters.q, mode: "insensitive" } },
      { counterpartyName: { contains: filters.q, mode: "insensitive" } },
      { merchant: { contains: filters.q, mode: "insensitive" } }
    ];
  }

  return client.moneyRecord.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: filters.take ?? 100,
    skip: filters.skip ?? 0
  });
}

export interface BalancesResult {
  spentThisMonth: number;
  incomeThisMonth: number;
  netFlow: number;
  owedToYou: number;
  youOwe: number;
  overdueCount: number;
}

/**
 * Compute the dashboard balances for a set of workspaces using only
 * MoneyRecord data. Safe to call even when no records exist yet —
 * returns zeroed totals. Excludes TRANSFER from spend/income.
 */
export async function getBalances(workspaceIds: string[], now: Date = new Date()): Promise<BalancesResult> {
  if (workspaceIds.length === 0) {
    return {
      spentThisMonth: 0,
      incomeThisMonth: 0,
      netFlow: 0,
      owedToYou: 0,
      youOwe: 0,
      overdueCount: 0
    };
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [records, openDebts, overdueCount] = await Promise.all([
    prisma.moneyRecord.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        occurredAt: { gte: monthStart },
        type: { in: [MoneyRecordType.EXPENSE, MoneyRecordType.INCOME, MoneyRecordType.SPLIT_EXPENSE, MoneyRecordType.REIMBURSEMENT] }
      },
      select: { type: true, amount: true }
    }),
    prisma.moneyRecord.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        type: { in: [MoneyRecordType.DEBT_GIVEN, MoneyRecordType.DEBT_BORROWED] },
        status: { in: [MoneyRecordStatus.PENDING, MoneyRecordStatus.PARTIAL, MoneyRecordStatus.OVERDUE] }
      },
      select: { type: true, amount: true, amountPaid: true }
    }),
    prisma.moneyRecord.count({
      where: {
        workspaceId: { in: workspaceIds },
        status: MoneyRecordStatus.OVERDUE
      }
    })
  ]);

  const spentThisMonth = records
    .filter((r) => r.type === MoneyRecordType.EXPENSE || r.type === MoneyRecordType.SPLIT_EXPENSE)
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const incomeThisMonth = records
    .filter((r) => r.type === MoneyRecordType.INCOME || r.type === MoneyRecordType.REIMBURSEMENT)
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const owedToYou = openDebts
    .filter((d) => d.type === MoneyRecordType.DEBT_GIVEN)
    .reduce((sum, d) => sum + Math.max(Number(d.amount) - Number(d.amountPaid), 0), 0);

  const youOwe = openDebts
    .filter((d) => d.type === MoneyRecordType.DEBT_BORROWED)
    .reduce((sum, d) => sum + Math.max(Number(d.amount) - Number(d.amountPaid), 0), 0);

  return {
    spentThisMonth,
    incomeThisMonth,
    netFlow: incomeThisMonth - spentThisMonth,
    owedToYou,
    youOwe,
    overdueCount
  };
}

/**
 * Remaining balance on a debt/record: amount − amountPaid, floor at 0.
 */
export function balanceRemaining(
  amount: Prisma.Decimal | number | string,
  amountPaid: Prisma.Decimal | number | string
): number {
  return Math.max(Number(amount) - Number(amountPaid), 0);
}

/**
 * Convenience wrappers around the legacy→unified mappers for dual-write
 * callers in the Transaction and Debt API routes.
 */
export function createRecordFromTransaction(
  tx: TransactionToRecordInput,
  client: PrismaLike = prisma
) {
  return client.moneyRecord.create({
    data: transactionToRecordData(tx)
  });
}

export function createRecordFromDebt(
  debt: DebtToRecordInput,
  client: PrismaLike = prisma
) {
  return client.moneyRecord.create({
    data: debtToRecordData(debt)
  });
}
