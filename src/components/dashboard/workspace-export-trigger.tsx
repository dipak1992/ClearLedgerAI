"use client";

import { Download, FileSpreadsheet, FileText, Globe2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExportFormat = "pdf" | "excel" | "csv" | "word" | "google_sheets";
type DateRange = "all" | "this_month" | "last_month" | "custom";
type CsvVariant = "combined" | "transactions" | "debts";

interface WorkspaceExportTriggerProps {
  workspace: { id: string; name: string };
  triggerLabel?: string;
  triggerClassName?: string;
  triggerContent?: React.ReactNode;
  triggerVariant?: "default" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "lg";
  showQuickExport?: boolean;
}

interface ExportSettings {
  format: ExportFormat;
  dateRange: DateRange;
  customStart?: string;
  customEnd?: string;
  includeSummary: boolean;
  includeTransactions: boolean;
  includeDebts: boolean;
  includeNotes: boolean;
  includeMembers: boolean;
  includeCharts: boolean;
  csvVariant: CsvVariant;
}

const STORAGE_KEY = "clearledger:last-workspace-export";

const FORMAT_OPTIONS: Array<{
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  { value: "pdf", label: "PDF", description: "Premium report", icon: <FileText className="h-4 w-4" /> },
  { value: "excel", label: "Excel", description: "Workbook with tabs", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { value: "csv", label: "CSV", description: "Simple raw data", icon: <Download className="h-4 w-4" /> },
  { value: "word", label: "Word", description: "Shareable doc", icon: <FileText className="h-4 w-4" /> },
  { value: "google_sheets", label: "Google Sheets", description: "Open with Sheets", icon: <Globe2 className="h-4 w-4" /> }
];

function baseSettings(format: ExportFormat = "pdf"): ExportSettings {
  return {
    format,
    dateRange: "all",
    includeSummary: true,
    includeTransactions: true,
    includeDebts: true,
    includeNotes: true,
    includeMembers: true,
    includeCharts: format === "pdf",
    csvVariant: "combined"
  };
}

function readStoredSettings() {
  if (typeof window === "undefined") {
    return { settings: baseSettings(), lastFormat: null as ExportFormat | null };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { settings: baseSettings(), lastFormat: null as ExportFormat | null };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ExportSettings>;
    return {
      settings: {
        ...baseSettings(),
        ...parsed,
        includeCharts: parsed.format === "pdf" ? parsed.includeCharts ?? true : false
      },
      lastFormat: parsed.format ?? null
    };
  } catch {
    return { settings: baseSettings(), lastFormat: null as ExportFormat | null };
  }
}

export function WorkspaceExportTrigger({
  workspace,
  triggerLabel = "Export Workspace",
  triggerClassName,
  triggerContent,
  triggerVariant = "secondary",
  triggerSize = "default",
  showQuickExport = true
}: WorkspaceExportTriggerProps) {
  const stored = readStoredSettings();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>(stored.settings);
  const [lastFormat, setLastFormat] = useState<ExportFormat | null>(stored.lastFormat);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedFormat = useMemo(
    () => FORMAT_OPTIONS.find((option) => option.value === settings.format) ?? FORMAT_OPTIONS[0],
    [settings.format]
  );

  function updateSettings(patch: Partial<ExportSettings>) {
    setSettings((current) => {
      const next = { ...current, ...patch };
      if (patch.format && patch.format !== "pdf") next.includeCharts = false;
      if (patch.format === "pdf" && current.includeCharts === false) next.includeCharts = true;
      return next;
    });
  }

  function persistSettings(next: ExportSettings) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setLastFormat(next.format);
  }

  async function runExport(currentSettings: ExportSettings) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentSettings)
      });

      if (currentSettings.format === "google_sheets") {
        const payload = await res.json() as { error?: string; openUrl?: string; suggestedFileName?: string; csvContent?: string };
        if (!res.ok || !payload.openUrl || !payload.csvContent || !payload.suggestedFileName) {
          throw new Error(payload.error ?? "Export failed. Please try again.");
        }

        const blob = new Blob([payload.csvContent], { type: "text/csv;charset=utf-8" });
        downloadBlob(blob, payload.suggestedFileName);
        window.open(payload.openUrl, "_blank", "noopener,noreferrer");
        persistSettings(currentSettings);
        setToast("CSV downloaded. Google Sheets opened in a new tab.");
        return true;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "Export failed. Please try again.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const suggestedName = disposition?.match(/filename="(.+)"/)?.[1] ?? `${workspace.name}-export`;
      downloadBlob(blob, suggestedName);
      persistSettings(currentSettings);
      setToast(`Downloaded ${selectedFormat.label} export.`);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed. Please try again.";
      setError(message);
      setToast("Export failed. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function quickExport() {
    const saved = lastFormat ? { ...settings, format: lastFormat, includeCharts: lastFormat === "pdf" ? settings.includeCharts : false } : settings;
    await runExport(saved);
  }

  return (
    <>
      {toast ? (
        <div className="fixed right-4 top-4 z-[70] rounded-2xl border border-white/10 bg-[#12192a] px-4 py-3 text-sm text-white shadow-2xl">
          {toast}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {triggerContent ? (
          <button className={cn(triggerClassName)} onClick={() => setOpen(true)} type="button">
            {triggerContent}
          </button>
        ) : (
          <Button className={triggerClassName} onClick={() => setOpen(true)} size={triggerSize} variant={triggerVariant}>
            {triggerLabel}
          </Button>
        )}

        {showQuickExport && lastFormat ? (
          <Button
            className="gap-2"
            disabled={loading}
            onClick={() => { void quickExport(); }}
            size={triggerSize}
            variant="ghost"
          >
            Quick {lastFormat === "google_sheets" ? "Sheets" : lastFormat.toUpperCase()}
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="card-surface w-full max-w-2xl rounded-[2rem] p-5 sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Export Workspace: {workspace.name}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Take your records anywhere.</p>
              </div>
              <button
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/6 text-white/60 transition hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Choose Format</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {FORMAT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={cn(
                        "flex min-h-24 flex-col items-start justify-between rounded-2xl border px-4 py-3 text-left transition",
                        settings.format === option.value
                          ? "border-[var(--brand-500)] bg-[var(--brand-600)]/10 text-white"
                          : "border-white/10 bg-white/4 text-white/70 hover:bg-white/8"
                      )}
                      onClick={() => updateSettings({ format: option.value })}
                      type="button"
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        {option.icon}
                        {option.label}
                      </span>
                      <span className="text-xs text-white/45">{option.description}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Include</p>
                  <div className="space-y-2">
                    <ToggleRow checked={settings.includeSummary} label="Include Summary" onChange={(checked) => updateSettings({ includeSummary: checked })} />
                    <ToggleRow checked={settings.includeTransactions} label="Include Transactions" onChange={(checked) => updateSettings({ includeTransactions: checked })} />
                    <ToggleRow checked={settings.includeDebts} label="Include Debts" onChange={(checked) => updateSettings({ includeDebts: checked })} />
                    <ToggleRow checked={settings.includeNotes} label="Include Notes" onChange={(checked) => updateSettings({ includeNotes: checked })} />
                    <ToggleRow checked={settings.includeMembers} label="Include Members" onChange={(checked) => updateSettings({ includeMembers: checked })} />
                    {settings.format === "pdf" ? (
                      <ToggleRow checked={settings.includeCharts} label="Include Charts" onChange={(checked) => updateSettings({ includeCharts: checked })} />
                    ) : null}
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Date Range</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        { value: "all", label: "All time" },
                        { value: "this_month", label: "This month" },
                        { value: "last_month", label: "Last month" },
                        { value: "custom", label: "Custom range" }
                      ].map((option) => (
                        <button
                          key={option.value}
                          className={cn(
                            "min-h-11 rounded-xl border px-4 py-2 text-sm transition",
                            settings.dateRange === option.value
                              ? "border-[var(--brand-500)] bg-[var(--brand-600)]/10 text-white"
                              : "border-white/10 bg-white/4 text-white/70 hover:bg-white/8"
                          )}
                          onClick={() => updateSettings({ dateRange: option.value as DateRange })}
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {settings.dateRange === "custom" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Start Date"
                        type="date"
                        value={settings.customStart ?? ""}
                        onChange={(value) => updateSettings({ customStart: value })}
                      />
                      <Field
                        label="End Date"
                        type="date"
                        value={settings.customEnd ?? ""}
                        onChange={(value) => updateSettings({ customEnd: value })}
                      />
                    </div>
                  ) : null}

                  {settings.format === "csv" ? (
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">CSV Type</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {[
                          { value: "combined", label: "Combined CSV" },
                          { value: "transactions", label: "Transactions CSV" },
                          { value: "debts", label: "Debts CSV" }
                        ].map((option) => (
                          <button
                            key={option.value}
                            className={cn(
                              "min-h-11 rounded-xl border px-3 py-2 text-sm transition",
                              settings.csvVariant === option.value
                                ? "border-[var(--brand-500)] bg-[var(--brand-600)]/10 text-white"
                                : "border-white/10 bg-white/4 text-white/70 hover:bg-white/8"
                            )}
                            onClick={() => updateSettings({ csvVariant: option.value as CsvVariant })}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              {error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p> : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button onClick={() => setOpen(false)} type="button" variant="secondary">
                  Cancel
                </Button>
                <Button
                  className="gap-2"
                  disabled={loading || (settings.dateRange === "custom" && (!settings.customStart || !settings.customEnd))}
                  onClick={() => {
                    void runExport(settings).then((success) => {
                      if (success) setOpen(false);
                    });
                  }}
                  type="button"
                >
                  {loading ? "Preparing export..." : settings.format === "google_sheets" ? "Send to Sheets" : "Export Now"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ToggleRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center justify-between rounded-xl border border-white/10 bg-white/4 px-4 py-2 text-sm text-white/80">
      <span>{label}</span>
      <input
        checked={checked}
        className="h-4 w-4 accent-[var(--brand-500)]"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-white/60">{label}</label>
      <input
        className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)] [color-scheme:dark]"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </div>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
