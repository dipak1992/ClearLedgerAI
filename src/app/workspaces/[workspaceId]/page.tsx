import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Users } from "lucide-react";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { formatCurrency } from "@/lib/utils";
import { AppShell } from "@/components/shell";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { AddTransactionDialog } from "@/components/dashboard/add-transaction-dialog";
import { ManageWorkspaceDialog } from "@/components/dashboard/manage-workspace-dialog";

export const dynamic = "force-dynamic";

type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER" | "REIMBURSEMENT";

function typeBadgeClass(type: TransactionType) {
  switch (type) {
    case "INCOME":        return "bg-emerald-500/15 text-emerald-400";
    case "TRANSFER":      return "bg-blue-500/15 text-blue-400";
    case "REIMBURSEMENT": return "bg-yellow-500/15 text-yellow-400";
    default:              return "bg-red-500/15 text-red-400";
  }
}

function typeLabel(type: TransactionType) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export default async function WorkspaceLedgerPage({
  params
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getRequestUser();
  if (!user) redirect("/sign-in");

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    include: { workspace: true }
  });
  if (!membership) notFound();

  const workspace = membership.workspace;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [transactions, memberCount] = await Promise.all([
    prisma.transaction.findMany({
      where: { workspaceId },
      orderBy: { transactionDate: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        merchant: true,
        amount: true,
        transactionType: true,
        transactionDate: true,
      },
    }),
    prisma.workspaceMember.count({ where: { workspaceId } })
  ]);

  const monthlySpent = transactions
    .filter((t) => t.transactionType === "EXPENSE" && t.transactionDate >= monthStart)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthlyIncome = transactions
    .filter((t) => t.transactionType === "INCOME" && t.transactionDate >= monthStart)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const workspaceList = [{ id: workspace.id, name: workspace.name }];

  return (
    <AppShell topBarRight={<SignOutButton />}>
      <div className="mx-auto w-full max-w-7xl">

        {/* Back + title */}
        <div className="mb-8">
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
            href="/dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{workspace.name}</h1>
              {workspace.description && (
                <p className="mt-1.5 text-sm text-white/50">{workspace.description}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ManageWorkspaceDialog
                redirectTo="/dashboard"
                triggerClassName="w-full sm:w-auto"
                triggerContent={
                  <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
                    <Pencil className="h-4 w-4" />
                    Edit Workspace
                  </span>
                }
                workspace={{
                  id: workspace.id,
                  name: workspace.name,
                  description: workspace.description
                }}
              />
              <Link
                href={`/workspaces/${workspaceId}/shared`}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                <Users className="h-4 w-4" />
                Members ({memberCount})
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="card-surface rounded-[1.75rem] p-6">
            <p className="text-sm text-white/50">Monthly spent</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(monthlySpent)}</p>
            <p className="mt-1.5 text-xs text-white/40">
              {now.toLocaleString("default", { month: "long" })} expenses
            </p>
          </article>

          <article className="card-surface rounded-[1.75rem] p-6">
            <p className="text-sm text-white/50">Monthly income</p>
            <p className="mt-3 text-3xl font-semibold text-emerald-400">{formatCurrency(monthlyIncome)}</p>
            <p className="mt-1.5 text-xs text-white/40">
              {now.toLocaleString("default", { month: "long" })} income
            </p>
          </article>

          <article className="card-surface rounded-[1.75rem] p-6">
            <p className="text-sm text-white/50">Transactions</p>
            <p className="mt-3 text-3xl font-semibold text-white">{transactions.length}</p>
            <p className="mt-1.5 text-xs text-white/40">Last 50 shown</p>
          </article>

          <article className="card-surface rounded-[1.75rem] p-6">
            <p className="text-sm text-white/50">Members</p>
            <p className="mt-3 text-3xl font-semibold text-white">{memberCount}</p>
            <p className="mt-1.5 text-xs text-white/40">
              <Link href={`/workspaces/${workspaceId}/shared`} className="text-[var(--brand-500)] hover:underline">
                Manage →
              </Link>
            </p>
          </article>
        </section>

        {/* Transactions */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Transactions</h2>
            <AddTransactionDialog defaultWorkspaceId={workspaceId} workspaces={workspaceList} />
          </div>

          {transactions.length === 0 ? (
            <div className="card-surface flex flex-col items-center gap-4 rounded-[1.75rem] py-16 text-center">
              <p className="text-white/60">No transactions yet. Add one to get started.</p>
            </div>
          ) : (
            <div className="card-surface overflow-hidden rounded-[1.75rem]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="px-6 py-4 text-left font-medium text-white/40">Description</th>
                    <th className="hidden px-4 py-4 text-left font-medium text-white/40 md:table-cell">Date</th>
                    <th className="px-4 py-4 text-left font-medium text-white/40">Type</th>
                    <th className="px-6 py-4 text-right font-medium text-white/40">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr
                      className={`transition hover:bg-white/4 ${i < transactions.length - 1 ? "border-b border-white/5" : ""}`}
                      key={tx.id}
                    >
                      <td className="px-6 py-4">
                        <Link href={`/transactions/${tx.id}`} className="hover:text-[var(--brand-500)] transition-colors">
                          <p className="font-medium text-white">{tx.title}</p>
                          {tx.merchant && <p className="text-xs text-white/40">{tx.merchant}</p>}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-4 text-white/60 md:table-cell">
                        {new Date(tx.transactionDate).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric"
                        })}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadgeClass(tx.transactionType as TransactionType)}`}>
                          {typeLabel(tx.transactionType as TransactionType)}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold tabular-nums ${tx.transactionType === "INCOME" ? "text-emerald-400" : "text-white"}`}>
                        {tx.transactionType === "INCOME" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </AppShell>
  );
}
