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