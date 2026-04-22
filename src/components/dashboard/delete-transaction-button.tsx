"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeleteTransactionButtonProps {
  transactionId: string;
  redirectTo?: string;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerContent?: React.ReactNode;
}

export function DeleteTransactionButton({
  transactionId,
  redirectTo = "/dashboard",
  triggerClassName,
  triggerLabel = "Delete Transaction",
  triggerContent
}: DeleteTransactionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE"
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to delete transaction");
      setOpen(false);
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {triggerContent ? (
        <button
          aria-label={triggerLabel}
          className={cn(triggerClassName)}
          onClick={() => setOpen(true)}
          type="button"
        >
          {triggerContent}
        </button>
      ) : (
        <Button className={triggerClassName} onClick={() => setOpen(true)} variant="secondary">
          {triggerLabel}
        </Button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          <div
            className="card-surface w-full max-w-md rounded-[2rem] p-5 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold">Delete Transaction?</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This permanently removes the transaction from your dashboard and workspace history.
            </p>

            {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-500 px-5 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
                onClick={handleDelete}
                type="button"
              >
                {loading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
