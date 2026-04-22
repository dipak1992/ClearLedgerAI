"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkspaceConfig {
  id: string;
  name: string;
  description?: string | null;
}

interface ManageWorkspaceDialogProps {
  workspace: WorkspaceConfig;
  redirectTo?: string;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerContent?: React.ReactNode;
}

export function ManageWorkspaceDialog({
  workspace,
  redirectTo = "/dashboard",
  triggerClassName,
  triggerLabel = "Edit Workspace",
  triggerContent
}: ManageWorkspaceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? "");
  const [error, setError] = useState<string | null>(null);

  function resetState() {
    setName(workspace.name);
    setDescription(workspace.description ?? "");
    setError(null);
    setConfirmDelete(false);
  }

  function closeDialog() {
    setOpen(false);
    resetState();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined
        })
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update workspace");
      closeDialog();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "DELETE"
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to delete workspace");
      closeDialog();
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
          onClick={closeDialog}
        >
          <div
            className="card-surface w-full max-w-md rounded-[2rem] p-5 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmDelete ? (
              <>
                <h2 className="text-xl font-semibold">Delete Workspace?</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  This removes the workspace and all of its transactions, debts, and members.
                </p>
                {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <Button
                    onClick={() => {
                      setConfirmDelete(false);
                      setError(null);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Back
                  </Button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-500 px-5 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading}
                    onClick={handleDelete}
                    type="button"
                  >
                    {loading ? "Deleting…" : "Delete Workspace"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold">Edit Workspace</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Update the workspace name or description, or remove it entirely.
                </p>

                <form className="mt-6 flex flex-col gap-4" onSubmit={handleSave}>
                  <div>
                    <label className="mb-1.5 block text-sm text-white/60">Name *</label>
                    <input
                      autoFocus
                      className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                      maxLength={80}
                      minLength={2}
                      onChange={(e) => setName(e.target.value)}
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
                      rows={3}
                      value={description}
                    />
                  </div>

                  {error ? <p className="text-sm text-red-400">{error}</p> : null}

                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => {
                        setConfirmDelete(true);
                        setError(null);
                      }}
                      type="button"
                    >
                      Delete Workspace
                    </button>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                      <Button onClick={closeDialog} type="button" variant="secondary">
                        Cancel
                      </Button>
                      <Button disabled={loading || !name.trim()} type="submit">
                        {loading ? "Saving…" : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
