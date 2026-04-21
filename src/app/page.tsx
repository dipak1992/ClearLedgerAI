import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, BarChart3, Brain, Briefcase, Building2,
  Camera, Check, HandCoins, Heart, Home as HomeIcon,
  Receipt, Shield, Sparkles, Star, Upload, Users, X, Zap,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

export const metadata: Metadata = {
  title: "ClearLedger AI – Smart Transaction & Debt Tracker",
  description:
    "Track transactions, debts, receipts, and shared expenses in one place. Upload any screenshot or note to organize money instantly.",
};

/* ─── Types ─────────────────────────────────────────────────── */
type CellVal = boolean | "partial";

/* ─── Static data ───────────────────────────────────────────── */
const trustItems = [
  "🏠 Roommates", "💑 Couples", "👨‍👩‍👧 Families", "👩‍💼 Freelancers",
  "🏢 Small Business", "🚀 Side Hustlers", "✈️ Travel Groups", "💼 Consultants",
];

const painPoints = [
  "Notes app full of random amounts",
  "Loans you forgot and never got back",
  'Monthly roommate confusion — "who paid what?"',
  "Missing receipts every single tax season",
  "Business expenses split across 4 different apps",
  '"Did I already pay that bill?"',
];

const steps = [
  { n: "01", icon: Upload,    title: "Upload Anything", desc: "Screenshots, receipts, chat images, notes, PDFs — just upload it." },
  { n: "02", icon: Brain,     title: "AI Organizes It", desc: "Extracts amounts, dates, merchants, people, and categories instantly." },
  { n: "03", icon: BarChart3, title: "Stay in Control", desc: "Track spending, debts, shared balances, and get reports that actually make sense." },
];

const features = [
  { icon: Camera,    title: "Screenshot to Ledger",   desc: "Upload bank screenshots and watch them become structured records in seconds. Zero typing." },
  { icon: HandCoins, title: "Debt Tracker",           desc: "Know exactly who owes what. Partial payments, overdue flags, full history included." },
  { icon: Users,     title: "Shared Workspaces",      desc: "Manage money with roommates, teams, or family. Real-time and permission-controlled." },
  { icon: Zap,       title: "Instant Bill Splitting", desc: "Cleaner than Splitwise. Handles uneven splits, reimbursements, and live balances." },
  { icon: Receipt,   title: "Receipt Vault",          desc: "Every proof stored, searchable, and organized. No more lost receipts at tax time." },
  { icon: BarChart3, title: "Smart Insights",         desc: "Spot patterns, track categories, and understand where money goes — automatically." },
];

const useCases = [
  { icon: HomeIcon,  audience: "Roommates",     headline: "Stop the monthly money confusion.",           desc: "Split rent, bills, groceries, and utilities fairly. Know who paid what without the WhatsApp thread.", iconBg: "bg-[var(--brand-500)]/10 text-[var(--brand-500)]", blobBg: "bg-[var(--brand-500)]" },
  { icon: Heart,     audience: "Couples",       headline: "Shared spending without arguments.",          desc: "Track household expenses together, split costs fairly, and always know where you both stand.",        iconBg: "bg-rose-500/10 text-rose-400",                      blobBg: "bg-rose-500" },
  { icon: Building2, audience: "Small Business",headline: "Every purchase. Perfectly tracked.",         desc: "Log purchases, track reimbursements, manage customer balances, and export clean reports.",           iconBg: "bg-violet-500/10 text-violet-400",                  blobBg: "bg-violet-500" },
  { icon: Briefcase, audience: "Freelancers",   headline: "Business money. Personal money. Both clean.", desc: "Use separate workspaces to keep freelance income and expenses organized and tax-ready.",            iconBg: "bg-[var(--accent)]/10 text-[var(--accent)]",        blobBg: "bg-[var(--accent)]" },
];

