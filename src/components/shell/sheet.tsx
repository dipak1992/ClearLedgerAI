"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  /**
   * On desktop the sheet can render as a centered dialog. Default
   * behavior slides up from the bottom on mobile and centers above md.
   */
  size?: "default" | "full";
}

/**
 * Mobile-friendly bottom sheet built on top of Radix Dialog.
 * Slides in from the bottom on small screens; centers on desktop.
 */
export function Sheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  size = "default"
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col gap-4 card-surface outline-none",
            // Mobile: bottom sheet
            "inset-x-0 bottom-0 max-h-[90vh] rounded-t-[1.75rem] border-b-0 p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]",
            // Desktop: centered dialog
            "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[85vh] md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.75rem] md:border md:p-8",
            size === "full" && "md:max-w-3xl"
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              {title ? (
                <Dialog.Title className="text-lg font-semibold tracking-tight">
                  {title}
                </Dialog.Title>
              ) : null}
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-white/60">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
