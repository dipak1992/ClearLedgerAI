import * as React from "react";
import { cn } from "@/lib/utils";

export function SkeletonRow({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-4 w-full animate-pulse rounded-md bg-white/8",
        className
      )}
      {...rest}
    />
  );
}

export function SkeletonCard({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "card-surface flex flex-col gap-3 rounded-[1.5rem] p-5 sm:p-6",
        className
      )}
      {...rest}
    >
      <SkeletonRow className="h-3 w-24" />
      <SkeletonRow className="h-7 w-32" />
      <SkeletonRow className="h-3 w-20" />
    </div>
  );
}