const comparisons: { feature: string; clearledger: CellVal; notes: CellVal; excel: CellVal; bank: CellVal; splitwise: CellVal }[] = [
  { feature: "AI import from screenshots", clearledger: true, notes: false, excel: false,      bank: false,      splitwise: false      },
  { feature: "Debt & credit tracking",     clearledger: true, notes: false, excel: false,      bank: false,      splitwise: true       },
  { feature: "Shared workspaces",          clearledger: true, notes: false, excel: false,      bank: false,      splitwise: "partial"  },
  { feature: "Receipt storage",            clearledger: true, notes: false, excel: false,      bank: "partial",  splitwise: false      },
  { feature: "Smart reports & exports",    clearledger: true, notes: false, excel: "partial",  bank: "partial",  splitwise: false      },
  { feature: "Modern mobile UX",           clearledger: true, notes: true,  excel: false,      bank: "partial",  splitwise: true       },
];

const testimonials = [
  { initial: "A", name: "Alex R.",  role: "Freelance Designer",   quote: "I replaced 3 apps with this. My finances are finally in one place and I know exactly where everything is." },
  { initial: "J", name: "Jamie L.", role: "Shared Apartment",     quote: "My roommates stopped arguing about money. ClearLedger solved something we had been dealing with for 2 years." },
  { initial: "S", name: "Sam T.",   role: "Small Business Owner", quote: "I know where every dollar went for the first time. This is the app I have been looking for." },
];

const pricing = [
  { name: "Free",     price: "$0",  period: "",    desc: "Start clean. No card needed.",   highlight: false, cta: "Start Free", href: "/sign-in",  features: ["Transaction tracking", "1 workspace", "30 AI imports/month", "Debt tracker"] },
  { name: "Pro",      price: "$9",  period: "/mo", desc: "For serious money tracking.",    highlight: true,  cta: "Go Pro",     href: "/pricing",  features: ["Unlimited AI imports", "5 workspaces", "Receipt vault", "Smart reports", "Priority support"] },
  { name: "Business", price: "$29", period: "/mo", desc: "For teams and businesses.",     highlight: false, cta: "See Plans",  href: "/pricing",  features: ["Everything in Pro", "Unlimited workspaces", "Team permissions", "Audit logs", "Export & API"] },
];

