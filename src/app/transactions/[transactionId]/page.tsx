import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { formatCurrency } from "@/lib/utils";
import { AppShell, Card } from "@/components/shell";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export const dynamic = "force-dynamic";

const TYPE_COLOR: Record<string, string> = {
  EXPENSE: "bg-red-500/15 text-red-400",
  INCOME: "bg-emerald-500/15 text-emerald-400",
  TRANSFER: "bg-blue-500/15 text-blue-400",
  REIMBURSEMENT: "bg-yellow-500/15 text-yellow-400"
};

const TYPE_AMOUNT_COLOR: Record<string, string> = {
  EXPENSE: "text-red-400",
  INCOME: "text-emerald-400",
  TRANSFER: "text-white",
  REIMBURSEMENT: "text-emerald-400"
};

const TYPE_SIGN: Record<string, string> = {
  EXPENSE: "-",
  INCOME: "+",
  TRANSFER: "",
  REIMBURSEMENT: "+"
};

export default async function TransactionDetailPage({
  params
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = await params;
  const user = await getRequestUser();
  if (!user) redirect("/sign-in");

  // Phase 9: look up by MoneyRecord first, fall back to Transaction table
  // so that both new and backfilled records resolve correctly.
  let record: {
    id: string;
    title: string | null;
    amount: number;
    currency: string;
    type: string;
    merchant: string | null;
    paymentMethod: string | null;
    notes: string | null;
    occurredAt: Date;
    workspaceId: string;
    workspaceName: string;
    category: string | null;
  } | null = null;

  const moneyRecord = await prisma.moneyRecord.findUnique({
    where: { id: transactionId },
    include: { category: { select: { name: true } }, workspace: { select: { name: true } } }
  });

  if (moneyRecord) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: moneyRecord.workspaceId, userId: user.id }
    });
    if (!membership) notFound();

    const typeStr = moneyRecord.type.toString();
    const normalizedType = typeStr === "DEBT_GIVEN" || typeStr === "DEBT_BORROWED"
      ? "EXPENSE"
      : typeStr;

    record = {
      id: moneyRecord.id,
      title: moneyRecord.title ?? moneyRecord.counterpartyName ?? "Untitled",
      amount: Number(moneyRecord.amount),
      currency: moneyRecord.currency,
      type: normalizedType,
      merchant: moneyRecord.merchant,
      paymentMethod: moneyRecord.paymentMethod,
      notes: moneyRecord.notes,
      occurredAt: moneyRecord.occurredAt,
      workspaceId: moneyRecord.workspaceId,
      workspaceName: moneyRecord.workspace.name,
      category: moneyRecord.category?.name ?? null
    };
  } else {
    // Fall back to legacy Transaction table
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        category: { select: { name: true } },
        workspace: { select: { name: true } }
      }
    });
    if (!tx) notFound();

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: tx.workspaceId, userId: user.id }
    });
    if (!membership) notFound();

    record = {
      id: tx.id,
      title: tx.title,
      amount: Number(tx.amount),
      currency: tx.currency,
      type: tx.transactionType,
      merchant: tx.merchant,
      paymentMethod: tx.paymentMethod,
      notes: tx.notes,
      occurredAt: tx.transactionDate,
      workspaceId: tx.workspaceId,
      workspaceName: tx.workspace.name,
      category: tx.category?.name ?? null
    };
  }

  const amountColor = TYPE_AMOUNT_COLOR[record.type] ?? "text-white";
  const badgeClass = TYPE_COLOR[record.type] ?? "bg-white/10 text-white/60";
  const sign = TYPE_SIGN[record.type] ?? "";
  const typeLabel = record.type.charAt(0) + record.type.slice(1).toLowerCase();

  return (
    <AppShell topBarRight={<SignOutButton />}>
      <div className="mx-auto w-full max-w-2xl">
        {/* Back link */}
        <Link
          href={`/workspaces/${record.workspaceId}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {record.workspaceName}
        </Link>

        {/* Amount hero */}
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.15em] text-white/40">Transaction</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            {record.title}
          </h1>
          <p className={`mt-2 text-5xl font-bold tabular-nums ${amountColor}`}>
            {sign}{formatCurrency(record.amount)}
          </p>
        </div>

        {/* Detail card */}
        <Card>
          <dl className="divide-y divide-white/5">
            <DetailRow label="Type">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
                {typeLabel}
              </span>
            </DetailRow>

            <DetailRow label="Date">
              {record.occurredAt.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </DetailRow>

            <DetailRow label="Currency">{record.currency}</DetailRow>

            {record.merchant && (
              <DetailRow label="Merchant">{record.merchant}</DetailRow>
            )}

            {record.category && (
              <DetailRow label="Category">{record.category}</DetailRow>
            )}

            {record.paymentMethod && (
              <DetailRow label="Payment method">{record.paymentMethod}</DetailRow>
            )}

            <DetailRow label="Workspace">
              <Link
                href={`/workspaces/${record.workspaceId}`}
                className="text-[var(--brand-500)] hover:underline"
              >
                {record.workspaceName}
              </Link>
            </DetailRow>
          </dl>
        </Card>

        {/* Notes */}
        {record.notes && (
          <Card className="mt-4">
            <h2 className="mb-2 text-sm font-semibold text-white/50 uppercase tracking-wider">Notes</h2>
            <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{record.notes}</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-sm text-white/40">{label}</dt>
      <dd className="text-right text-sm font-medium text-white">{children}</dd>
    </div>
  );
}
