"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { Sidebar } from "./sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { GlobalSearchPalette } from "./global-search";
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
  const [searchOpen, setSearchOpen] = React.useState(false);

  // ⌘K / Ctrl+K global shortcut
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {(topBarRight || topBarTitle) && (
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/5 bg-[#0b1020]/80 px-5 py-4 backdrop-blur md:px-8">
            <div className="min-w-0 flex-1">{topBarTitle}</div>
            <div className="flex items-center gap-2">
              {/* Search trigger */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition"
                aria-label="Open search (⌘K)"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden rounded bg-white/8 px-1.5 py-0.5 font-mono text-[10px] sm:block">⌘K</kbd>
              </button>
              {topBarRight ? <div className="flex-none">{topBarRight}</div> : null}
            </div>
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

      <GlobalSearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
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
