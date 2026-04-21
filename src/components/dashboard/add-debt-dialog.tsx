"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Workspace {
  id: string;
  name: string;
}

interface AddDebtDialogProps {
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
  triggerLabel?: string;
  triggerClassName?: string;
}

const DEBT_TYPES = [
  { value: "LENT", label: "I Lent" },
  { value: "BORROWED", label: "I Borrowed" },
  { value: "CUSTOMER_UNPAID", label: "Customer Owes" },
  { value: "ADVANCE_PAYMENT", label: "Advance Paid" },
  { value: "REIMBURSEMENT_PENDING", label: "Reimburse Due" },
] as const;

type DebtTypeValue = (typeof DEBT_TYPES)[number]["value"];

export function AddDebtDialog({
  workspaces,
  defaultWorkspaceId,
  triggerLabel = "💸 Add Debt",
  triggerClassName,
}: AddDebtDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workspaceId, setWorkspaceId] = useState(
    defaultWorkspaceId ?? workspaces[0]?.id ?? ""
  );
  const [counterpartyName, setCounterpartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<DebtTypeValue>("LENT");
  const [purpose, setPurpose] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  function handleClose() {
    setOpen(false);
    setError(null);
    setCounterpartyName("");
    setAmount("");
    setType("LENT");
    setPurpose("");
    setDueDate("");
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
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          counterpartyName: counterpartyName.trim(),
          amountTotal: parsedAmount,
          type,
          purpose: purpose.trim() || undefined,
          dueDate: dueDate ? new Date(dueDate + "T00:00:00").toISOString() : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok)
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to add debt"
        );
      handleClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const defaultTriggerClass =
    "inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-600)]/15 px-4 py-2.5 text-sm font-medium text-[var(--brand-500)] ring-1 ring-[var(--brand-500)]/30 transition hover:bg-[var(--brand-600)]/25";

  if (workspaces.length === 0) {
    return (
      <button
        className={triggerClassName ?? defaultTriggerClass}
        disabled
        title="Create a workspace first"
        type="button"
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <>
      <button
        className={triggerClassName ?? defaultTriggerClass}
        onClick={() => setOpen(true)}
        type="button"
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="card-surface w-full max-w-lg rounded-[2rem] p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold">Add Debt</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Track money lent, borrowed, or pending settlement.
            </p>

            <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
              {workspaces.length > 1 && (
                <div>
                  <label className="mb-1.5 block text-sm text-white/60">
                    Workspace
                  </label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    value={workspaceId}
                  >
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm text-white/60">
                  Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEBT_TYPES.map((t) => (
                    <button
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        type === t.value
                          ? "bg-[var(--brand-600)] text-white"
                          : "bg-white/8 text-[var(--muted)] ring-1 ring-white/10 hover:bg-white/12"
                      }`}
                      key={t.value}
                      onClick={() => setType(t.value)}
                      type="button"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm text-white/60">
                    Person / Company *
                  </label>
                  <input
                    autoFocus
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                    maxLength={120}
                    onChange={(e) => setCounterpartyName(e.target.value)}
                    placeholder="John, Acme Corp…"
                    required
                    value={counterpartyName}
                  />
                </div>
                <div className="w-32">
                  <label className="mb-1.5 block text-sm text-white/60">
                    Amount *
                  </label>
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

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm text-white/60">
                    Reason
                  </label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                    maxLength={150}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Dinner, rent, invoice…"
                    value={purpose}
                  />
                </div>
                <div className="w-40">
                  <label className="mb-1.5 block text-sm text-white/60">
                    Due Date
                  </label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)] [color-scheme:dark]"
                    onChange={(e) => setDueDate(e.target.value)}
                    type="date"
                    value={dueDate}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/60">
                  Notes
                </label>
                <textarea
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                  maxLength={1000}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context…"
                  rows={2}
                  value={notes}
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  className="flex-1 rounded-full bg-[var(--brand-600)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? "Saving…" : "Save Debt"}
                </button>
                <button
                  className="rounded-full bg-white/8 px-5 py-2.5 text-sm font-medium text-[var(--muted)] ring-1 ring-white/10 transition hover:bg-white/12"
                  onClick={handleClose}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
