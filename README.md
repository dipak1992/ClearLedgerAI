# ClearLedger AI

ClearLedger AI is a modern SaaS webapp for organizing transactions, shared expenses, receipts, reimbursements, and debts in one clean workspace.

## Stack

- Next.js 16 with App Router and TypeScript
- Tailwind CSS 4
- Neon PostgreSQL + Prisma
- Auth-provider-ready surface (Auth.js or Clerk)
- Stripe-ready billing env surface
- PostHog and Sentry-ready env surface

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Generate Prisma client:

   ```bash
   npm run db:generate
   ```

4. Start development:

   ```bash
   npm run dev
   ```

## Current Foundation

- Premium landing page
- Dashboard and all primary product routes (workspace ledger, shared workspace, transaction detail, debt tracker, reports, settings, admin)
- Shared UI utility layer
- Prisma schema for users, workspaces, transactions, debts, attachments, comments, subscriptions, audit logs, and notifications
- API routes for workspaces, transactions, debts, debt payments, and AI import parsing
- Server architecture layer with Prisma client, request user bootstrap, typed validators, AI prompt templates, and integration-ready Neon/Stripe/PostHog modules
- Environment template for Neon, AI providers, Stripe, PostHog, Sentry, and storage

## Next Build Steps

- Auth.js or Clerk wiring
- Workspace CRUD and invites
- AI provider-backed parsing (OpenAI/Claude/Gemini) replacing heuristic fallback
- File upload + OCR ingestion pipeline (S3/R2)
- Reports, exports, and billing controls

## Upgrade rollout

We are actively evolving the product into a mobile-first, AI-first
money clarity app. The phased, additive rollout is described in
[`docs/UPGRADE_PLAN.md`](docs/UPGRADE_PLAN.md) and every new surface is
gated behind a feature flag (see `src/lib/flags.ts`).

### Smoke checklist (run before shipping each phase)

Before tagging a release that touches any of the rollout phases,
manually verify the following against the target environment:

- [ ] **Auth** — sign in with an existing account; session persists on reload.
- [ ] **Workspaces** — create a new workspace; it appears on the dashboard.
- [ ] **Transactions** — add a transaction to a workspace; it shows in the
      recent activity list and in the workspace detail page.
- [ ] **Debts** — record a debt; it appears under `/debts` with the correct
      counterparty, amount, and status.
- [ ] **Dashboard** — `/dashboard` loads without error for an authenticated
      user, shows greeting, totals, and recent activity.
- [ ] **Pricing** — `/pricing` renders the current tiers and the checkout
      CTA still links to Stripe.
- [ ] **Money Records parity** (Phase 1+) — any new transaction or debt
      also creates a linked `MoneyRecord` row.