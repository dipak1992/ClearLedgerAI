import { ArrowUpRight, Bot, Clock3, Wallet } from "lucide-react";
import Link from "next/link";

import { formatCurrency } from "@/lib/utils";

const overviewCards = [
  {
    title: "Total spent this month",
    value: formatCurrency(3840),
    hint: "+12% vs last month",
    icon: Wallet
  },
  {
    title: "Owed to you",
    value: formatCurrency(1180),
    hint: "8 open balances",
    icon: ArrowUpRight
  },
  {
    title: "You owe",
    value: formatCurrency(460),
    hint: "3 upcoming settlements",
    icon: Clock3
  },
  {
    title: "AI alerts",
    value: "6",
    hint: "2 duplicates, 1 overdue, 3 uncategorized",
    icon: Bot
  }
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-white/40">Dashboard</p>
          <h1 className="text-4xl font-semibold tracking-tight">Everything clear at a glance.</h1>
          <p className="max-w-2xl text-base leading-8 text-[var(--muted)]">
            This starter dashboard is wired as the foundation for workspaces, ledgers, debts, reports, and AI import flows.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => {
            const Icon = card.icon;

            return (
              <article className="card-surface rounded-[1.75rem] p-6" key={card.title}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/50">{card.title}</p>
                  <Icon className="h-5 w-5 text-[var(--brand-500)]" />
                </div>
                <p className="mt-5 text-4xl font-semibold text-white">{card.value}</p>
                <p className="mt-3 text-sm text-[var(--muted)]">{card.hint}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/workspaces/demo-workspace", label: "Workspace Ledger" },
            { href: "/workspaces/demo-workspace/shared", label: "Shared Workspace" },
            { href: "/transactions/demo-transaction", label: "Transaction Detail" },
            { href: "/debts", label: "Debt Tracker" },
            { href: "/reports", label: "Reports" },
            { href: "/settings", label: "Settings" },
            { href: "/admin", label: "Admin" }
          ].map((item) => (
            <Link className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/10" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}