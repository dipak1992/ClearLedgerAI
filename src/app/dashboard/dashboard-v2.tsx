import Link from "next/link";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet
} from "lucide-react";

import { prisma } from "@/lib/server/prisma";
import { formatCurrency } from "@/lib/utils";
import { Card, EmptyState, ListRow, StatTile } from "@/components/shell";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { AddTransactionDialog } from "@/components/dashboard/add-transaction-dialog";
import { AddDebtDialog } from "@/components/dashboard/add-debt-dialog";
import { AiImportWidget } from "@/components/dashboard/ai-import-widget";

interface WorkspaceSummary {
  id: string;
  name: string;
}

export interface DashboardV2Props {
  user: { id: string; name?: string | null };
  workspaces: WorkspaceSummary[];
}

function getGreeting(now: Date) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/**
 * Action-first dashboard (Phase 3). Flag-gated — rendered only when
 * `NEXT_PUBLIC_FLAG_MONEY_RECORDS` is on; otherwise the legacy
 * dashboard is used unchanged.
 *
 * Reads go against the legacy `Transaction` / `Debt` tables so that
 * existing users see live data even before the Money Records backfill
 * has run. Phase 9 will flip these reads to `MoneyRecord`.
 */
export async function DashboardV2({ user, workspaces }: DashboardV2Props) {
  const workspaceIds = workspaces.map((w) => w.id);
  const defaultWorkspaceId = workspaces[0]?.id;
  const workspaceList = workspaces.map((w) => ({ id: w.id, name: w.name }));
  const firstName = user.name?.split(" ")[0] ?? "there";
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const fourteenDays = new Date(now.getTime() + 14 * 24 * 3600 * 1000);

  const [monthTx, trailingTx, openDebts, recentTxRaw] = workspaceIds.length
    ? await Promise.all([
        prisma.transaction.findMany({
          where: {
            workspaceId: { in: workspaceIds },
            transactionDate: { gte: monthStart }
          },
          select: {
            id: true,
            amount: true,
            transactionType: true,
            transactionDate: true,
            merchant: true,
            title: true,
            category: { select: { name: true } }
          }
        }),
        prisma.transaction.findMany({
          where: {
            workspaceId: { in: workspaceIds },
            transactionType: "EXPENSE",
            transactionDate: { gte: threeMonthsAgo, lt: monthStart }
          },
          select: {
            amount: true,
            transactionDate: true,
            category: { select: { name: true } }
          }
        }),
        prisma.debt.findMany({
          where: {
            workspaceId: { in: workspaceIds },
            status: { in: ["OPEN", "PARTIAL", "OVERDUE"] }
          },
          select: {
            id: true,
            type: true,
            status: true,
            balanceRemaining: true,
            counterpartyName: true,
            purpose: true,
            dueDate: true
          }
        }),
        prisma.transaction.findMany({
          where: { workspaceId: { in: workspaceIds } },
          orderBy: { transactionDate: "desc" },
          take: 6,
          include: { workspace: { select: { name: true } } }
        })
      ])
    : ([[], [], [], []] as [MonthTx[], TrailingTx[], OverdueDebtRow[], RecentTxRow[]]);

  const spentThisMonth = monthTx
    .filter((t) => t.transactionType === "EXPENSE")
    .reduce((s, t) => s + Number(t.amount), 0);
  const incomeThisMonth = monthTx
    .filter((t) => t.transactionType === "INCOME")
    .reduce((s, t) => s + Number(t.amount), 0);
  const netFlow = incomeThisMonth - spentThisMonth;

  const owedToYou = openDebts
    .filter((d) => ["LENT", "CUSTOMER_UNPAID", "REIMBURSEMENT_PENDING"].includes(d.type))
    .reduce((s, d) => s + Number(d.balanceRemaining), 0);
  const youOwe = openDebts
    .filter((d) => ["BORROWED", "ADVANCE_PAYMENT"].includes(d.type))
    .reduce((s, d) => s + Number(d.balanceRemaining), 0);
  const overdueDebts = openDebts.filter((d) => d.status === "OVERDUE");

  const dueSoon = openDebts
    .filter((d) => d.dueDate && d.dueDate <= fourteenDays)
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 5);

  const recentTx = recentTxRaw.map((tx) => ({
    id: tx.id,
    title: tx.title,
    merchant: tx.merchant,
    date: tx.transactionDate,
    amount: Number(tx.amount),
    type: tx.transactionType,
    workspaceName: tx.workspace.name
  }));

  const suggestions = computeSuggestions({
    monthTx,
    trailingTx,
    overdueDebts
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      {/* Greeting */}
      <section>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {getGreeting(now)}, {firstName}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)] sm:text-base">
          {workspaceIds.length === 0
            ? "You're starting clean. Create a workspace to begin tracking money."
            : netFlow >= 0
              ? `You're ${formatCurrency(netFlow)} ahead this month.`
              : `You're ${formatCurrency(Math.abs(netFlow))} over budget this month.`}
        </p>
      </section>

      {/* Quick actions */}
      <section id="add" className="flex flex-wrap gap-2">
        <AddTransactionDialog
          defaultType="EXPENSE"
          defaultWorkspaceId={defaultWorkspaceId}
          triggerLabel="+ Add Record"
          workspaces={workspaceList}
        />
        <AiImportWidget defaultWorkspaceId={defaultWorkspaceId} workspaces={workspaceList} />
        <AddDebtDialog defaultWorkspaceId={defaultWorkspaceId} workspaces={workspaceList} />
        <CreateWorkspaceDialog />
      </section>

      {/* Money Snapshot */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-white/50">
          Money snapshot
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Spent this month"
            value={formatCurrency(spentThisMonth)}
            icon={<Wallet className="h-5 w-5" />}
            hint={now.toLocaleString("default", { month: "long" })}
          />
          <StatTile
            label="Income this month"
            value={formatCurrency(incomeThisMonth)}
            tone="positive"
            icon={<ArrowUpRight className="h-5 w-5" />}
          />
          <StatTile
            label="Net flow"
            value={`${netFlow >= 0 ? "+" : "-"}${formatCurrency(Math.abs(netFlow))}`}
            tone={netFlow >= 0 ? "accent" : "negative"}
            icon={
              netFlow >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />
            }
            hint="Income minus expenses"
          />
        </div>
      </section>

      {/* Owed Snapshot */}
      {(owedToYou > 0 || youOwe > 0 || overdueDebts.length > 0) && (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-white/50">
            Owed snapshot
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Owed to you"
              value={formatCurrency(owedToYou)}
              tone="positive"
              icon={<ArrowDownRight className="h-5 w-5" />}
            />
            <StatTile
              label="You owe"
              value={formatCurrency(youOwe)}
              tone="negative"
              icon={<ArrowUpRight className="h-5 w-5" />}
            />
            <StatTile
              label="Overdue"
              value={overdueDebts.length}
              tone={overdueDebts.length > 0 ? "negative" : "default"}
              icon={<AlertCircle className="h-5 w-5" />}
              hint={overdueDebts.length === 0 ? "No open balances. Nice." : "Needs attention"}
            />
          </div>
        </section>
      )}

      {/* Due Soon + AI Suggestions */}
      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="p-0">
          <div className="flex items-center justify-between p-5 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-[var(--accent)]" /> Due soon
            </h3>
            <Link href="/debts" className="text-xs text-[var(--brand-500)] hover:underline">
              View all
            </Link>
          </div>
          {dueSoon.length === 0 ? (
            <div className="px-5 pb-6 pt-1 text-sm text-white/50">
              Nothing due in the next 14 days.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {dueSoon.map((d) => (
                <li key={d.id}>
                  <ListRow
                    title={d.counterpartyName}
                    subtitle={d.purpose ?? "Debt"}
                    meta={d.dueDate ? d.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : undefined}
                    trailing={
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ["BORROWED", "ADVANCE_PAYMENT"].includes(d.type)
                            ? "bg-red-500/15 text-red-400"
                            : "bg-emerald-500/15 text-emerald-400"
                        }`}
                      >
                        {formatCurrency(Number(d.balanceRemaining))}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-0">
          <div className="flex items-center justify-between p-5 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-[var(--brand-500)]" /> AI suggestions
            </h3>
          </div>
          {suggestions.length === 0 ? (
            <div className="px-5 pb-6 pt-1 text-sm text-white/50">
              Nothing to flag right now. We&apos;ll surface insights as you add records.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <ListRow
                    leading={<span aria-hidden="true">{s.icon}</span>}
                    title={s.title}
                    subtitle={s.description}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-white/50">
            Recent activity
          </h2>
          <Link href="/transactions" className="text-xs text-[var(--brand-500)] hover:underline">
            View all
          </Link>
        </div>
        {recentTx.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-10 w-10" />}
            title="You're starting clean."
            description="Upload a screenshot or add your first record."
          />
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-white/5">
              {recentTx.map((tx) => (
                <li key={tx.id}>
                  <ListRow
                    title={tx.title}
                    subtitle={[tx.merchant, tx.workspaceName].filter(Boolean).join(" · ")}
                    meta={tx.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    trailing={
                      <span
                        className={`font-semibold tabular-nums ${
                          tx.type === "INCOME" ? "text-emerald-400" : "text-white"
                        }`}
                      >
                        {tx.type === "INCOME" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

// -------- Heuristic AI suggestions --------

interface MonthTx {
  id?: string;
  amount: unknown;
  transactionType: string;
  transactionDate: Date;
  merchant?: string | null;
  title?: string;
  category: { name: string } | null;
}

interface TrailingTx {
  amount: unknown;
  transactionDate: Date;
  category: { name: string } | null;
}

interface OverdueDebtRow {
  id: string;
  type: string;
  status: string;
  balanceRemaining: unknown;
  counterpartyName: string;
  purpose: string | null;
  dueDate: Date | null;
}

interface RecentTxRow {
  id: string;
  title: string;
  merchant: string | null;
  transactionDate: Date;
  transactionType: string;
  amount: unknown;
  workspace: { name: string };
}

interface OverdueDebt {
  counterpartyName: string;
  balanceRemaining: unknown;
}

interface Suggestion {
  icon: string;
  title: string;
  description: string;
}

function computeSuggestions({
  monthTx,
  trailingTx,
  overdueDebts
}: {
  monthTx: MonthTx[];
  trailingTx: TrailingTx[];
  overdueDebts: OverdueDebt[];
}): Suggestion[] {
  const out: Suggestion[] = [];

  // Overdue debts
  for (const d of overdueDebts.slice(0, 2)) {
    out.push({
      icon: "⚠️",
      title: `${d.counterpartyName} is overdue`,
      description: `Outstanding ${formatCurrency(Number(d.balanceRemaining))}. Consider a reminder.`
    });
  }

  // Category spend delta: current month vs 3-month average
  const byCatMonth = new Map<string, number>();
  for (const t of monthTx) {
    if (t.transactionType !== "EXPENSE") continue;
    const c = t.category?.name ?? "Uncategorized";
    byCatMonth.set(c, (byCatMonth.get(c) ?? 0) + Number(t.amount));
  }
  const byCatTrailing = new Map<string, number>();
  for (const t of trailingTx) {
    const c = t.category?.name ?? "Uncategorized";
    byCatTrailing.set(c, (byCatTrailing.get(c) ?? 0) + Number(t.amount));
  }
  for (const [c, monthAmt] of byCatMonth) {
    const avg = (byCatTrailing.get(c) ?? 0) / 3;
    if (avg >= 50 && monthAmt >= avg * 1.18) {
      const pct = Math.round(((monthAmt - avg) / avg) * 100);
      out.push({
        icon: "📈",
        title: `${c} spending up ${pct}%`,
        description: `You've spent ${formatCurrency(monthAmt)} this month vs a ${formatCurrency(avg)} average.`
      });
      if (out.length >= 4) break;
    }
  }

  // Duplicate merchant+amount within last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const seen = new Map<string, number>();
  for (const t of monthTx) {
    if (t.transactionDate < sevenDaysAgo) continue;
    if (!t.merchant) continue;
    const key = `${t.merchant.toLowerCase()}|${Math.round(Number(t.amount) * 100)}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count < 2) continue;
    const [merchant] = key.split("|");
    out.push({
      icon: "🔁",
      title: `Duplicate ${merchant} payment?`,
      description: `${count} charges with the same amount in the last 7 days. Check for a double-post.`
    });
    if (out.length >= 4) break;
  }

  return out.slice(0, 4);
}
