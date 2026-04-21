import { AuthActions } from "@/components/auth/auth-actions";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
      <div className="card-surface w-full max-w-md rounded-[2rem] p-7">
        <p className="text-sm uppercase tracking-[0.2em] text-white/40">Authentication</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to ClearLedger AI</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Continue with Google or request a secure email sign-in link powered by Auth.js.
        </p>

        <div className="mt-8">
          <AuthActions />
        </div>
      </div>
    </main>
  );
}