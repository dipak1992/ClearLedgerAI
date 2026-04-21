"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, LineChart, Settings as SettingsIcon, Wallet, Receipt } from "lucide-react";

import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: (p: string) => boolean;
}

const SIDEBAR_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Home", icon: <Home className="h-4 w-4" /> },
  { href: "/records", label: "Records", icon: <Receipt className="h-4 w-4" />, match: (p) => p.startsWith("/records") },
  { href: "/workspaces", label: "Workspaces", icon: <FolderKanban className="h-4 w-4" />, match: (p) => p.startsWith("/workspaces") },
  { href: "/debts", label: "Debts", icon: <Wallet className="h-4 w-4" />, match: (p) => p.startsWith("/debts") },
  { href: "/insights", label: "Insights", icon: <LineChart className="h-4 w-4" />, match: (p) => p.startsWith("/insights") || p.startsWith("/reports") },
  { href: "/settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4" />, match: (p) => p.startsWith("/settings") }
];

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  return (
    <aside className="sticky top-0 hidden h-screen w-60 flex-none flex-col border-r border-white/8 bg-black/20 px-5 py-6 md:flex">
      <Link href="/dashboard" className="mb-8 block text-lg font-bold tracking-tight text-[var(--brand-500)]">
        ClearLedger
      </Link>
      <nav className="flex flex-col gap-1">
        {SIDEBAR_LINKS.map((link) => {
          const active = link.match ? link.match(pathname) : pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-[var(--brand-600)]/15 text-[var(--brand-500)]"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
