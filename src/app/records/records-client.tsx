"use client";

import * as React from "react";
import { MoneyRecordType } from "@prisma/client";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import { AddRecordSheet } from "@/components/shell/add-record-sheet";
import { EmptyState, SkeletonRow } from "@/components/shell";

interface Workspace {
  id: string;
  name: string;
}

interface RecordRow {
  id: string;
  type: MoneyRecordType;
  title: string | null;
  amount: number;
  amountPaid: number;
  currency: string;
  merchant: string | null;
  counterpartyName: string | null;
  status: string;
  occurredAt: string;
}

const TYPE_LABEL: Record<MoneyRecordType, string> = {
  EXPENSE: "Expense",
  INCOME: "Income",
  DEBT_GIVEN: "Lent",
  DEBT_BORROWED: "Borrowed",
  SPLIT_EXPENSE: "Split",
  TRANSFER: "Transfer",
  REIMBURSEMENT: "Reimbursement"
};

const TYPE_COLOR: Record<MoneyRecordType, string> = {
  EXPENSE: "bg-red-500/15 text-red-400",
  INCOME: "bg-emerald-500/15 text-emerald-400",
  DEBT_GIVEN: "bg-blue-500/15 text-blue-400",
  DEBT_BORROWED: "bg-orange-500/15 text-orange-400",
  SPLIT_EXPENSE: "bg-purple-500/15 text-purple-400",
  TRANSFER: "bg-sky-500/15 text-sky-400",
  REIMBURSEMENT: "bg-yellow-500/15 text-yellow-400"
};

const TYPE_SIGN: Record<MoneyRecordType, string> = {
  EXPENSE: "-",
  INCOME: "+",
  DEBT_GIVEN: "+",
  DEBT_BORROWED: "-",
  SPLIT_EXPENSE: "-",
  TRANSFER: "",
  REIMBURSEMENT: "+"
};

const TYPE_AMOUNT_COLOR: Record<MoneyRecordType, string> = {
  EXPENSE: "text-red-400",
  INCOME: "text-emerald-400",
  DEBT_GIVEN: "text-emerald-400",
  DEBT_BORROWED: "text-red-400",
  SPLIT_EXPENSE: "text-red-400",
  TRANSFER: "text-white",
  REIMBURSEMENT: "text-emerald-400"
};

interface RecordsClientProps {
  workspaces: Workspace[];
  defaultWorkspaceId: string;
}

export function RecordsClient({ workspaces, defaultWorkspaceId }: RecordsClientProps) {
  const [workspaceId, setWorkspaceId] = React.useState(defaultWorkspaceId);
  const [q, setQ] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<MoneyRecordType | "">("");
  const [records, setRecords] = React.useState<RecordRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);

  const fetchRecords = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ workspaceId, take: "100" });
      if (q) params.set("q", q);
      if (typeFilter) params.set("types", typeFilter);
      const res = await fetch(`/api/records?${params}`);
      if (res.ok) {
        const json = await res.json();
        setRecords(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, q, typeFilter]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRecords();
  }, [fetchRecords]);

  // Debounce q
  const [debouncedQ, setDebouncedQ] = React.useState(q);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
          <p className="mt-0.5 text-sm text-white/50">
            All money records across your workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--brand-600)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-500)] active:scale-95 transition"
        >
          <Plus className="h-4 w-4" />
          Add Record
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {workspaces.length > 1 && (
          <select
            className="rounded-xl bg-white/6 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] sm:w-48"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            className="w-full rounded-xl bg-white/6 py-2.5 pl-10 pr-4 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            placeholder="Search title, merchant, notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              onClick={() => setQ("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition ${
            filterOpen || typeFilter
              ? "bg-[var(--brand-600)] text-white"
              : "bg-white/6 text-white/70 hover:bg-white/10"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {typeFilter ? TYPE_LABEL[typeFilter as MoneyRecordType] : "Filter"}
        </button>
      </div>

      {/* Filter drawer */}
      {filterOpen && (
        <div className="flex flex-wrap gap-2">
          {(["", ...Object.values(MoneyRecordType)] as (MoneyRecordType | "")[]).map((t) => (
            <button
              key={t || "all"}
              type="button"
              onClick={() => { setTypeFilter(t); setFilterOpen(false); }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                typeFilter === t
                  ? "bg-[var(--brand-600)] text-white"
                  : "bg-white/8 text-white/60 hover:bg-white/14"
              }`}
            >
              {t ? TYPE_LABEL[t] : "All types"}
            </button>
          ))}
        </div>
      )}

      {/* Records list */}
      {loading ? (
        <div className="card-surface overflow-hidden rounded-[1.75rem]">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          title="No records found."
          description={q || typeFilter ? "Try adjusting your search or filter." : "Add your first record to get started."}
        />
      ) : (
        <div className="card-surface overflow-hidden rounded-[1.75rem]">
          <ul className="divide-y divide-white/5">
            {records.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/4">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-white">
                    {r.title ?? r.counterpartyName ?? "Untitled"}
                  </p>
                  <p className="truncate text-xs text-white/40">
                    {[r.merchant, new Date(r.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLOR[r.type]}`}>
                  {TYPE_LABEL[r.type]}
                </span>
                <span className={`shrink-0 font-semibold tabular-nums text-sm ${TYPE_AMOUNT_COLOR[r.type]}`}>
                  {TYPE_SIGN[r.type]}{formatCurrency(r.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AddRecordSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultWorkspaceId={workspaceId}
        workspaces={workspaces}
        onSaved={fetchRecords}
      />
    </div>
  );
}
