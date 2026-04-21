/**
 * Feature flags for the ClearLedger AI upgrade rollout.
 *
 * Every new surface introduced during the Money Records / mobile-first
 * redesign is gated behind one of these flags so we can ship "dark" and
 * enable per-environment without risking the live product.
 *
 * A flag is considered ON when the env var is `"1"`, `"true"`, or
 * `"on"` (case-insensitive). Anything else — including unset — is OFF.
 *
 * Flags must be `NEXT_PUBLIC_*` so they inline into both server and
 * client bundles consistently.
 */

const TRUTHY = new Set(["1", "true", "on", "yes"]);

function read(value: string | undefined): boolean {
  if (!value) return false;
  return TRUTHY.has(value.trim().toLowerCase());
}

export const flags = {
  /** Action-first dashboard, `/records` page, unified Money Records UI. */
  moneyRecords: read(process.env.NEXT_PUBLIC_FLAG_MONEY_RECORDS),
  /** Mobile-first `AppShell` with sidebar, bottom nav, and FAB. */
  mobileNav: read(process.env.NEXT_PUBLIC_FLAG_MOBILE_NAV),
  /** `/insights` nav label + destination (Phase 7). */
  insights: read(process.env.NEXT_PUBLIC_FLAG_INSIGHTS),
  /** `/api/ai/import` endpoint and the AI import UI (Phase 5). */
  aiImport: read(process.env.NEXT_PUBLIC_FLAG_AI_IMPORT)
} as const;

export type FeatureFlag = keyof typeof flags;

export function isEnabled(flag: FeatureFlag): boolean {
  return flags[flag];
}
