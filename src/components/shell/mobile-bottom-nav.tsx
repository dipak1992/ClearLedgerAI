"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, Plus, LineChart, Settings as SettingsIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface MobileNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: (pathname: string) => boolean;
}

const ICON_CLS = "h-5 w-5";

export const DEFAULT_MOBILE_NAV: MobileNavItem[] = [
  { href: "/dashboard", label: "Home", icon: <Home className={ICON_CLS} /> },
  {
    href: "/workspaces",
    label: "Workspaces",
    icon: <FolderKanban className={ICON_CLS} />,
    match: (p) => p.startsWith("/workspaces")
  },
  // The center "Add" slot is a button, rendered separately below.
  {
    href: "/insights",
    label: "Insights",
    icon: <LineChart className={ICON_CLS} />,
    match: (p) => p.startsWith("/insights") || p.startsWith("/reports")
  },
  { href: "/settings", label: "Settings", icon: <SettingsIcon className={ICON_CLS} /> }
];

export interface MobileBottomNavProps {
  /** Click handler for the center "Add" button. */
  onAdd?: () => void;
  items?: MobileNavItem[];
}

/**
 * Bottom navigation for small screens (<md). Hidden on desktop.
 * Center slot is reserved for the "+ Add Record" FAB.
 */
export function MobileBottomNav({ onAdd, items = DEFAULT_MOBILE_NAV }: MobileBottomNavProps) {
  const pathname = usePathname() ?? "/";
  const [first, second, third, fourth] = items;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0b1020]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end">
        <BottomItem item={first} pathname={pathname} />
        <BottomItem item={second} pathname={pathname} />
        <li className="flex justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add record"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-600)] text-white shadow-[0_16px_40px_rgba(49,180,147,0.45)] transition active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
        </li>
        <BottomItem item={third} pathname={pathname} />
        <BottomItem item={fourth} pathname={pathname} />
      </ul>
    </nav>
  );
}

function BottomItem({ item, pathname }: { item: MobileNavItem | undefined; pathname: string }) {
  if (!item) return <li />;
  const active = item.match ? item.match(pathname) : pathname === item.href;
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "flex min-h-14 flex-col items-center justify-center gap-1 px-2 pt-2 pb-3 text-[11px] font-medium transition",
          active ? "text-[var(--brand-500)]" : "text-white/60 hover:text-white/90"
        )}
      >
        <span aria-hidden="true">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    </li>
  );
}
