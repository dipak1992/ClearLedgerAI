import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card surface shared across the mobile-first shell. Renders as a
 * translucent rounded container that matches the existing
 * `card-surface` class but as a first-class component.
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("card-surface rounded-[1.5rem] p-5 sm:p-6", className)}
        {...props}
      />
    );
  }
);
