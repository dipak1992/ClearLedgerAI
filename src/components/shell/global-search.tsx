"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, Loader2 } from "lucide-react";

import { formatCurrency } from "@/lib/utils";

interface SearchResult {
  kind: "transaction" | "debt" | "workspace";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  amount: number | null;
  type: string | null;
}

interface GlobalSearchPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearchPalette({ open, onClose }: GlobalSearchPaletteProps) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQ("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  React.useEffect(() => {
    if (!q || q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          setResults(json.data ?? []);
          setActiveIndex(0);
        }
      } catch {
        // aborted or network error
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter" && results[activeIndex]) { navigate(results[activeIndex].href); return; }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="fixed left-1/2 top-[12vh] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl bg-[#111827] shadow-2xl ring-1 ring-white/10"
      >
        {/* Input row */}
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3.5">
          {loading
            ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/40" />
            : <Search className="h-4 w-4 shrink-0 text-white/40" />
          }
          <input
            ref={inputRef}
            type="text"
            placeholder="Search transactions, debts, workspaces…"
            className="flex-1 bg-transparent text-sm placeholder:text-white/30 focus:outline-none"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-[60vh] overflow-y-auto py-2">
            {results.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => navigate(r.href)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    i === activeIndex ? "bg-[var(--brand-600)]/20" : "hover:bg-white/5"
                  }`}
                >
                  <KindBadge kind={r.kind} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white">{r.title}</p>
                    <p className="truncate text-xs text-white/40">{r.subtitle}</p>
                  </div>
                  {r.amount !== null && (
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-white/70">
                      {formatCurrency(r.amount)}
                    </span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/20" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {q.length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-white/40">
            No results for &ldquo;{q}&rdquo;
          </div>
        )}

        {/* Footer hint */}
        <div className="border-t border-white/5 px-4 py-2 text-xs text-white/25 flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    transaction: { label: "TX", cls: "bg-blue-500/20 text-blue-400" },
    debt: { label: "DEBT", cls: "bg-orange-500/20 text-orange-400" },
    workspace: { label: "WS", cls: "bg-purple-500/20 text-purple-400" }
  };
  const { label, cls } = map[kind] ?? { label: "?", cls: "bg-white/10 text-white/40" };
  return (
    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>
      {label}
    </span>
  );
}
