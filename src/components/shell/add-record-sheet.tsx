"use client";

import * as React from "react";
import { MoneyRecordType } from "@prisma/client";

const TYPE_OPTIONS: { value: MoneyRecordType; label: string; emoji: string }[] = [
  { value: MoneyRecordType.EXPENSE, label: "Expense", emoji: "💸" },
  { value: MoneyRecordType.INCOME, label: "Income", emoji: "💰" },
  { value: MoneyRecordType.DEBT_GIVEN, label: "Lent / Owed to me", emoji: "🤝" },
  { value: MoneyRecordType.DEBT_BORROWED, label: "Borrowed / I owe", emoji: "🪙" },
  { value: MoneyRecordType.TRANSFER, label: "Transfer", emoji: "↔️" },
  { value: MoneyRecordType.REIMBURSEMENT, label: "Reimbursement", emoji: "↩️" },
  { value: MoneyRecordType.SPLIT_EXPENSE, label: "Split expense", emoji: "✂️" }
];

const DEBT_TYPES: Set<MoneyRecordType> = new Set([
  MoneyRecordType.DEBT_GIVEN,
  MoneyRecordType.DEBT_BORROWED
]);

interface Workspace {
  id: string;
  name: string;
}

interface AddRecordSheetProps {
  open: boolean;
  onClose: () => void;
  defaultType?: MoneyRecordType;
  defaultWorkspaceId?: string;
  workspaces: Workspace[];
  onSaved?: () => void;
}

interface FormState {
  type: MoneyRecordType;
  workspaceId: string;
  title: string;
  amount: string;
  currency: string;
  occurredAt: string;
  merchant: string;
  paymentMethod: string;
  notes: string;
  counterpartyName: string;
  dueDate: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AddRecordSheet({
  open,
  onClose,
  defaultType = MoneyRecordType.EXPENSE,
  defaultWorkspaceId,
  workspaces,
  onSaved
}: AddRecordSheetProps) {
  const [form, setForm] = React.useState<FormState>(() => ({
    type: defaultType,
    workspaceId: defaultWorkspaceId ?? workspaces[0]?.id ?? "",
    title: "",
    amount: "",
    currency: "USD",
    occurredAt: todayIso(),
    merchant: "",
    paymentMethod: "",
    notes: "",
    counterpartyName: "",
    dueDate: ""
  }));
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((f) => ({
        ...f,
        type: defaultType,
        workspaceId: defaultWorkspaceId ?? workspaces[0]?.id ?? f.workspaceId
      }));
      setError(null);
    }
  }, [open, defaultType, defaultWorkspaceId, workspaces]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const isDebt = DEBT_TYPES.has(form.type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        workspaceId: form.workspaceId,
        type: form.type,
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        currency: form.currency.toUpperCase(),
        occurredAt: form.occurredAt || todayIso(),
        merchant: form.merchant.trim() || null,
        paymentMethod: form.paymentMethod.trim() || null,
        notes: form.notes.trim() || null,
        counterpartyName: form.counterpartyName.trim() || null,
        dueDate: form.dueDate || null
      };

      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json?.error ?? "Failed to save record");
        return;
      }

      onSaved?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add money record"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-[1.75rem] bg-[#111827] px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 shadow-2xl md:inset-0 md:m-auto md:h-fit md:max-w-lg md:rounded-[1.75rem]"
      >
        {/* Drag handle (mobile) */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 md:hidden" />

        <h2 className="mb-5 text-xl font-semibold tracking-tight">Add Record</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Type picker */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Type</label>
            <select
              className="w-full rounded-xl bg-white/6 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              value={form.type}
              onChange={set("type")}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.emoji} {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Workspace */}
          {workspaces.length > 1 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Workspace</label>
              <select
                className="w-full rounded-xl bg-white/6 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                value={form.workspaceId}
                onChange={set("workspaceId")}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block text-xs font-medium text-white/50">Title *</label>
              <input
                required
                className="w-full rounded-xl bg-white/6 px-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                placeholder="e.g. Coffee, Rent…"
                value={form.title}
                onChange={set("title")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Amount *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                className="w-full rounded-xl bg-white/6 px-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                placeholder="0.00"
                value={form.amount}
                onChange={set("amount")}
              />
            </div>
          </div>

          {/* Counterparty (debt only) */}
          {isDebt && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">
                {form.type === MoneyRecordType.DEBT_GIVEN ? "Who owes you?" : "Who do you owe?"}
              </label>
              <input
                className="w-full rounded-xl bg-white/6 px-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                placeholder="Name or organisation"
                value={form.counterpartyName}
                onChange={set("counterpartyName")}
              />
            </div>
          )}

          {/* Merchant (non-debt only) */}
          {!isDebt && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Merchant</label>
              <input
                className="w-full rounded-xl bg-white/6 px-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                placeholder="Store, vendor…"
                value={form.merchant}
                onChange={set("merchant")}
              />
            </div>
          )}

          {/* Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Date *</label>
              <input
                required
                type="date"
                className="w-full rounded-xl bg-white/6 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                value={form.occurredAt}
                onChange={set("occurredAt")}
              />
            </div>
            {isDebt && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Due date</label>
                <input
                  type="date"
                  className="w-full rounded-xl bg-white/6 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                  value={form.dueDate}
                  onChange={set("dueDate")}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Notes</label>
            <textarea
              rows={2}
              className="w-full resize-none rounded-xl bg-white/6 px-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              placeholder="Optional notes…"
              value={form.notes}
              onChange={set("notes")}
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/70 hover:bg-white/5 active:scale-95 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-[var(--brand-600)] py-3 text-sm font-semibold text-white hover:bg-[var(--brand-500)] active:scale-95 transition disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save Record"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
