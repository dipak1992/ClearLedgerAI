"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ManageWorkspaceDialog } from "@/components/dashboard/manage-workspace-dialog";
import { WorkspaceExportTrigger } from "@/components/dashboard/workspace-export-trigger";

interface WorkspaceMobileActionsMenuProps {
  workspace: { id: string; name: string; description?: string | null };
  memberCount: number;
}

export function WorkspaceMobileActionsMenu({ workspace, memberCount }: WorkspaceMobileActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative md:hidden" ref={containerRef}>
      <button
        aria-label="Workspace actions"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 bg-white/4 text-white/70 transition hover:bg-white/8 hover:text-white"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-64 rounded-2xl border border-white/10 bg-[#111827] p-2 shadow-2xl">
          <ManageWorkspaceDialog
            redirectTo="/dashboard"
            triggerClassName="w-full"
            triggerContent={
              <span className="inline-flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-white/80 transition hover:bg-white/8">
                <Pencil className="h-4 w-4" />
                Edit Workspace
              </span>
            }
            workspace={workspace}
          />
          <WorkspaceExportTrigger
            showQuickExport={false}
            triggerClassName="w-full"
            triggerContent={
              <span className="inline-flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-white/80 transition hover:bg-white/8">
                <Share2 className="h-4 w-4" />
                Export Workspace
              </span>
            }
            workspace={{ id: workspace.id, name: workspace.name }}
          />
          <Link
            className="inline-flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-white/80 transition hover:bg-white/8"
            href={`/workspaces/${workspace.id}/shared`}
            onClick={() => setOpen(false)}
          >
            <Share2 className="h-4 w-4" />
            Members ({memberCount})
          </Link>
        </div>
      ) : null}
    </div>
  );
}
