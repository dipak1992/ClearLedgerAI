const plans = [
  {
    name: "Free",
    price: "$0",
    description: "One workspace for getting your money records under control.",
    features: ["1 workspace", "30 AI scans per month", "10 debt records", "Basic split tracking"]
  },
  {
    name: "Pro",
    price: "$9",
    description: "For people who want imports, reports, and unlimited debt tracking.",
    features: ["Unlimited workspaces", "500 AI scans", "Unlimited debts", "Exports and reminders"]
  },
  {
    name: "Family",
    price: "$15",
    description: "Shared money clarity for households and couples.",
    features: ["Up to 6 members", "Family money hub", "Advanced split flows", "Household insights"]
  },
  {
    name: "Business",
    price: "$24",
    description: "For freelancers and small teams tracking reimbursements and unpaid balances.",
    features: ["Team members", "Customer credit tracking", "Advanced reports", "Tax exports"]
  }
];

export default function PricingPage() {
  return (
    <main className="min-h-screen px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm uppercase tracking-[0.2em] text-white/40">Pricing</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Plans built for real-life money tracking.</h1>
          <p className="mt-4 text-base leading-8 text-[var(--muted)]">
            Start simple, then scale into shared workspaces, reports, reminders, and AI-powered imports as your money setup grows.
          </p>
        </div>

        <section className="grid gap-5 lg:grid-cols-4">
          {plans.map((plan) => (
            <article className="card-surface rounded-[1.75rem] p-6" key={plan.name}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">{plan.name}</h2>
                <span className="rounded-full bg-white/8 px-3 py-1 text-sm text-white/60">/ month</span>
              </div>
              <p className="mt-5 text-4xl font-semibold text-[var(--brand-500)]">{plan.price}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{plan.description}</p>
              <div className="mt-5 space-y-3 text-sm text-white/75">
                {plan.features.map((feature) => (
                  <p key={feature}>{feature}</p>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}