"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClose() {
    setOpen(false);
    setName("");
    setDescription("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined })
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create workspace");
      handleClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        + New Workspace
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="card-surface w-full max-w-md rounded-[2rem] p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold">Create Workspace</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Organize money by life area — personal, business, roommates, etc.
            </p>

            <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Name *</label>
                <input
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                  maxLength={80}
                  minLength={2}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Personal, Business, Roommates…"
                  required
                  value={name}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/60">Description</label>
                <textarea
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                  maxLength={220}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional — what this workspace tracks"
                  rows={2}
                  value={description}
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="mt-2 flex justify-end gap-3">
                <Button onClick={handleClose} type="button" variant="secondary">
                  Cancel
                </Button>
                <Button disabled={loading || !name.trim()} type="submit">
                  {loading ? "Creating…" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
