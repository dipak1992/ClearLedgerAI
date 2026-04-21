import { formatCurrency } from "@/lib/utils";

export default async function TransactionDetailPage({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm uppercase tracking-[0.2em] text-white/40">Transaction Detail</p>
        <h1 className="mt-2 text-4xl font-semibold">{transactionId}</h1>

        <article className="card-surface mt-8 rounded-3xl p-6">
          <p className="text-sm text-white/50">Amount</p>
          <p className="mt-2 text-4xl font-semibold">{formatCurrency(96)}</p>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            This page is structured for attachment previews, edit timeline, comments, and split participant status.
          </p>
        </article>
      </div>
    </main>
  );
}
