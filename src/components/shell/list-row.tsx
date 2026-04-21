import * as React from "react";
import { cn } from "@/lib/utils";

export interface ListRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
}

/**
 * Vertically-stacked list row used for dense mobile views. Large tap
 * target (min 56px), safe on touch.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  className,
  ...rest
}: ListRowProps) {
  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-3 px-4 py-3 transition hover:bg-white/4",
        className
      )}
      {...rest}
    >
      {leading ? <div className="flex-none text-white/60">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        {subtitle ? (
          <p className="truncate text-xs text-white/50">{subtitle}</p>
        ) : null}
      </div>
      {meta ? <div className="flex-none text-xs text-white/50">{meta}</div> : null}
      {trailing ? <div className="flex-none">{trailing}</div> : null}
    </div>
  );
}
