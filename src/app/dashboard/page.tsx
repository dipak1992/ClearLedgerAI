import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Clock3, Wallet, FolderOpen, TrendingDown, TrendingUp } from "lucide-react";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { formatCurrency } from "@/lib/utils";
import { flags } from "@/lib/flags";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { AddTransactionDialog } from "@/components/dashboard/add-transaction-dialog";
import { AddDebtDialog } from "@/components/dashboard/add-debt-dialog";
import { AiImportWidget } from "@/components/dashboard/ai-import-widget";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { AppNav } from "@/components/layout/app-nav";
import { AppShell } from "@/components/shell";

import { DashboardV2 } from "./dashboard-v2";

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

function getGreeting() {
  const h = new Date().getUTCHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await getRequestUser();
  if (!user) redirect("/sign-in");

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: {
      workspace: {
        include: { _count: { select: { transactions: true } } }
      }
    },
    orderBy: { workspace: { createdAt: "asc" } }
  });

  const workspaces = memberships.map((m) => m.workspace);
  const workspaceIds = workspaces.map((w) => w.id);

  // Phase 3: action-first dashboard wrapped in the mobile-first shell.
  // Opt-in via NEXT_PUBLIC_FLAG_MONEY_RECORDS; falls back to the
  // original layout when the flag is off so behavior is identical for
  // existing users until we flip it.
  if (flags.moneyRecords || flags.mobileNav) {
    return (
      <AppShell topBarRight={<SignOutButton />}>
        <DashboardV2 user={{ id: user.id, name: user.name ?? null }} workspaces={workspaces} />
      </AppShell>
    );
  }

  const [recentTransactions, openDebts] = await Promise.all([
    workspaceIds.length
      ? prisma.transaction.findMany({
          where: { workspaceId: { in: workspaceIds } },
          orderBy: { transactionDate: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            merchant: true,
            amount: true,
            transactionType: true,
            transactionDate: true,
            workspace: { select: { name: true } }
          }
        })
      : Promise.resolve([]),
    workspaceIds.length
      ? prisma.debt.findMany({
          where: {
            workspaceId: { in: workspaceIds },
            status: { in: ["OPEN", "PARTIAL", "OVERDUE"] }
          },
          select: {
            id: true,
            type: true,
            status: true,
            balanceRemaining: true,
            dueDate: true,
          }
        })
      : Promise.resolve([]),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalSpentThisMonth = recentTransactions
    .filter((t) => t.transactionType === "EXPENSE" && t.transactionDate >= monthStart)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalIncomeThisMonth = recentTransactions
    .filter((t) => t.transactionType === "INCOME" && t.transactionDate >= monthStart)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const netFlow = totalIncomeThisMonth - totalSpentThisMonth;

  const owedToYou = openDebts
    .filter((d) => ["LENT", "CUSTOMER_UNPAID", "REIMBURSEMENT_PENDING"].includes(d.type))
    .reduce((sum, d) => sum + Number(d.balanceRemaining), 0);

  const youOwe = openDebts
    .filter((d) => ["BORROWED", "ADVANCE_PAYMENT"].includes(d.type))
    .reduce((sum, d) => sum + Number(d.balanceRemaining), 0);

  const overdueCount = openDebts.filter((d) => d.status === "OVERDUE").length;

  const workspaceList = workspaces.map((ws) => ({ id: ws.id, name: ws.name }));
  const defaultWorkspaceId = workspaces[0]?.id;
  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">

        {/* Top bar */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link
            className="text-xl font-bold tracking-tight text-[var(--brand-500)]"
            href="/dashboard"
          >
            ClearLedger
          </Link>
          <AppNav />
          <SignOutButton />
        </header>

        {/* Greeting */}
        <section className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="mt-1.5 text-[var(--muted)]">
            {netFlow >= 0
              ? `You're ${formatCurrency(netFlow)} ahead this month.`
              : `You're ${formatCurrency(Math.abs(netFlow))} over budget this month.`}
          </p>
        </section>

        {/* AI Import Banner */}
        <section className="mb-6 card-surface rounded-[1.75rem] p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">✦ AI Import</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              Turn screenshots into clean money records instantly.
            </h2>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-8 flex flex-wrap gap-3">
          <AddTransactionDialog
            defaultType="EXPENSE"
            defaultWorkspaceId={defaultWorkspaceId}
            triggerLabel="+ Expense"
            workspaces={workspaceList}
          />
          <AddTransactionDialog
            defaultType="INCOME"
            defaultWorkspaceId={defaultWorkspaceId}
            triggerLabel="+ Income"
            workspaces={workspaceList}
          />
          <AddTransactionDialog
            defaultType="TRANSFER"
            defaultWorkspaceId={defaultWorkspaceId}
            triggerLabel="+ Transfer"
            workspaces={workspaceList}
          />
          <AddDebtDialog
            defaultWorkspaceId={defaultWorkspaceId}
            workspaces={workspaceList}
          />
          <AiImportWidget
            defaultWorkspaceId={defaultWorkspaceId}
            workspaces={workspaceList}
          />
          <CreateWorkspaceDialog />
        </section>

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="card-surface rounded-[1.75rem] p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">Spent this month</p>
              <Wallet className="h-5 w-5 text-red-400" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-white">
              {formatCurrency(totalSpentThisMonth)}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Expenses in {now.toLocaleString("default", { month: "long" })}
            </p>
          </article>

          <article className="card-surface rounded-[1.75rem] p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">Income this month</p>
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-emerald-400">
              {formatCurrency(totalIncomeThisMonth)}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">All income transactions</p>
          </article>

          <article className="card-surface rounded-[1.75rem] p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">Net flow</p>
              {netFlow >= 0
                ? <TrendingUp className="h-5 w-5 text-[var(--brand-500)]" />
                : <TrendingDown className="h-5 w-5 text-red-400" />
              }
            </div>
            <p className={`mt-4 text-3xl font-semibold ${netFlow >= 0 ? "text-[var(--brand-500)]" : "text-red-400"}`}>
              {netFlow >= 0 ? "+" : "-"}{formatCurrency(Math.abs(netFlow))}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">Income minus expenses</p>
          </article>

          <article className="card-surface rounded-[1.75rem] p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">Open debts</p>
              <Clock3 className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-white">
              {openDebts.length}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {overdueCount > 0 ? (
                <span className="text-red-400">{overdueCount} overdue</span>
              ) : (
                "No overdue items"
              )}
            </p>
          </article>
        </section>

        {/* Debt Snapshot */}
        {(owedToYou > 0 || youOwe > 0) && (
          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            {owedToYou > 0 && (
              <article className="card-surface rounded-[1.75rem] p-6">
                <p className="text-sm text-white/50">Owed to you</p>
                <p className="mt-3 text-3xl font-semibold text-emerald-400">
                  {formatCurrency(owedToYou)}
                </p>
                <p className="mt-2 text-xs text-[var(--muted)]">Lent + customer + reimbursements</p>
                <Link
                  className="mt-4 inline-block text-xs font-medium text-[var(--brand-500)] hover:underline"
                  href="/debts"
                >
                  View all debts →
                </Link>
              </article>
            )}
            {youOwe > 0 && (
              <article className="card-surface rounded-[1.75rem] p-6">
                <p className="text-sm text-white/50">You owe</p>
                <p className="mt-3 text-3xl font-semibold text-red-400">
                  {formatCurrency(youOwe)}
                </p>
                <p className="mt-2 text-xs text-[var(--muted)]">Borrowed + advances pending</p>
                <Link
                  className="mt-4 inline-block text-xs font-medium text-[var(--brand-500)] hover:underline"
                  href="/debts"
                >
                  View all debts →
                </Link>
              </article>
            )}
          </section>
        )}

        {/* Recent Transactions */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
            <AddTransactionDialog
              defaultWorkspaceId={defaultWorkspaceId}
              workspaces={workspaceList}
            />
          </div>

          {recentTransactions.length === 0 ? (
            <div className="card-surface flex flex-col items-center gap-4 rounded-[1.75rem] py-16 text-center">
              <p className="text-white/60">
                {workspaces.length === 0
                  ? "Create a workspace first, then add transactions."
                  : "No transactions yet. Use the quick actions above to get started."}
              </p>
            </div>
          ) : (
            <div className="card-surface overflow-hidden rounded-[1.75rem]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="px-6 py-4 text-left font-medium text-white/40">Description</th>
                    <th className="hidden px-4 py-4 text-left font-medium text-white/40 sm:table-cell">Workspace</th>
                    <th className="hidden px-4 py-4 text-left font-medium text-white/40 md:table-cell">Date</th>
                    <th className="px-4 py-4 text-left font-medium text-white/40">Type</th>
                    <th className="px-6 py-4 text-right font-medium text-white/40">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx, i) => (
                    <tr
                      className={`transition hover:bg-white/4 ${i < recentTransactions.length - 1 ? "border-b border-white/5" : ""}`}
                      key={tx.id}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{tx.title}</p>
                        {tx.merchant && <p className="text-xs text-white/40">{tx.merchant}</p>}
                      </td>
                      <td className="hidden px-4 py-4 text-white/60 sm:table-cell">
                        {tx.workspace.name}
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

        {/* Workspaces */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Workspaces</h2>
            <CreateWorkspaceDialog />
          </div>

          {workspaces.length === 0 ? (
            <div className="card-surface flex flex-col items-center gap-4 rounded-[1.75rem] py-16 text-center">
              <FolderOpen className="h-10 w-10 text-white/20" />
              <p className="text-white/60">No workspaces yet. Create one to start tracking money.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((ws) => (
                <Link
                  className="card-surface group flex flex-col gap-2 rounded-[1.75rem] p-6 transition hover:border-[var(--brand-500)]/40"
                  href={`/workspaces/${ws.id}`}
                  key={ws.id}
                >
                  <p className="font-semibold transition-colors group-hover:text-[var(--brand-500)]">
                    {ws.name}
                  </p>
                  {ws.description && (
                    <p className="line-clamp-2 text-sm text-[var(--muted)]">{ws.description}</p>
                  )}
                  <p className="mt-auto pt-3 text-xs text-white/40">
                    {ws._count.transactions} transaction{ws._count.transactions !== 1 ? "s" : ""}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}