"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
}

interface ParsedResult {
  title: string;
  amount: number;
  merchant?: string;
  category?: string;
  transactionDate?: string;
  type?: string;
  counterpartyName?: string;
}

interface AiImportWidgetProps {
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
}

const MODES = [
  { value: "note", label: "Quick Note" },
  { value: "receipt", label: "Receipt Text" },
  { value: "bank", label: "Bank Message" },
  { value: "chat", label: "Chat / Debt" },
] as const;

type ModeValue = (typeof MODES)[number]["value"];

const PLACEHOLDERS: Record<ModeValue, string> = {
  note: "Paid $45 for dinner at Olive Garden on Thursday…",
  receipt: "Total: $24.50 — Starbucks — 2024-01-15…",
  bank: "Payment of $200 to Netflix on Jan 15…",
  chat: "Lent $200 to John for rent, due Feb 1…",
};

export function AiImportWidget({
  workspaces,
  defaultWorkspaceId,
}: AiImportWidgetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState(
    defaultWorkspaceId ?? workspaces[0]?.id ?? ""
  );
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ModeValue>("note");
  const [preview, setPreview] = useState<ParsedResult | null>(null);

  function handleClose() {
    setOpen(false);
    setError(null);
    setInput("");
    setPreview(null);
  }

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          input: input.trim(),
          mode,
          persist: false,
        }),
      });
      const json = (await res.json()) as {
        data?: ParsedResult;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to parse");
      if (!json.data) throw new Error("No data returned from AI");
      setPreview(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          input: input.trim(),
          mode,
          persist: true,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      handleClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  if (workspaces.length === 0) return null;

  return (
    <>
      <button
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-medium text-[var(--accent)] ring-1 ring-[var(--accent)]/30 transition hover:bg-[var(--accent)]/20"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI Import
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
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">AI Import</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Describe a transaction and AI extracts the details.
                </p>
              </div>
              <button
                className="rounded-full p-1 text-white/30 transition hover:text-white/60"
                onClick={handleClose}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    mode === m.value
                      ? "bg-[var(--accent)] font-semibold text-black"
                      : "bg-white/8 text-[var(--muted)] ring-1 ring-white/10 hover:bg-white/12"
                  }`}
                  key={m.value}
                  onClick={() => {
                    setMode(m.value);
                    setPreview(null);
                  }}
                  type="button"
                >
                  {m.label}
                </button>
              ))}
            </div>

            {!preview ? (
              <form className="flex flex-col gap-4" onSubmit={handleParse}>
                {workspaces.length > 1 && (
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
                )}
                <textarea
                  autoFocus
                  className="h-28 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={PLACEHOLDERS[mode]}
                  required
                  value={input}
                />
                {error && (
                  <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                    {error}
                  </p>
                )}
                <button
                  className="rounded-full bg-[var(--accent)] py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
                  disabled={loading || !input.trim()}
                  type="submit"
                >
                  {loading ? "Parsing…" : "Parse with AI"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                    AI Extracted
                  </p>
                  <p className="text-base font-semibold text-white">
                    {preview.title}
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-[var(--brand-500)]">
                    ${preview.amount.toFixed(2)}
                  </p>
                  {preview.merchant && (
                    <p className="mt-1.5 text-sm text-white/60">
                      {preview.merchant}
                    </p>
                  )}
                  {preview.transactionDate && (
                    <p className="mt-0.5 text-xs text-white/40">
                      {new Date(preview.transactionDate).toLocaleDateString(
                        "en-US",
                        { month: "long", day: "numeric", year: "numeric" }
                      )}
                    </p>
                  )}
                  {preview.type && (
                    <span className="mt-2 inline-block rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-white/60">
                      {preview.type}
                    </span>
                  )}
                </div>
                {error && (
                  <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                    {error}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    className="flex-1 rounded-full bg-[var(--brand-600)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    disabled={loading}
                    onClick={handleConfirm}
                    type="button"
                  >
                    {loading ? "Saving…" : "Confirm & Save"}
                  </button>
                  <button
                    className="rounded-full bg-white/8 px-5 py-2.5 text-sm font-medium text-[var(--muted)] ring-1 ring-white/10 transition hover:bg-white/12"
                    onClick={() => setPreview(null)}
                    type="button"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
