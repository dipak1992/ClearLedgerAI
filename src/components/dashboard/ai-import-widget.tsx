"use client";

import { ImageIcon, Loader2, Sparkles, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Workspace {
  id: string;
  name: string;
}

interface Props {
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
}

type InputTab = "text" | "image" | "camera";
type TextMode = "note" | "receipt" | "bank" | "chat";

interface ParsedPreview {
  title: string;
  amount: string;
  merchant: string;
  category: string;
  transactionDate: string;
  paymentMethod: string;
  currency: string;
  type: "TRANSACTION" | "DEBT";
  transactionType: "EXPENSE" | "INCOME" | "TRANSFER" | "REIMBURSEMENT";
  debtType: string;
  counterpartyName: string;
  notes: string;
  confidence?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toEditablePreview(data: Record<string, unknown>): ParsedPreview {
  return {
    title: String(data.title ?? ""),
    amount: String(data.amount ?? ""),
    merchant: String(data.merchant ?? ""),
    category: String(data.category ?? ""),
    transactionDate: data.transactionDate
      ? String(data.transactionDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    paymentMethod: String(data.paymentMethod ?? ""),
    currency: String(data.currency ?? "USD"),
    type: data.type === "DEBT" ? "DEBT" : "TRANSACTION",
    transactionType:
      data.transactionType === "INCOME" ||
      data.transactionType === "TRANSFER" ||
      data.transactionType === "REIMBURSEMENT"
        ? data.transactionType
        : "EXPENSE",
    debtType: String(data.debtType ?? "LENT"),
    counterpartyName: String(data.counterpartyName ?? ""),
    notes: String(data.notes ?? ""),
    confidence: typeof data.confidence === "number" ? data.confidence : undefined,
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.8
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : score >= 0.5
        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        : "bg-red-500/20 text-red-400 border-red-500/30";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}>
      {pct}% confidence
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AiImportWidget({ workspaces, defaultWorkspaceId }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "preview">("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Input state
  const [inputTab, setInputTab] = useState<InputTab>("text");
  const [textMode, setTextMode] = useState<TextMode>("note");
  const [textInput, setTextInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageThumbnail, setImageThumbnail] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId ?? workspaces[0]?.id ?? "");

  // Preview / edit state
  const [preview, setPreview] = useState<ParsedPreview | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ── Reset ────────────────────────────────────────────────────────────────

  function reset() {
    setStep("input");
    setError(null);
    setTextInput("");
    setImageFile(null);
    setImageThumbnail(null);
    setPreview(null);
    setInputTab("text");
    setTextMode("note");
    setWorkspaceId(defaultWorkspaceId ?? workspaces[0]?.id ?? "");
  }

  // ── Image handling ────────────────────────────────────────────────────────

  async function handleFileSelected(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported. For PDFs, take a screenshot and upload that.");
      return;
    }

    setError(null);
    setImageFile(file);

    // Generate thumbnail for preview
    const dataUrl = await fileToDataUrl(file);
    setImageThumbnail(dataUrl);
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) await handleFileSelected(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Extract with AI ───────────────────────────────────────────────────────

  async function handleExtract() {
    setError(null);
    setLoading(true);

    try {
      const isImageMode = inputTab === "image" || inputTab === "camera";

      if (isImageMode && !imageFile) {
        setError("Please select an image first.");
        setLoading(false);
        return;
      }

      if (!isImageMode && textInput.trim().length < 4) {
        setError("Please enter at least a few words to describe the transaction.");
        setLoading(false);
        return;
      }

      const body: Record<string, unknown> = {
        workspaceId,
        persist: false,
        mode: isImageMode
          ? inputTab === "camera"
            ? "camera"
            : "screenshot"
          : textMode,
      };

      if (isImageMode && imageFile) {
        body.imageData = await fileToDataUrl(imageFile);
      } else {
        body.input = textInput;
      }

      const res = await fetch("/api/ai/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || !json.data) {
        setError(json.error ?? "AI extraction failed. Please try again.");
        return;
      }

      setPreview(toEditablePreview(json.data as Record<string, unknown>));
      setStep("preview");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!preview) return;
    if (!preview.title.trim()) {
      setError("Add a title before saving.");
      return;
    }
    if (!(Number(preview.amount) > 0)) {
      setError("AI import needs a valid amount before it can be saved.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const editedData = {
        title: preview.title.trim(),
        amount: Number(preview.amount),
        merchant: preview.merchant || undefined,
        category: preview.category || undefined,
        paymentMethod: preview.paymentMethod || undefined,
        currency: preview.currency || "USD",
        transactionDate: preview.transactionDate || undefined,
        type: preview.type,
        transactionType: preview.type === "TRANSACTION" ? preview.transactionType : undefined,
        debtType: preview.type === "DEBT" ? (preview.debtType || "LENT") : undefined,
        counterpartyName: preview.type === "DEBT" ? (preview.counterpartyName || "Unknown") : undefined,
        notes: preview.notes || undefined,
        confidence: preview.confidence,
      };

      const res = await fetch("/api/ai/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          persist: true,
          mode: textMode,
          editedData,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to save. Please try again.");
        return;
      }

      setOpen(false);
      reset();
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (!open) {
    return (
      <Button
        className="gap-2"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4 text-[var(--accent)]" />
        AI Import
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { setOpen(false); reset(); }}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-[1.75rem] border border-white/10 bg-[#131929] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-semibold text-white">
              {step === "input" ? "AI Import" : "Review & Edit"}
            </h2>
          </div>
          <button
            className="rounded-full p-1 text-white/40 transition hover:bg-white/8 hover:text-white"
            onClick={() => { setOpen(false); reset(); }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6">
          {/* ── Step 1: Input ──────────────────────────────────────────── */}
          {step === "input" && (
            <div className="space-y-5">
              {/* Workspace selector */}
              {workspaces.length > 1 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">Workspace</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--brand-500)] focus:outline-none"
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                  >
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Input type tabs */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Input type</label>
                <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
                  {(["text", "image", "camera"] as InputTab[]).map((tab) => (
                    <button
                      key={tab}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-medium transition ${
                        inputTab === tab
                          ? "bg-white/10 text-white"
                          : "text-white/40 hover:text-white/70"
                      }`}
                      onClick={() => { setInputTab(tab); setError(null); }}
                    >
                      {tab === "text" && <span>📝</span>}
                      {tab === "image" && <ImageIcon className="h-3.5 w-3.5" />}
                      {tab === "camera" && <span>📷</span>}
                      <span>{tab === "camera" ? "Camera" : tab === "image" ? "Upload" : "Text"}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text input */}
              {inputTab === "text" && (
                <div className="space-y-3">
                  {/* Text mode pills */}
                  <div className="flex flex-wrap gap-2">
                    {(["note", "receipt", "bank", "chat"] as TextMode[]).map((m) => (
                      <button
                        key={m}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          textMode === m
                            ? "bg-[var(--brand-600)] text-white"
                            : "bg-white/8 text-white/60 hover:bg-white/12 hover:text-white"
                        }`}
                        onClick={() => setTextMode(m)}
                      >
                        {m === "note" && "📝 Note"}
                        {m === "receipt" && "🧾 Receipt"}
                        {m === "bank" && "🏦 Bank SMS"}
                        {m === "chat" && "💬 Chat debt"}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="min-h-[120px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--brand-500)] focus:outline-none"
                    placeholder={
                      textMode === "note"
                        ? "e.g. Paid $45 for dinner at Olive Garden on Friday"
                        : textMode === "receipt"
                          ? "Paste receipt text here..."
                          : textMode === "bank"
                            ? "Paste your bank SMS or notification text..."
                            : "Paste the chat message about money owed..."
                    }
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />
                </div>
              )}

              {/* Image upload */}
              {inputTab === "image" && (
                <div>
                  <input
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFileSelected(file);
                    }}
                  />
                  {imageThumbnail ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Selected"
                        className="max-h-48 w-full rounded-xl object-contain"
                        src={imageThumbnail}
                      />
                      <button
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white/80 hover:text-white"
                        onClick={() => { setImageFile(null); setImageThumbnail(null); }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                        isDragging
                          ? "border-[var(--brand-500)] bg-[var(--brand-500)]/10"
                          : "border-white/20 hover:border-white/40"
                      }`}
                      onDragLeave={() => setIsDragging(false)}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDrop={(e) => { void handleDrop(e); }}
                    >
                      <Upload className="h-8 w-8 text-white/30" />
                      <div>
                        <p className="text-sm text-white/60">Drop a receipt or screenshot here</p>
                        <p className="mt-0.5 text-xs text-white/30">or</p>
                      </div>
                      <button
                        className="rounded-full bg-white/8 px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/12"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Browse files
                      </button>
                      <p className="text-xs text-white/25">JPG, PNG, WebP, GIF supported</p>
                    </div>
                  )}
                </div>
              )}

              {/* Camera capture */}
              {inputTab === "camera" && (
                <div>
                  <input
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={cameraInputRef}
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFileSelected(file);
                    }}
                  />
                  {imageThumbnail ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Captured"
                        className="max-h-48 w-full rounded-xl object-contain"
                        src={imageThumbnail}
                      />
                      <button
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white/80 hover:text-white"
                        onClick={() => { setImageFile(null); setImageThumbnail(null); }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-white/20 py-10 text-center">
                      <p className="text-sm text-white/60">
                        Point your camera at a receipt, bill, or handwritten note
                      </p>
                      <Button variant="secondary" onClick={() => cameraInputRef.current?.click()}>
                        📷 Open Camera
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
              )}

              <Button
                className="w-full gap-2"
                disabled={loading || (inputTab !== "text" ? !imageFile : textInput.trim().length < 4)}
                onClick={() => { void handleExtract(); }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Extract with AI
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ── Step 2: Editable Preview ───────────────────────────────── */}
          {step === "preview" && preview && (
            <div className="space-y-4">
              {/* Confidence badge */}
              {typeof preview.confidence === "number" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">AI confidence:</span>
                  <ConfidenceBadge score={preview.confidence} />
                  {preview.confidence < 0.5 && (
                    <span className="text-xs text-yellow-400">Review carefully</span>
                  )}
                </div>
              )}

              {/* Editable fields */}
              <div className="grid gap-3">
                <Field
                  label="Title"
                  value={preview.title}
                  onChange={(v) => setPreview((p) => p && { ...p, title: v })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Amount"
                    type="number"
                    value={preview.amount}
                    onChange={(v) => setPreview((p) => p && { ...p, amount: v })}
                  />
                  <Field
                    label="Currency"
                    value={preview.currency}
                    onChange={(v) => setPreview((p) => p && { ...p, currency: v })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Merchant / From"
                    value={preview.merchant}
                    onChange={(v) => setPreview((p) => p && { ...p, merchant: v })}
                  />
                  <Field
                    label="Date"
                    type="date"
                    value={preview.transactionDate}
                    onChange={(v) => setPreview((p) => p && { ...p, transactionDate: v })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Category"
                    value={preview.category}
                    onChange={(v) => setPreview((p) => p && { ...p, category: v })}
                  />
                  <Field
                    label="Payment method"
                    value={preview.paymentMethod}
                    onChange={(v) => setPreview((p) => p && { ...p, paymentMethod: v })}
                  />
                </div>

                {preview.type === "TRANSACTION" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/50">Transaction type</label>
                    <div className="flex flex-wrap gap-2">
                      {(["EXPENSE", "INCOME", "TRANSFER", "REIMBURSEMENT"] as const).map((type) => (
                        <button
                          key={type}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            preview.transactionType === type
                              ? "bg-[var(--brand-600)] text-white"
                              : "bg-white/8 text-white/60 hover:bg-white/12 hover:text-white"
                          }`}
                          onClick={() => setPreview((p) => p && { ...p, transactionType: type })}
                          type="button"
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Type toggle */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">Type</label>
                  <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
                    {(["TRANSACTION", "DEBT"] as const).map((t) => (
                      <button
                        key={t}
                        className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${
                          preview.type === t
                            ? "bg-white/10 text-white"
                            : "text-white/40 hover:text-white/70"
                        }`}
                        onClick={() => setPreview((p) => p && { ...p, type: t })}
                      >
                        {t === "TRANSACTION" ? "Transaction" : "Debt / IOU"}
                      </button>
                    ))}
                  </div>
                </div>

                {preview.type === "DEBT" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Person (counterparty)"
                      value={preview.counterpartyName}
                      onChange={(v) => setPreview((p) => p && { ...p, counterpartyName: v })}
                    />
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white/50">Debt type</label>
                      <select
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--brand-500)] focus:outline-none"
                        value={preview.debtType}
                        onChange={(e) => setPreview((p) => p && { ...p, debtType: e.target.value })}
                      >
                        <option value="LENT">I lent</option>
                        <option value="BORROWED">I borrowed</option>
                        <option value="CUSTOMER_UNPAID">Customer unpaid</option>
                        <option value="ADVANCE_PAYMENT">Advance payment</option>
                        <option value="REIMBURSEMENT_PENDING">Reimbursement</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">Notes</label>
                  <textarea
                    className="min-h-[72px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[var(--brand-500)] focus:outline-none"
                    placeholder="Optional notes…"
                    value={preview.notes}
                    onChange={(e) => setPreview((p) => p && { ...p, notes: e.target.value })}
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => { setStep("input"); setError(null); }}
                >
                  ← Back
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={saving || !preview.title.trim() || !preview.amount || Number(preview.amount) <= 0}
                  onClick={() => { void handleSave(); }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save record"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Field helper component ───────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number" | "date";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-white/50">{label}</label>
      <input
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[var(--brand-500)] focus:outline-none"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
