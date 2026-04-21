export default function SettingsPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm uppercase tracking-[0.2em] text-white/40">Settings</p>
        <h1 className="mt-2 text-4xl font-semibold">Workspace, billing, and notification settings</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Configure subscriptions, reminder channels, API keys, and audit visibility from this settings hub.
        </p>
      </div>
    </main>
  );
}
