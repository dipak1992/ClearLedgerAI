"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceRole } from "@prisma/client";

import { Button } from "@/components/ui/button";

interface InviteFormProps {
  workspaceId: string;
}

export function InviteMemberForm({ workspaceId }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>(WorkspaceRole.EDITOR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role })
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to invite member");
      setEmail("");
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1.5 block text-xs text-white/50">Email address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@example.com"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-white/50">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as WorkspaceRole)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--brand-500)]"
        >
          <option value={WorkspaceRole.EDITOR}>Editor</option>
          <option value={WorkspaceRole.VIEWER}>Viewer</option>
          <option value={WorkspaceRole.ADMIN}>Admin</option>
        </select>
      </div>
      <Button type="submit" disabled={loading || !email.trim()}>
        {loading ? "Inviting…" : "Invite"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {success && <p className="mt-1 text-xs text-emerald-400">Invite sent ✓</p>}
    </form>
  );
}
