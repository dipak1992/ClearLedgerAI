import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Clock3, Wallet, FolderOpen } from "lucide-react";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { formatCurrency } from "@/lib/utils";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { AddTransactionDialog } from "@/components/dashboard/add-transaction-dialog";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

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

export default async function DashboardPage() {
  const user = await getRequestUser();
  if (!user) redirect("/sign-in");

  // fetch all workspace memberships for this user
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: {
      workspace: {
        include: {
          _count: { select: { transactions: true } }
        }
      }
    },
    orderBy: { workspace: { createdAt: "asc" } }
  });

  const workspaces = memberships.map((m) => m.workspace);

  // fetch recent transactions across all user workspaces
  const workspaceIds = workspaces.map((w) => w.id);
  const recentTransactions = workspaceIds.length
    ? await prisma.transaction.findMany({
        where: { workspaceId: { in: workspaceIds } },
        orderBy: { transactionDate: "desc" },
        take: 20,
        include: { workspace: { select: { name: true } } }
      })
    : [];

  // stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalSpentThisMonth = recentTransactions
    .filter((t) => t.transactionType === "EXPENSE" && t.transactionDate >= monthStart)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalIncomeThisMonth = recentTransactions
    .filter((t) => t.transactionType === "INCOME" && t.transactionDate >= monthStart)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const workspaceList = workspaces.map((ws) => ({ id: ws.id, name: ws.name }));
  const defaultWorkspaceId = workspaces[0]?.id;

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/40">Dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Welcome back, {user.name?.split(" ")[0] ?? "there"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AddTransactionDialog
              defaultWorkspaceId={defaultWorkspaceId}
              workspaces={workspaceList}
            />
            <CreateWorkspaceDialog />
            <SignOutButton />
          </div>
        </header>

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="card-surface rounded-[1.75rem] p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">Spent this month</p>
              <Wallet className="h-5 w-5 text-[var(--brand-500)]" />
            </div>
            <p className="mt-4 text-4xl font-semibold text-white">{formatCurrency(totalSpentThisMonth)}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Expenses in {now.toLocaleString("default", { month: "long" })}</p>
          </article>

          <article className="card-surface rounded-[1.75rem] p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">Income this month</p>
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="mt-4 text-4xl font-semibold text-emerald-400">{formatCurrency(totalIncomeThisMonth)}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">All income transactions</p>
          </article>

          <article className="card-surface rounded-[1.75rem] p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">Total transactions</p>
              <Clock3 className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <p className="mt-4 text-4xl font-semibold text-white">
              {recentTransactions.length}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">Across {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}</p>
          </article>
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
                  <p className="font-semibold group-hover:text-[var(--brand-500)] transition-colors">{ws.name}</p>
                  {ws.description && (
                    <p className="text-sm text-[var(--muted)] line-clamp-2">{ws.description}</p>
                  )}
                  <p className="mt-auto pt-3 text-xs text-white/40">
                    {ws._count.transactions} transaction{ws._count.transactions !== 1 ? "s" : ""}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

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
                  : "No transactions yet. Click \"+ Add Transaction\" to get started."}
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
                      <td className="hidden px-4 py-4 text-white/60 sm:table-cell">{tx.workspace.name}</td>
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

        {/* Quick nav */}
        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { href: "/debts", label: "Debt Tracker" },
            { href: "/reports", label: "Reports" },
            { href: "/settings", label: "Settings" }
          ].map((item) => (
            <Link
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </section>

      </div>
    </main>
  );
}