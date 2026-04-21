import { redirect } from "next/navigation";
import Link from "next/link";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { formatCurrency } from "@/lib/utils";
import { AppNav } from "@/components/layout/app-nav";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

interface MonthSummary {
  label: string;   // e.g. "Jan 2025"
  spent: number;
  income: number;
}

interface MerchantRow {
  merchant: string;
  total: number;
  count: number;
}

export default async function ReportsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/sign-in");

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    select: { workspaceId: true },
  });
  const workspaceIds = memberships.map((m) => m.workspaceId);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const transactions = workspaceIds.length
    ? await prisma.transaction.findMany({
        where: {
          workspaceId: { in: workspaceIds },
          transactionDate: { gte: sixMonthsAgo },
        },
        orderBy: { transactionDate: "asc" },
      })
    : [];

  // Build month → spent/income map
  const monthMap = new Map<string, { label: string; spent: number; income: number }>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short", year: "numeric" });
    monthMap.set(key, { label, spent: 0, income: 0 });
  }

  for (const tx of transactions) {
    const d = new Date(tx.transactionDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key);
    if (!entry) continue;
    if (tx.transactionType === "EXPENSE") entry.spent += Number(tx.amount);
    if (tx.transactionType === "INCOME") entry.income += Number(tx.amount);
  }

  const months: MonthSummary[] = [...monthMap.values()];
  const maxSpent = Math.max(...months.map((m) => m.spent), 1);
  const maxIncome = Math.max(...months.map((m) => m.income), 1);
  const maxBar = Math.max(maxSpent, maxIncome, 1);

  // Top merchants
  const merchantMap = new Map<string, { total: number; count: number }>();
  for (const tx of transactions) {
    if (tx.transactionType !== "EXPENSE") continue;
    const key = tx.merchant ?? tx.title;
    const e = merchantMap.get(key) ?? { total: 0, count: 0 };
    e.total += Number(tx.amount);
    e.count += 1;
    merchantMap.set(key, e);
  }
  const topMerchants: MerchantRow[] = [...merchantMap.entries()]
    .map(([merchant, v]) => ({ merchant, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const maxMerchant = Math.max(...topMerchants.map((m) => m.total), 1);

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
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1.5 text-[var(--muted)]">Last 6 months of spending and income trends.</p>
        </div>

        {/* Bar chart — Spend vs Income */}
        <section className="mb-8 card-surface rounded-[1.75rem] p-6">
          <h2 className="mb-6 text-lg font-semibold">Monthly Spend vs. Income</h2>
          {months.every((m) => m.spent === 0 && m.income === 0) ? (
            <p className="text-center text-white/40 py-8">No transaction data yet.</p>
          ) : (
            <div className="flex items-end gap-3 overflow-x-auto pb-2">
              {months.map((m) => (
                <div className="flex min-w-[60px] flex-1 flex-col items-center gap-1" key={m.label}>
                  <div className="flex w-full items-end gap-0.5" style={{ height: "120px" }}>
                    {/* Spent bar */}
                    <div
                      className="flex-1 rounded-t bg-red-400/60 transition-all"
                      style={{ height: `${(m.spent / maxBar) * 100}%`, minHeight: m.spent > 0 ? "4px" : "0" }}
                      title={`Spent: ${formatCurrency(m.spent)}`}
                    />
                    {/* Income bar */}
                    <div
                      className="flex-1 rounded-t bg-emerald-400/60 transition-all"
                      style={{ height: `${(m.income / maxBar) * 100}%`, minHeight: m.income > 0 ? "4px" : "0" }}
                      title={`Income: ${formatCurrency(m.income)}`}
                    />
                  </div>
                  <p className="text-center text-xs text-white/40">{m.label}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-6 text-xs text-white/50">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/60" /> Spent</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400/60" /> Income</span>
          </div>
        </section>

        {/* Monthly table */}
        <section className="mb-8 card-surface overflow-hidden rounded-[1.75rem]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-6 py-4 text-left font-medium text-white/40">Month</th>
                <th className="px-4 py-4 text-right font-medium text-white/40">Spent</th>
                <th className="px-4 py-4 text-right font-medium text-white/40">Income</th>
                <th className="px-6 py-4 text-right font-medium text-white/40">Net</th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().map((m, i) => {
                const net = m.income - m.spent;
                return (
                  <tr className={`transition hover:bg-white/4 ${i < months.length - 1 ? "border-b border-white/5" : ""}`} key={m.label}>
                    <td className="px-6 py-4 font-medium">{m.label}</td>
                    <td className="px-4 py-4 text-right text-red-400 tabular-nums">{formatCurrency(m.spent)}</td>
                    <td className="px-4 py-4 text-right text-emerald-400 tabular-nums">{formatCurrency(m.income)}</td>
                    <td className={`px-6 py-4 text-right font-semibold tabular-nums ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {net >= 0 ? "+" : "-"}{formatCurrency(Math.abs(net))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Top merchants */}
        {topMerchants.length > 0 && (
          <section className="card-surface rounded-[1.75rem] p-6">
            <h2 className="mb-6 text-lg font-semibold">Top Merchants by Spend</h2>
            <div className="space-y-3">
              {topMerchants.map((m) => (
                <div className="flex items-center gap-4" key={m.merchant}>
                  <p className="w-36 shrink-0 truncate text-sm">{m.merchant}</p>
                  <div className="relative flex-1 overflow-hidden rounded-full bg-white/8 h-2">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-[var(--brand-500)]/70"
                      style={{ width: `${(m.total / maxMerchant) * 100}%` }}
                    />
                  </div>
                  <p className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {formatCurrency(m.total)}
                  </p>
                  <p className="w-10 shrink-0 text-right text-xs text-white/40">{m.count}×</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
