import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "positive" | "negative" | "accent";
}

const toneClass: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "text-white",
  positive: "text-emerald-400",
  negative: "text-red-400",
  accent: "text-[var(--brand-500)]"
};

export function StatTile({ label, value, hint, icon, tone = "default", className, ...rest }: StatTileProps) {
  return (
    <Card className={cn("flex flex-col gap-3", className)} {...rest}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-white/50">{label}</p>
        {icon ? <span className="text-white/60">{icon}</span> : null}
      </div>
      <p className={cn("text-2xl font-semibold tabular-nums sm:text-3xl", toneClass[tone])}>{value}</p>
      {hint ? <p className="text-xs text-[var(--muted)]">{hint}</p> : null}
    </Card>
  );
}
