"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

interface Workspace {
  id: string;
  name: string;
}

interface AddTransactionDialogProps {
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
  defaultType?: "EXPENSE" | "INCOME" | "TRANSFER" | "REIMBURSEMENT";
  triggerLabel?: string;
}

const TRANSACTION_TYPES = [
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "REIMBURSEMENT", label: "Reimbursement" }
] as const;

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export function AddTransactionDialog({ workspaces, defaultWorkspaceId, defaultType, triggerLabel }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId ?? workspaces[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState<"EXPENSE" | "INCOME" | "TRANSFER" | "REIMBURSEMENT">(defaultType ?? "EXPENSE");
  const [transactionDate, setTransactionDate] = useState(todayIso());
  const [merchant, setMerchant] = useState("");
  const [notes, setNotes] = useState("");

  function handleClose() {
    setOpen(false);
    setError(null);
    setTitle("");
    setAmount("");
    setTransactionType(defaultType ?? "EXPENSE");
    setTransactionDate(todayIso());
    setMerchant("");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          title: title.trim(),
          amount: parsedAmount,
          transactionType,
          transactionDate: new Date(transactionDate).toISOString(),
          currency: "USD",
          merchant: merchant.trim() || undefined,
          notes: notes.trim() || undefined
        })
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to add transaction");
      handleClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (workspaces.length === 0) {
    return (
      <div>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2.5 text-sm text-[var(--muted)] cursor-not-allowed ring-1 ring-white/10"
          disabled
          title="Create a workspace first to add transactions"
        >
          + Add Transaction
        </button>
        <p className="mt-1 text-xs text-white/50">Create a workspace first</p>
      </div>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>{triggerLabel ?? "+ Add Transaction"}</Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="card-surface w-full max-w-lg rounded-[2rem] p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold">Add Transaction</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Record an expense, income, or transfer.</p>

            <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
              {/* Workspace */}
              {workspaces.length > 1 && (
                <div>
                  <label className="mb-1.5 block text-sm text-white/60">Workspace</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    value={workspaceId}
                  >
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type */}
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {TRANSACTION_TYPES.map((t) => (
                    <button
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                        transactionType === t.value
                          ? "bg-[var(--brand-600)] text-white"
                          : "bg-white/8 text-[var(--muted)] ring-1 ring-white/10 hover:bg-white/12"
                      }`}
                      key={t.value}
                      onClick={() => setTransactionType(t.value)}
                      type="button"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title + Amount row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm text-white/60">Description *</label>
                  <input
                    autoFocus
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                    maxLength={120}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Coffee, Rent, Invoice…"
                    required
                    value={title}
                  />
                </div>
                <div className="w-32">
                  <label className="mb-1.5 block text-sm text-white/60">Amount (USD) *</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                    inputMode="decimal"
                    min={0.01}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    step="0.01"
                    type="number"
                    value={amount}
                  />
                </div>
              </div>

              {/* Date + Merchant row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm text-white/60">Date *</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)] [color-scheme:dark]"
                    onChange={(e) => setTransactionDate(e.target.value)}
                    required
                    type="date"
                    value={transactionDate}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm text-white/60">Merchant / Payer</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                    maxLength={120}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Amazon, Dipak…"
                    value={merchant}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Notes</label>
                <textarea
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                  maxLength={1000}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes…"
                  rows={2}
                  value={notes}
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="mt-2 flex justify-end gap-3">
                <Button onClick={handleClose} type="button" variant="secondary">
                  Cancel
                </Button>
                <Button disabled={loading || !title.trim() || !amount} type="submit">
                  {loading ? "Saving…" : "Save Transaction"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
