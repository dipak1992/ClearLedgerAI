export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
      <div className="card-surface w-full max-w-md rounded-[2rem] p-7">
        <p className="text-sm uppercase tracking-[0.2em] text-white/40">Authentication</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to ClearLedger AI</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Supabase email and Google auth wiring will land on top of this route in the next implementation pass.
        </p>

        <div className="mt-8 space-y-3">
          <button className="flex h-12 w-full items-center justify-center rounded-full bg-[var(--brand-600)] font-medium text-slate-950 transition hover:bg-[var(--brand-500)]" type="button">
            Continue with Google
          </button>
          <button className="flex h-12 w-full items-center justify-center rounded-full border border-white/10 bg-white/5 font-medium text-white transition hover:bg-white/10" type="button">
            Continue with Email
          </button>
        </div>
      </div>
    </main>
  );
}