/* ─── Helpers ───────────────────────────────────────────────── */
function CompCell({ val }: { val: CellVal }) {
  if (val === true) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-500)]/15">
        <Check className="h-3.5 w-3.5 text-[var(--brand-500)]" />
      </span>
    );
  }
  if (val === "partial") {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-400">
        ~
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500/10">
      <X className="h-3 w-3 text-red-400" />
    </span>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <ScrollReveal />

      {/* Ambient background glow */}
      <div className="blob pointer-events-none absolute top-0 left-1/4 h-[600px] w-[600px] -translate-x-1/2 bg-[var(--brand-500)] opacity-[0.07]" />
      <div className="blob pointer-events-none absolute top-0 right-1/4 h-[450px] w-[450px] translate-x-1/2 bg-[var(--accent)] opacity-[0.05]" />

      {/* ─── NAVBAR ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link className="flex items-center gap-2.5" href="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-600)] text-xs font-bold text-slate-950 tracking-tight">
              CL
            </span>
            <span className="text-sm font-semibold tracking-wide text-white/90">ClearLedger AI</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-white/55 md:flex">
            <Link className="transition-colors hover:text-white" href="#features">Features</Link>
            <Link className="transition-colors hover:text-white" href="#how">How it works</Link>
            <Link className="transition-colors hover:text-white" href="/pricing">Pricing</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link className="hidden text-sm text-white/55 transition-colors hover:text-white md:block" href="/sign-in">
              Sign in
            </Link>
            <Link className={buttonVariants({ size: "sm" })} href="/sign-in">
              Start Free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO ────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-5 pb-24 pt-20 sm:px-8 lg:pt-32">
        <div className="grid-glow absolute inset-0 z-0 opacity-40" />
        <div className="relative z-10 grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">

          {/* Left */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/8 px-4 py-2">
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span className="text-sm font-medium text-[var(--accent)]">AI-powered money organizer</span>
            </div>

            <h1 className="max-w-[600px] text-5xl font-semibold leading-[1.07] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              Still tracking money in{" "}
              <span className="font-[family-name:var(--font-serif)] italic text-[var(--brand-500)]">
                screenshots and notes?
              </span>
            </h1>

            <p className="mt-6 max-w-[500px] text-lg leading-8 text-[var(--muted)]">
              Upload receipts, screenshots, chats, and notes. ClearLedger AI turns them into
              clean records — debts, splits, spending, all in one place.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link className={buttonVariants({ size: "lg" })} href="/sign-in">
                Start Free — No card needed
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className={buttonVariants({ size: "lg", variant: "secondary" })} href="/dashboard">
                See the Dashboard
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-5">
              <div className="flex items-center gap-2 text-sm text-white/45">
                <Shield className="h-4 w-4 text-[var(--brand-500)]" />
                Secure &amp; private
              </div>
              <div className="flex items-center gap-2 text-sm text-white/45">
                <Check className="h-4 w-4 text-[var(--brand-500)]" />
                Free to start
              </div>
              <div className="flex items-center gap-2 text-sm text-white/45">
                <Zap className="h-4 w-4 text-[var(--brand-500)]" />
                Under 10s per import
              </div>
            </div>
          </div>

          {/* Right — Dashboard mockup */}
          <div className="relative hidden lg:block">
            <div className="blob absolute -top-16 -right-12 h-52 w-52 bg-[var(--brand-500)] opacity-20" />
            <div className="animate-float card-surface relative rounded-[2rem] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/35">Workspace</p>
                  <h3 className="mt-0.5 text-base font-semibold">Personal + Business</h3>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-[var(--brand-500)]/10 px-3 py-1.5">
                  <span className="glow-dot h-2 w-2 rounded-full bg-[var(--brand-500)]" />
                  <span className="text-xs text-[var(--brand-500)]">Live sync</span>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs text-white/45">Owed to you</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--brand-500)]">$648</p>
                  <p className="mt-1 text-xs text-emerald-400">2 reimbursements pending</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs text-white/45">Month spend</p>
                  <p className="mt-2 text-2xl font-bold">$2,840</p>
                  <p className="mt-1 text-xs text-[var(--accent)]">↓ 12% vs last month</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium text-white/65">AI Imports</p>
                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                </div>
                <div className="space-y-2">
                  {[
                    { t: "Dinner receipt — split 3 ways", badge: "Parsed", color: "text-[var(--brand-500)]" },
                    { t: "Bank screenshot → 4 entries",   badge: "Ready",  color: "text-[var(--brand-500)]" },
                    { t: "Mike owes $200 (chat)",          badge: "Debt",   color: "text-[var(--accent)]" },
                  ].map((row) => (
                    <div key={row.t} className="flex items-center justify-between rounded-xl border border-white/[0.07] px-3 py-2.5 text-xs">
                      <span className="text-white/70">{row.t}</span>
                      <span className={cn("font-semibold", row.color)}>{row.badge}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST BAR ──────────────────────────────────────── */}
      <section className="border-y border-white/[0.07] bg-white/[0.02] py-5">
        <div className="flex items-center gap-6 overflow-hidden">
          <p className="shrink-0 pl-5 text-xs font-semibold uppercase tracking-[0.16em] text-white/30 sm:pl-8">
            Perfect for
          </p>
          <div className="flex-1 overflow-hidden">
            <div className="marquee-track flex gap-5 whitespace-nowrap">
              {[...trustItems, ...trustItems].map((item, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5 text-sm text-white/55"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROBLEM ────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8" id="problem">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">The problem</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Money isn&apos;t messy.{" "}
            <span className="font-[family-name:var(--font-serif)] italic text-[var(--brand-500)]">The tools are.</span>
          </h2>
          <p className="mt-4 text-lg text-[var(--muted)]">
            You&apos;re managing real money with tools built for something else entirely.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map((pt, i) => (
            <div
              key={pt}
              className={cn(
                "reveal card-surface hover-lift flex items-start gap-4 rounded-2xl p-5",
                `reveal-delay-${(i % 6) + 1}`
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-sm">❌</span>
              <p className="text-sm leading-7 text-[var(--muted)]">{pt}</p>
            </div>
          ))}
        </div>

        <div className="reveal mt-8 flex flex-col items-start gap-4 rounded-[1.75rem] border border-[var(--brand-500)]/20 bg-[var(--brand-500)]/5 p-6 sm:flex-row sm:items-center">
          <span className="text-2xl">✅</span>
          <div className="flex-1">
            <p className="text-lg font-semibold">One place. Everything clear.</p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">ClearLedger AI turns the chaos into a clean, searchable, shareable ledger.</p>
          </div>
          <Link className={cn(buttonVariants({ size: "sm" }), "shrink-0")} href="/sign-in">
            Try it free
          </Link>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.015] py-24" id="how">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="reveal mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">How it works</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Three steps to{" "}
              <span className="font-[family-name:var(--font-serif)] italic text-[var(--brand-500)]">total clarity</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.n} className={cn("reveal card-surface rounded-[1.75rem] p-8 text-center", `reveal-delay-${i + 1}`)}>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-500)]/10">
                    <Icon className="h-7 w-7 text-[var(--brand-500)]" />
                  </div>
                  <div className="mx-auto mt-4 inline-block rounded-full bg-white/5 px-3 py-1 text-xs font-bold tracking-widest text-white/30">
                    STEP {step.n}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ───────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8" id="features">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Features</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Built for how people{" "}
            <span className="font-[family-name:var(--font-serif)] italic text-[var(--brand-500)]">actually</span>{" "}
            track money.
          </h2>
          <p className="mt-4 text-lg text-[var(--muted)]">No spreadsheets. No jargon. Just clean records.</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <article key={f.title} className={cn("reveal card-surface hover-lift rounded-[1.75rem] p-7", `reveal-delay-${(i % 3) + 1}`)}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-500)]/10">
                  <Icon className="h-5 w-5 text-[var(--brand-500)]" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2.5 text-sm leading-7 text-[var(--muted)]">{f.desc}</p>
              </article>
            );
          })}
        </div>

        <div className="reveal mt-10 flex justify-center">
          <Link className={buttonVariants()} href="/sign-in">
            Try it free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── USE CASES ──────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.015] py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="reveal mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Who it&apos;s for</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Built for real life{" "}
              <span className="font-[family-name:var(--font-serif)] italic text-[var(--brand-500)]">money situations.</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {useCases.map((uc, i) => {
              const Icon = uc.icon;
              return (
                <div
                  key={uc.audience}
                  className={cn("reveal card-surface hover-lift relative overflow-hidden rounded-[1.75rem] p-8", `reveal-delay-${i + 1}`)}
                >
                  <div className={cn("blob absolute -top-12 -right-12 h-44 w-44 opacity-20", uc.blobBg)} />
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", uc.iconBg)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-white/35">{uc.audience}</p>
                  <h3 className="mt-2 text-xl font-semibold">{uc.headline}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{uc.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="reveal mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Why ClearLedger</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Stop using tools never{" "}
            <span className="font-[family-name:var(--font-serif)] italic text-[var(--brand-500)]">built for this.</span>
          </h2>
        </div>

        <div className="reveal mt-12 overflow-hidden rounded-[1.75rem] border border-white/[0.08]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-white/[0.08] bg-white/[0.03]">
                <tr>
                  <th className="py-4 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-widest text-white/40">Feature</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-widest text-white/40">Notes</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-widest text-white/40">Excel</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-widest text-white/40">Bank App</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-widest text-white/40">Splitwise</th>
                  <th className="bg-[var(--brand-500)]/5 px-4 py-4 text-center text-xs font-semibold uppercase tracking-widest text-[var(--brand-500)]">✦ ClearLedger AI</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, i) => (
                  <tr key={row.feature} className={cn("border-t border-white/[0.06]", i % 2 !== 0 && "bg-white/[0.015]")}>
                    <td className="py-4 pl-6 pr-4 text-sm text-white/75">{row.feature}</td>
                    <td className="px-4 py-4 text-center"><CompCell val={row.notes} /></td>
                    <td className="px-4 py-4 text-center"><CompCell val={row.excel} /></td>
                    <td className="px-4 py-4 text-center"><CompCell val={row.bank} /></td>
                    <td className="px-4 py-4 text-center"><CompCell val={row.splitwise} /></td>
                    <td className="bg-[var(--brand-500)]/5 px-4 py-4 text-center"><CompCell val={row.clearledger} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.015] py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="reveal mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Real users</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              People who finally{" "}
              <span className="font-[family-name:var(--font-serif)] italic text-[var(--brand-500)]">got clear.</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={t.name} className={cn("reveal card-surface hover-lift rounded-[1.75rem] p-7", `reveal-delay-${i + 1}`)}>
                <div className="mb-5 flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-[var(--accent)] text-[var(--accent)]" />
                  ))}
                </div>
                <p className="text-base leading-8 text-white/85">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-600)] text-sm font-semibold text-slate-950">
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-[var(--muted)]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING TEASER ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="reveal mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Pricing</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Start free.{" "}
            <span className="font-[family-name:var(--font-serif)] italic text-[var(--brand-500)]">Upgrade when you&apos;re ready.</span>
          </h2>
          <p className="mt-4 text-lg text-[var(--muted)]">No credit card required to start.</p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {pricing.map((tier, i) => (
            <div
              key={tier.name}
              className={cn(
                "reveal card-surface hover-lift flex flex-col rounded-[1.75rem] p-8",
                tier.highlight && "tier-highlight",
                `reveal-delay-${i + 1}`
              )}
            >
              {tier.highlight && (
                <div className="mb-4 w-fit rounded-full bg-[var(--brand-500)]/15 px-3 py-1 text-xs font-semibold text-[var(--brand-500)]">
                  Most Popular
                </div>
              )}
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{tier.name}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{tier.price}</span>
                {tier.period && <span className="text-sm text-white/40">{tier.period}</span>}
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{tier.desc}</p>
              <ul className="mt-7 flex-1 space-y-3">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-sm text-white/75">
                    <Check className="h-4 w-4 shrink-0 text-[var(--brand-500)]" />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                className={cn("mt-8", buttonVariants({ variant: tier.highlight ? "default" : "secondary", size: "lg" }))}
                href={tier.href}
              >
                {tier.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="reveal mt-7 flex justify-center">
          <Link className={cn(buttonVariants({ variant: "ghost" }), "text-sm text-[var(--muted)]")} href="/pricing">
            View full pricing details →
          </Link>
        </div>
      </section>

      {/* ─── FINAL CTA ──────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <div className="reveal relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[var(--brand-600)]/20 via-[var(--brand-500)]/8 to-[var(--background)] p-12 text-center ring-1 ring-[var(--brand-500)]/15 lg:p-20">
          <div className="blob absolute top-0 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 bg-[var(--brand-500)] opacity-15" />
          <div className="blob absolute bottom-0 right-0 h-48 w-48 translate-x-1/4 translate-y-1/4 bg-[var(--accent)] opacity-10" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Get started today</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Your money life doesn&apos;t need to{" "}
              <span className="font-[family-name:var(--font-serif)] italic text-[var(--brand-500)]">feel messy.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-lg text-[var(--muted)]">
              Get organized in minutes. No spreadsheets. No setup. Just clarity.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link className={buttonVariants({ size: "lg" })} href="/sign-in">
                Start Free Today <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-sm text-white/35">No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8">
          <Link className="flex items-center gap-2" href="/">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-600)] text-xs font-bold text-slate-950">CL</span>
            <span className="text-sm font-semibold text-white/60">ClearLedger AI</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/40">
            <Link className="transition-colors hover:text-white/65" href="#features">Features</Link>
            <Link className="transition-colors hover:text-white/65" href="/pricing">Pricing</Link>
            <Link className="transition-colors hover:text-white/65" href="/dashboard">Dashboard</Link>
            <Link className="transition-colors hover:text-white/65" href="/sign-in">Sign in</Link>
          </nav>
          <p className="text-xs text-white/25">© 2026 ClearLedger AI. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
