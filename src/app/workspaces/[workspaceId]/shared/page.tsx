export default async function SharedWorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-[0.2em] text-white/40">Shared Workspace</p>
        <h1 className="mt-2 text-4xl font-semibold">{workspaceId} members</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Invite users by email, assign Admin/Editor/Viewer permissions, and keep a shared timeline for edits, comments, and payment updates.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {["Admin", "Editor", "Viewer"].map((role) => (
            <div className="card-surface rounded-3xl p-5" key={role}>
              <p className="text-sm text-white/50">Role</p>
              <p className="mt-2 text-2xl font-semibold">{role}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
