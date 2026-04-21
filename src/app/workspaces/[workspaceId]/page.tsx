import { CalendarClock, HandCoins, ReceiptText } from "lucide-react";

import { formatCurrency } from "@/lib/utils";

export default async function WorkspaceLedgerPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/40">Workspace Ledger</p>
          <h1 className="mt-2 text-4xl font-semibold">{workspaceId}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            This ledger tab is prepared for transaction tables, filters, receipt previews, and split calculations.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="card-surface rounded-3xl p-5">
            <ReceiptText className="h-5 w-5 text-[var(--brand-500)]" />
            <p className="mt-4 text-sm text-white/50">Monthly expenses</p>
            <p className="mt-2 text-3xl font-semibold">{formatCurrency(2230)}</p>
          </article>
          <article className="card-surface rounded-3xl p-5">
            <HandCoins className="h-5 w-5 text-[var(--brand-500)]" />
            <p className="mt-4 text-sm text-white/50">Split pending</p>
            <p className="mt-2 text-3xl font-semibold">{formatCurrency(410)}</p>
          </article>
          <article className="card-surface rounded-3xl p-5">
            <CalendarClock className="h-5 w-5 text-[var(--brand-500)]" />
            <p className="mt-4 text-sm text-white/50">Recurring reminders</p>
            <p className="mt-2 text-3xl font-semibold">4</p>
          </article>
        </section>
      </div>
    </main>
  );
}
