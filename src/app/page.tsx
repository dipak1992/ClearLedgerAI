import Link from "next/link";
import { ArrowRight, BellRing, Camera, ChevronRight, HandCoins, LayoutPanelLeft, Search, ShieldCheck, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

const features = [
  {
    icon: Camera,
    title: "Smart import center",
    description: "Turn receipts, screenshots, PDFs, notes, and chat images into structured records in seconds."
  },
  {
    icon: HandCoins,
    title: "Shared debt tracking",
    description: "Track who owes whom, partial repayments, reimbursements, and overdue balances without finance jargon."
  },
  {
    icon: Search,
    title: "Natural-language search",
    description: "Ask questions like 'What do I owe Mike?' or 'Show Walmart last month' and get the answer instantly."
  },
  {
    icon: LayoutPanelLeft,
    title: "Workspaces that fit life",
    description: "Separate personal, business, roommate, family, and project money into tabs that stay organized."
  }
];

const metrics = [
  { label: "AI scans included", value: "30 / month", tone: "Free" },
  { label: "Average import time", value: "< 10 sec", tone: "Fast" },
  { label: "Debt visibility", value: formatCurrency(4820), tone: "Sample" }
];

const modules = [
  "Transactions and receipt vault",
  "Shared workspace permissions",
  "Roommate and couples split flows",
  "Customer unpaid balance tracking",
  "Debt reminders and repayment timelines",
  "Monthly reports and export-ready summaries"
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="grid-glow absolute inset-0 opacity-50" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 backdrop-blur md:px-6">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-600)] text-sm font-semibold text-slate-950">CL</span>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-white/70 uppercase">ClearLedger AI</p>
              <p className="text-xs text-white/45">Your money records. Finally clear.</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <Link href="/pricing">Pricing</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/sign-in">Login</Link>
          </nav>
        </header>

        <section className="relative grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2 text-sm text-[var(--accent)]">
              <Sparkles className="h-4 w-4" />
              AI-powered transaction organizer + debt tracker
            </div>
            <h1 className="max-w-4xl text-5xl leading-none tracking-tight sm:text-6xl lg:text-7xl">
              Your money records. <span className="font-[family-name:var(--font-serif)] italic text-[var(--brand-500)]">Finally clear.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
              Import screenshots, track debts, split expenses, and organize every transaction in one premium workspace built for real life.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link className={buttonVariants({ size: "lg" })} href="/sign-in">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className={buttonVariants({ size: "lg", variant: "secondary" })} href="/dashboard">
                Watch Demo
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div className="card-surface rounded-3xl p-5" key={metric.label}>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">{metric.tone}</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-surface relative rounded-[2rem] p-5 sm:p-6">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#09111f] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-white/40">Vacation Trip</p>
                  <h2 className="mt-2 text-2xl font-semibold">Shared Ledger</h2>
                </div>
                <div className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm text-emerald-300">4 members</div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white/50">Owed to you</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(648)}</p>
                  <p className="mt-2 text-sm text-emerald-300">2 reimbursements pending</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white/50">You owe</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(214)}</p>
                  <p className="mt-2 text-sm text-amber-300">Due this week</p>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">Recent AI imports</p>
                  <BellRing className="h-4 w-4 text-[var(--brand-500)]" />
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    "Dinner receipt split 3 ways",
                    "Chat screenshot parsed into debt reminder",
                    "Electric bill marked uneven split"
                  ].map((item) => (
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 px-3 py-3 text-sm" key={item}>
                      <span className="text-white/80">{item}</span>
                      <span className="text-[var(--brand-500)]">Ready</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article className="card-surface rounded-[1.75rem] p-6" key={feature.title}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 text-[var(--brand-500)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{feature.description}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="card-surface rounded-[2rem] p-7">
            <p className="text-sm uppercase tracking-[0.2em] text-white/40">Built for real people</p>
            <h2 className="mt-3 text-3xl font-semibold">Less spreadsheet stress. More clarity.</h2>
            <p className="mt-4 text-base leading-8 text-[var(--muted)]">
              Roommates, couples, freelancers, side hustlers, families, and small businesses all need one thing: a clean money record that is fast to update and easy to trust.
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-white/70">
              <ShieldCheck className="h-4 w-4 text-[var(--brand-500)]" />
              Secure auth, row-level access, audit logs, and protected files.
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((module) => (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-5" key={module}>
                <p className="text-base font-medium text-white">{module}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}