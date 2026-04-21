import { redirect } from "next/navigation";
import Link from "next/link";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { formatCurrency } from "@/lib/utils";
import { AppNav } from "@/components/layout/app-nav";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { AddDebtDialog } from "@/components/dashboard/add-debt-dialog";
import { DebtTable, type DebtRow } from "@/components/debts/debt-table";

export default async function DebtsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/sign-in");

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    select: { workspaceId: true, workspace: { select: { id: true, name: true } } },
  });

  const workspaceIds = memberships.map((m) => m.workspaceId);
  const workspaceList = memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
  }));

  const debts = workspaceIds.length
    ? await prisma.debt.findMany({
        where: { workspaceId: { in: workspaceIds } },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      })
    : [];

  const rows: DebtRow[] = debts.map((d) => ({
    id: d.id,
    counterpartyName: d.counterpartyName,
    amountTotal: Number(d.amountTotal),
    amountPaid: Number(d.amountPaid),
    balanceRemaining: Number(d.balanceRemaining),
    type: d.type,
    status: d.status,
    purpose: d.purpose ?? null,
    dueDate: d.dueDate ? d.dueDate.toISOString() : null,
    currency: d.currency,
  }));

  const owedToYou = rows
    .filter(
      (d) =>
        ["LENT", "CUSTOMER_UNPAID", "REIMBURSEMENT_PENDING"].includes(d.type) &&
        d.status !== "PAID"
    )
    .reduce((sum, d) => sum + d.balanceRemaining, 0);

  const youOwe = rows
    .filter(
      (d) =>
        ["BORROWED", "ADVANCE_PAYMENT"].includes(d.type) && d.status !== "PAID"
    )
    .reduce((sum, d) => sum + d.balanceRemaining, 0);

  const overdueCount = rows.filter((d) => d.status === "OVERDUE").length;
  const openCount = rows.filter((d) => d.status !== "PAID").length;

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

        {/* Page title */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Debt Tracker</h1>
            <p className="mt-1.5 text-[var(--muted)]">
              Track what you owe and what others owe you.
            </p>
          </div>
          <AddDebtDialog
            defaultWorkspaceId={workspaceList[0]?.id}
            workspaces={workspaceList}
          />
        </div>

        {/* Summary cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="card-surface rounded-[1.75rem] p-6">
            <p className="text-sm text-white/50">Owed to you</p>
            <p className="mt-3 text-3xl font-semibold text-emerald-400">
              {formatCurrency(owedToYou)}
            </p>
            <p className="mt-1.5 text-xs text-[var(--muted)]">Lent + customer + reimbursements</p>
          </article>

          <article className="card-surface rounded-[1.75rem] p-6">
            <p className="text-sm text-white/50">You owe</p>
            <p className="mt-3 text-3xl font-semibold text-red-400">
              {formatCurrency(youOwe)}
            </p>
            <p className="mt-1.5 text-xs text-[var(--muted)]">Borrowed + advances pending</p>
          </article>

          <article className="card-surface rounded-[1.75rem] p-6">
            <p className="text-sm text-white/50">Overdue</p>
            <p className={`mt-3 text-3xl font-semibold ${overdueCount > 0 ? "text-red-400" : "text-white"}`}>
              {overdueCount}
            </p>
            <p className="mt-1.5 text-xs text-[var(--muted)]">Past due date</p>
          </article>

          <article className="card-surface rounded-[1.75rem] p-6">
            <p className="text-sm text-white/50">Open debts</p>
            <p className="mt-3 text-3xl font-semibold text-white">{openCount}</p>
            <p className="mt-1.5 text-xs text-[var(--muted)]">Unpaid or partially paid</p>
          </article>
        </section>

        {/* Debt table */}
        <DebtTable debts={rows} />

      </div>
    </main>
  );
}
