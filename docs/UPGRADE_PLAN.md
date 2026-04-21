# ClearLedger AI — Upgrade Plan

ClearLedger AI is a live SaaS webapp. This document describes how we are
evolving the product from a feature-heavy ledger tool into a focused,
mobile-first, AI-first "money clarity" app **without breaking existing
auth, the Neon database, current deployments, subscriptions, or active
user data**.

## Guiding principles

- **Additive-first migrations.** Never drop or rename existing tables or
  columns in a single step. Introduce new structures alongside old ones,
  dual-write, backfill, switch reads, then retire old paths in a later
  release.
- **Keep every existing route working.** `/dashboard`, `/transactions`,
  `/debts`, `/workspaces`, `/reports`, `/pricing`, `/sign-in`,
  `/settings`, `/admin`, and every `/api/*` route stays live throughout
  the rollout. New UI lives at new routes (e.g. `/records`, `/insights`)
  until old ones are redirected.
- **Auth / Neon / Stripe untouched at the infra layer.** No changes to
  the `NextAuth` configuration, Prisma datasource URL, or Stripe webhook
  contracts. Only domain models and UI layers evolve.
- **Ship in thin vertical slices** that each build, lint, and deploy on
  their own, gated by feature flags (`src/lib/flags.ts`).

## Phases

### Phase 0 — Safety net (this PR)

- Upgrade plan doc (this file).
- Feature flag helper `src/lib/flags.ts` reading from env.
- E2E smoke checklist in `README.md`.

**Rollback:** delete the files. No user-visible change.

### Phase 1 — Unified Money Records data model (this PR)

Backend only, no UI change.

- New Prisma models: `MoneyRecord`, `MoneyRecordAttachment`,
  `MoneyRecordSplit`, `MoneyRecordPayment`.
- Nullable link columns `Transaction.moneyRecordId` and
  `Debt.moneyRecordId` so legacy rows can map 1:1 to new rows during
  dual-write.
- Domain layer in `src/lib/money-records/` — the single entrypoint that
  all new code uses.
- Dual-write in the legacy `/api/transactions` and `/api/debts` POST
  handlers. Reads continue to use the legacy tables.
- Idempotent backfill script `prisma/scripts/backfill-money-records.ts`
  that can be run manually against Neon to populate `MoneyRecord` rows
  for every existing `Transaction` and `Debt`.

**Rollback:** stop dual-write (revert the two route files). The new
tables remain empty/partial but never conflict with legacy reads.

### Phase 2 — Mobile-first shell (this PR)

UI frame, flag-gated.

- `AppShell` component with desktop sidebar and mobile bottom nav
  (Home / Workspaces / **Add** / Insights / Settings) plus a sticky
  floating `+ Add Record` button.
- Reusable primitives (`Card`, `StatTile`, `ListRow`, `Sheet`,
  `EmptyState`, `SkeletonRow`).
- `/insights` soft alias for `/reports`.
- Activated by `NEXT_PUBLIC_FLAG_MOBILE_NAV`.

**Rollback:** flip the flag off — legacy chrome is preserved.

### Phase 3 — Action-first dashboard (this PR)

- New dashboard with greeting + net-flow subtext, quick actions, and
  widgets: Money Snapshot, Owed Snapshot, Due Soon, Recent Activity,
  AI Suggestions.
- AI Suggestions use deterministic heuristics today (overdue debts,
  category spend delta vs 3-month average, duplicate merchant+amount
  within 7 days). LLM polish arrives in Phase 5.
- Gated by `NEXT_PUBLIC_FLAG_MONEY_RECORDS`. When off, the legacy
  dashboard is served unchanged.

**Rollback:** flip the flag off.

### Phase 4 — Unified Add Record flow

- `<AddRecordSheet />` component opened by the FAB and quick actions.
- New API: `POST /api/records`, `PATCH /api/records/:id`,
  `GET /api/records`.
- New `/records` page with list + filters + search.

**Rollback:** keep the flag off, delete the `/records` route, legacy
forms still work.

### Phase 5 — AI import center

- `POST /api/ai/import` accepts images, PDFs, CSV/Excel and pasted
  text, returns draft `MoneyRecord` objects for an editable preview.
- Rate limiting, MIME allowlist, and token budget logged to Sentry.

**Rollback:** disable the route behind `NEXT_PUBLIC_FLAG_AI_IMPORT`.

### Phase 6 — Debt tracker rebuild

- `/debts` becomes a card list grouped by counterparty, powered by
  debt-typed `MoneyRecord` rows.
- Remind / Mark Paid / Add Payment actions hit
  `/api/records/:id/payments`.

**Rollback:** serve the legacy `/debts` page behind the flag.

### Phase 7 — Insights center + Export center

- Rename `/reports` → `/insights` (301 redirect, same data).
- Insights widgets: monthly breakdown, 12-month cash flow, debt aging,
  subscription detector, top categories.
- Export endpoints `/api/workspaces/:id/export?format=csv|xlsx|pdf`.

**Rollback:** keep `/reports` as the canonical URL.

### Phase 8 — Shared workspaces, reminders, global search

- Workspace templates (Personal, Business, Roommates, Family, Side
  Hustle, Vacation) seed default categories.
- Invite flow via existing `WorkspaceMember.invitedEmail` + nodemailer.
- Nightly reminder cron (`/api/cron/reminders` secured by a shared
  secret).
- `⌘K` global search palette hitting `/api/search?q=`.

### Phase 9 — Cleanup & retire legacy

Only after Phases 1–8 have been in production long enough to verify
parity.

1. Flip reads in `/api/transactions` and `/api/debts` to read from
   `MoneyRecord`.
2. Mark legacy routes as deprecated in response headers; keep them
   functional for one release.
3. In a later PR, drop `Transaction`/`Debt` tables with a proper
   migration.

## Feature flags

All new surfaces read from `src/lib/flags.ts`:

| Flag                              | Controls                                            |
| --------------------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_FLAG_MONEY_RECORDS`  | Action-first dashboard, `/records` page             |
| `NEXT_PUBLIC_FLAG_MOBILE_NAV`     | `AppShell` with sidebar + bottom nav + FAB          |
| `NEXT_PUBLIC_FLAG_INSIGHTS`       | `/insights` nav label and destination               |
| `NEXT_PUBLIC_FLAG_AI_IMPORT`      | `/api/ai/import` and the AI import UI               |

A flag is considered **on** when the env var is `"1"`, `"true"`, or
`"on"` (case-insensitive). Anything else — including unset — is **off**.
