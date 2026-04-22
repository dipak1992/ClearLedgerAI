import { redirect } from "next/navigation";
import Link from "next/link";
import { LineChart, TrendingDown, TrendingUp, Wallet, ArrowUpRight } from "lucide-react";

import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { formatCurrency } from "@/lib/utils";
import { AppShell, Card, StatTile } from "@/components/shell";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { WorkspaceExportTrigger } from "@/components/dashboard/workspace-export-trigger";

export const dynamic = "force-dynamic";

interface MonthSummary {
  key: string;
  label: string;
  spent: number;
  income: number;
}

export default async function InsightsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/sign-in");

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    select: { workspaceId: true, workspace: { select: { name: true } } }
  });
  const workspaceIds = memberships.map((m) => m.workspaceId);

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [transactions, openDebts] = await Promise.all([
    workspaceIds.length
      ? prisma.transaction.findMany({
          where: {
            workspaceId: { in: workspaceIds },
            transactionDate: { gte: twelveMonthsAgo }
          },
          select: {
            amount: true,
            transactionType: true,
            transactionDate: true,
            merchant: true,
            title: true,
            category: { select: { name: true } }
          },
          orderBy: { transactionDate: "asc" }
        })
      : Promise.resolve([]),
    workspaceIds.length
      ? prisma.debt.findMany({
          where: {
            workspaceId: { in: workspaceIds },
            status: { in: ["OPEN", "PARTIAL", "OVERDUE"] }
          },
          select: {
            status: true,
            balanceRemaining: true,
            type: true,
            dueDate: true,
            counterpartyName: true,
            amountTotal: true,
            amountPaid: true
          }
        })
      : Promise.resolve([])
  ]);

  // Build 12-month map
  const monthMap = new Map<string, MonthSummary>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short", year: "numeric" });
    monthMap.set(key, { key, label, spent: 0, income: 0 });
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
  const maxBar = Math.max(...months.map((m) => Math.max(m.spent, m.income)), 1);

  // Category breakdown (current month)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const catMap = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.transactionType !== "EXPENSE") continue;
    if (new Date(tx.transactionDate) < monthStart) continue;
    const cat = tx.category?.name ?? "Uncategorized";
    catMap.set(cat, (catMap.get(cat) ?? 0) + Number(tx.amount));
  }
  const topCategories = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxCat = Math.max(...topCategories.map(([, v]) => v), 1);

  // Top merchants (all-time in window)
  const merchantMap = new Map<string, { total: number; count: number }>();
  for (const tx of transactions) {
    if (tx.transactionType !== "EXPENSE") continue;
    const key = tx.merchant ?? tx.title;
    const e = merchantMap.get(key) ?? { total: 0, count: 0 };
    e.total += Number(tx.amount);
    e.count += 1;
    merchantMap.set(key, e);
  }
  const topMerchants = [...merchantMap.entries()]
    .map(([merchant, v]) => ({ merchant, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const maxMerchant = Math.max(...topMerchants.map((m) => m.total), 1);

  // Debt aging buckets
  const overdueDebts = openDebts.filter((d) => d.status === "OVERDUE");
  const dueSoon = openDebts.filter((d) => d.dueDate && d.dueDate > now && d.dueDate <= new Date(now.getTime() + 30 * 24 * 3600 * 1000));
  const owedToYou = openDebts
    .filter((d) => ["LENT", "CUSTOMER_UNPAID", "REIMBURSEMENT_PENDING"].includes(d.type))
    .reduce((s, d) => s + Number(d.balanceRemaining), 0);
  const youOwe = openDebts
    .filter((d) => ["BORROWED", "ADVANCE_PAYMENT"].includes(d.type))
    .reduce((s, d) => s + Number(d.balanceRemaining), 0);

  // Overall stats
  const totalSpent = months.reduce((s, m) => s + m.spent, 0);
  const totalIncome = months.reduce((s, m) => s + m.income, 0);
  const avgMonthlySpend = totalSpent / 12;
  const currentMonthSpend = months[11]?.spent ?? 0;
  const spendTrend = avgMonthlySpend > 0 ? ((currentMonthSpend - avgMonthlySpend) / avgMonthlySpend) * 100 : 0;

  // Subscription detector: same merchant, same amount, appears in 3+ consecutive months
  const subCandidates: { merchant: string; amount: number; months: number }[] = [];
  const subMap = new Map<string, Map<string, number>>();
  for (const tx of transactions) {
    if (tx.transactionType !== "EXPENSE" || !tx.merchant) continue;
    const d = new Date(tx.transactionDate);
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const amtKey = `${tx.merchant.toLowerCase()}|${Math.round(Number(tx.amount) * 100)}`;
    const mSet = subMap.get(amtKey) ?? new Map<string, number>();
    mSet.set(mKey, (mSet.get(mKey) ?? 0) + 1);
    subMap.set(amtKey, mSet);
  }
  for (const [key, mSet] of subMap) {
    const [merchant, amtCents] = key.split("|");
    if (mSet.size >= 3) {
      subCandidates.push({ merchant, amount: Number(amtCents) / 100, months: mSet.size });
    }
  }
  subCandidates.sort((a, b) => b.months - a.months);

  return (
    <AppShell topBarRight={<SignOutButton />}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">

        {/* Header */}
        <section>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Insights</h1>
          <p className="mt-1 text-sm text-white/50">12-month financial overview, debt aging, and spending patterns.</p>
        </section>

        {/* Top stat tiles */}
        <section className="grid gap-3 sm:grid-cols-4">
          <StatTile
            label="12-month spend"
            value={formatCurrency(totalSpent)}
            icon={<Wallet className="h-5 w-5" />}
            tone="negative"
          />
          <StatTile
            label="12-month income"
            value={formatCurrency(totalIncome)}
            icon={<ArrowUpRight className="h-5 w-5" />}
            tone="positive"
          />
          <StatTile
            label="vs. monthly avg"
            value={`${spendTrend >= 0 ? "+" : ""}${spendTrend.toFixed(1)}%`}
            icon={spendTrend >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            tone={spendTrend > 10 ? "negative" : spendTrend < -5 ? "positive" : "default"}
            hint="This month vs. 12-mo avg"
          />
          <StatTile
            label="Overdue debts"
            value={overdueDebts.length}
            icon={<LineChart className="h-5 w-5" />}
            tone={overdueDebts.length > 0 ? "negative" : "default"}
            hint={dueSoon.length > 0 ? `${dueSoon.length} due in 30 days` : "None due soon"}
          />
        </section>

        {/* 12-month cash flow bar chart */}
        <Card>
          <h2 className="mb-5 text-base font-semibold">12-Month Cash Flow</h2>
          {months.every((m) => m.spent === 0 && m.income === 0) ? (
            <p className="text-center text-sm text-white/40 py-8">No transaction data yet.</p>
          ) : (
            <>
              <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ minHeight: 140 }}>
                {months.map((m) => (
                  <div className="flex min-w-[44px] flex-1 flex-col items-center gap-1" key={m.key}>
                    <div className="flex w-full items-end gap-0.5" style={{ height: "120px" }}>
                      <div
                        className="flex-1 rounded-t bg-red-400/60 transition-all"
                        style={{ height: `${(m.spent / maxBar) * 100}%`, minHeight: m.spent > 0 ? "3px" : "0" }}
                        title={`Spent: ${formatCurrency(m.spent)}`}
                      />
                      <div
                        className="flex-1 rounded-t bg-emerald-400/60 transition-all"
                        style={{ height: `${(m.income / maxBar) * 100}%`, minHeight: m.income > 0 ? "3px" : "0" }}
                        title={`Income: ${formatCurrency(m.income)}`}
                      />
                    </div>
                    <p className="text-center text-[10px] text-white/40">{m.label.split(" ").at(0) ?? m.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-5 text-xs text-white/50">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/60" />Spent</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400/60" />Income</span>
              </div>
            </>
          )}
        </Card>

        {/* Monthly breakdown table */}
        <Card className="p-0">
          <div className="p-5 pb-3">
            <h2 className="text-base font-semibold">Monthly Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-5 py-3 text-left font-medium text-white/40">Month</th>
                  <th className="px-4 py-3 text-right font-medium text-white/40">Spent</th>
                  <th className="px-4 py-3 text-right font-medium text-white/40">Income</th>
                  <th className="px-5 py-3 text-right font-medium text-white/40">Net</th>
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().map((m, i) => {
                  const net = m.income - m.spent;
                  return (
                    <tr className={`transition hover:bg-white/4 ${i < months.length - 1 ? "border-b border-white/5" : ""}`} key={m.key}>
                      <td className="px-5 py-3.5 font-medium">{m.label}</td>
                      <td className="px-4 py-3.5 text-right text-red-400 tabular-nums">{formatCurrency(m.spent)}</td>
                      <td className="px-4 py-3.5 text-right text-emerald-400 tabular-nums">{formatCurrency(m.income)}</td>
                      <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {net >= 0 ? "+" : "-"}{formatCurrency(Math.abs(net))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Category spend + Top merchants */}
        <section className="grid gap-4 lg:grid-cols-2">
          {/* Category spend this month */}
          <Card>
            <h2 className="mb-4 text-base font-semibold">
              Top Categories — {now.toLocaleString("default", { month: "long" })}
            </h2>
            {topCategories.length === 0 ? (
              <p className="text-sm text-white/40">No expense data this month.</p>
            ) : (
              <div className="space-y-3">
                {topCategories.map(([cat, total]) => (
                  <div className="flex items-center gap-3" key={cat}>
                    <p className="w-28 shrink-0 truncate text-sm">{cat}</p>
                    <div className="relative flex-1 overflow-hidden rounded-full bg-white/8 h-1.5">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full bg-[var(--brand-500)]/70"
                        style={{ width: `${(total / maxCat) * 100}%` }}
                      />
                    </div>
                    <p className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums">
                      {formatCurrency(total)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Top merchants */}
          <Card>
            <h2 className="mb-4 text-base font-semibold">Top Merchants (12 mo)</h2>
            {topMerchants.length === 0 ? (
              <p className="text-sm text-white/40">No merchant data yet.</p>
            ) : (
              <div className="space-y-3">
                {topMerchants.map((m) => (
                  <div className="flex items-center gap-3" key={m.merchant}>
                    <p className="w-28 shrink-0 truncate text-sm">{m.merchant}</p>
                    <div className="relative flex-1 overflow-hidden rounded-full bg-white/8 h-1.5">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full bg-[var(--brand-500)]/70"
                        style={{ width: `${(m.total / maxMerchant) * 100}%` }}
                      />
                    </div>
                    <p className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums">
                      {formatCurrency(m.total)}
                    </p>
                    <p className="w-8 shrink-0 text-right text-xs text-white/40">{m.count}×</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* Debt aging */}
        {openDebts.length > 0 && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Debt Aging</h2>
              <Link href="/debts" className="text-xs text-[var(--brand-500)] hover:underline">
                Manage debts →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white/4 p-4">
                <p className="text-xs text-white/50">Owed to you</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-400">{formatCurrency(owedToYou)}</p>
              </div>
              <div className="rounded-xl bg-white/4 p-4">
                <p className="text-xs text-white/50">You owe</p>
                <p className="mt-2 text-2xl font-semibold text-red-400">{formatCurrency(youOwe)}</p>
              </div>
              <div className="rounded-xl bg-white/4 p-4">
                <p className="text-xs text-white/50">Overdue</p>
                <p className={`mt-2 text-2xl font-semibold ${overdueDebts.length > 0 ? "text-red-400" : "text-white"}`}>
                  {overdueDebts.length} debt{overdueDebts.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Subscription detector */}
        {subCandidates.length > 0 && (
          <Card>
            <h2 className="mb-4 text-base font-semibold">🔁 Detected Subscriptions</h2>
            <p className="mb-3 text-xs text-white/40">Recurring charges found in 3+ months.</p>
            <ul className="divide-y divide-white/5">
              {subCandidates.slice(0, 8).map((s) => (
                <li key={`${s.merchant}|${s.amount}`} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{s.merchant}</p>
                    <p className="text-xs text-white/40">Seen in {s.months} months</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-red-400">
                    {formatCurrency(s.amount)}/mo
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Export link */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Export Data</h2>
              <p className="mt-0.5 text-xs text-white/40">Download polished workspace reports in PDF, Excel, CSV, Word, or Google Sheets.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {memberships.slice(0, 3).map((m) => (
                <WorkspaceExportTrigger
                  key={m.workspaceId}
                  showQuickExport={false}
                  triggerClassName="w-full sm:w-auto"
                  triggerContent={
                    <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/5">
                      Export {m.workspace.name}
                    </span>
                  }
                  workspace={{ id: m.workspaceId, name: m.workspace.name }}
                />
              ))}
            </div>
          </div>
        </Card>

      </div>
    </AppShell>
  );
}
