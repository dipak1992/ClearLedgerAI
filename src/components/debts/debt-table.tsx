"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DebtType =
  | "LENT"
  | "BORROWED"
  | "CUSTOMER_UNPAID"
  | "ADVANCE_PAYMENT"
  | "REIMBURSEMENT_PENDING";
type DebtStatus = "OPEN" | "PARTIAL" | "PAID" | "OVERDUE";

export interface DebtRow {
  id: string;
  counterpartyName: string;
  amountTotal: number;
  amountPaid: number;
  balanceRemaining: number;
  type: DebtType;
  status: DebtStatus;
  purpose: string | null;
  dueDate: string | null;
  currency: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function statusBadgeClass(status: DebtStatus) {
  switch (status) {
    case "PAID":
      return "bg-emerald-500/15 text-emerald-400";
    case "PARTIAL":
      return "bg-blue-500/15 text-blue-400";
    case "OVERDUE":
      return "bg-red-500/15 text-red-400";
    default:
      return "bg-white/8 text-white/60";
  }
}

function typeBadgeClass(type: DebtType) {
  switch (type) {
    case "LENT":
      return "bg-emerald-500/15 text-emerald-400";
    case "BORROWED":
      return "bg-red-500/15 text-red-400";
    case "CUSTOMER_UNPAID":
      return "bg-yellow-500/15 text-yellow-400";
    case "ADVANCE_PAYMENT":
      return "bg-orange-500/15 text-orange-400";
    case "REIMBURSEMENT_PENDING":
      return "bg-purple-500/15 text-purple-400";
  }
}

function typeLabel(type: DebtType) {
  switch (type) {
    case "LENT":
      return "I Lent";
    case "BORROWED":
      return "I Borrowed";
    case "CUSTOMER_UNPAID":
      return "Customer Owes";
    case "ADVANCE_PAYMENT":
      return "Advance Paid";
    case "REIMBURSEMENT_PENDING":
      return "Reimburse Due";
  }
}

function AddPaymentModal({
  debt,
  onClose,
}: {
  debt: DebtRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be positive");
      return;
    }
    if (parsedAmount > debt.balanceRemaining + 0.01) {
      setError(`Exceeds balance remaining (${fmt(debt.balanceRemaining)})`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/debts/${debt.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          notes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok)
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to record payment"
        );
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card-surface w-full max-w-sm rounded-[2rem] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Record Payment</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {debt.counterpartyName} — {fmt(debt.balanceRemaining)} remaining
        </p>
        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm text-white/60">
              Payment Amount *
            </label>
            <input
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)]"
              inputMode="decimal"
              max={debt.balanceRemaining}
              min={0.01}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={amount}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Notes</label>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)]"
              maxLength={200}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cash, bank transfer…"
              value={notes}
            />
          </div>
          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              className="flex-1 rounded-full bg-[var(--brand-600)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              {loading ? "Saving…" : "Record Payment"}
            </button>
            <button
              className="rounded-full bg-white/8 px-5 py-2.5 text-sm font-medium text-[var(--muted)] ring-1 ring-white/10"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MarkPaidModal({
  debt,
  onClose,
}: {
  debt: DebtRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkPaid() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/debts/${debt.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: debt.balanceRemaining,
          notes: "Marked as fully paid",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok)
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Failed to mark as paid"
        );
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card-surface w-full max-w-sm rounded-[2rem] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Mark as Fully Paid</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Record a final payment of{" "}
          <span className="font-medium text-white">
            {fmt(debt.balanceRemaining)}
          </span>{" "}
          to close the debt with{" "}
          <span className="font-medium text-white">
            {debt.counterpartyName}
          </span>
          .
        </p>
        {error && (
          <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-3">
          <button
            className="flex-1 rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            disabled={loading}
            onClick={handleMarkPaid}
            type="button"
          >
            {loading ? "Saving…" : "✓ Mark Paid"}
          </button>
          <button
            className="rounded-full bg-white/8 px-5 py-2.5 text-sm font-medium text-[var(--muted)] ring-1 ring-white/10"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function DebtTable({ debts }: { debts: DebtRow[] }) {
  const [paymentFor, setPaymentFor] = useState<DebtRow | null>(null);
  const [markPaidFor, setMarkPaidFor] = useState<DebtRow | null>(null);

  if (debts.length === 0) {
    return (
      <div className="card-surface flex flex-col items-center gap-3 rounded-[1.75rem] py-16 text-center">
        <p className="text-3xl">👍</p>
        <p className="text-white/60">No outstanding debts. You&apos;re all clear!</p>
      </div>
    );
  }

  return (
    <>
      <div className="card-surface overflow-hidden rounded-[1.75rem]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-6 py-4 text-left font-medium text-white/40">
                  Person / Company
                </th>
                <th className="hidden px-4 py-4 text-left font-medium text-white/40 sm:table-cell">
                  Type
                </th>
                <th className="hidden px-4 py-4 text-left font-medium text-white/40 md:table-cell">
                  Reason
                </th>
                <th className="hidden px-4 py-4 text-left font-medium text-white/40 md:table-cell">
                  Due
                </th>
                <th className="px-4 py-4 text-left font-medium text-white/40">
                  Status
                </th>
                <th className="px-4 py-4 text-right font-medium text-white/40">
                  Balance
                </th>
                <th className="px-6 py-4 text-right font-medium text-white/40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {debts.map((debt, i) => (
                <tr
                  className={`transition hover:bg-white/[0.04] ${
                    i < debts.length - 1 ? "border-b border-white/5" : ""
                  }`}
                  key={debt.id}
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">
                      {debt.counterpartyName}
                    </p>
                  </td>
                  <td className="hidden px-4 py-4 sm:table-cell">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadgeClass(debt.type)}`}
                    >
                      {typeLabel(debt.type)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-4 text-white/60 md:table-cell">
                    {debt.purpose ?? (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-4 md:table-cell">
                    {debt.dueDate ? (
                      <span
                        className={
                          new Date(debt.dueDate) < new Date()
                            ? "text-red-400"
                            : "text-white/60"
                        }
                      >
                        {new Date(debt.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(debt.status)}`}
                    >
                      {debt.status.charAt(0) + debt.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold tabular-nums text-white">
                    {fmt(debt.balanceRemaining)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {debt.status !== "PAID" && (
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-white/60 ring-1 ring-white/10 transition hover:bg-white/12 hover:text-white"
                          onClick={() => setPaymentFor(debt)}
                          type="button"
                        >
                          + Payment
                        </button>
                        <button
                          className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/25"
                          onClick={() => setMarkPaidFor(debt)}
                          type="button"
                        >
                          ✓ Paid
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {paymentFor && (
        <AddPaymentModal
          debt={paymentFor}
          onClose={() => setPaymentFor(null)}
        />
      )}
      {markPaidFor && (
        <MarkPaidModal
          debt={markPaidFor}
          onClose={() => setMarkPaidFor(null)}
        />
      )}
    </>
  );
}
