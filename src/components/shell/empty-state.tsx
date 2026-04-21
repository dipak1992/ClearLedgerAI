import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("flex flex-col items-center gap-3 py-12 text-center", className)}>
      {icon ? <div className="text-white/30">{icon}</div> : null}
      <p className="text-base font-medium text-white">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-white/60">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </Card>
  );
}
