"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Sidebar } from "./sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  children: React.ReactNode;
  /** Optional top-bar right-side content (e.g., user menu, sign-out). */
  topBarRight?: React.ReactNode;
  /** Renders the greeting/title row at the top of the main column. */
  topBarTitle?: React.ReactNode;
  /**
   * Called when the user taps the mobile "+" FAB or the sticky desktop
   * action button. When omitted, the button falls back to a link to
   * `/dashboard#add` where existing quick-action dialogs live.
   */
  onAddRecord?: () => void;
}

/**
 * Mobile-first authenticated app shell. Desktop: sidebar + content.
 * Mobile: content + bottom nav + sticky FAB. Respects iOS safe-area
 * insets and uses min 44px tap targets.
 */
export function AppShell({ children, topBarRight, topBarTitle, onAddRecord }: AppShellProps) {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {(topBarRight || topBarTitle) && (
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/5 bg-[#0b1020]/80 px-5 py-4 backdrop-blur md:px-8">
            <div className="min-w-0 flex-1">{topBarTitle}</div>
            {topBarRight ? <div className="flex-none">{topBarRight}</div> : null}
          </header>
        )}
        <main
          className={cn(
            "flex-1 px-5 pt-6 sm:px-6 md:px-8 lg:px-10",
            // Bottom padding: bottom nav is ~64px + safe area on mobile.
            "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10"
          )}
        >
          {children}
        </main>
      </div>

      {/* Desktop sticky action button (hidden on mobile — FAB handles that) */}
      <FloatingAddButton onAddRecord={onAddRecord} />

      <MobileBottomNav onAdd={onAddRecord} />
    </div>
  );
}

function FloatingAddButton({ onAddRecord }: { onAddRecord?: () => void }) {
  const className =
    "fixed bottom-8 right-8 z-30 hidden h-14 items-center gap-2 rounded-full bg-[var(--brand-600)] px-6 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(49,180,147,0.45)] transition hover:bg-[var(--brand-500)] active:scale-95 md:inline-flex";

  if (onAddRecord) {
    return (
      <button type="button" className={className} onClick={onAddRecord}>
        <Plus className="h-5 w-5" />
        Add Record
      </button>
    );
  }
  return (
    <Link className={className} href="/dashboard#add">
      <Plus className="h-5 w-5" />
      Add Record
    </Link>
  );
}
