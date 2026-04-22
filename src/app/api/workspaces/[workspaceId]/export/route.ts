import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestUser } from "@/lib/server/auth";
import {
  buildWorkspaceExportData,
  defaultExportOptions,
  generateWorkspaceExport,
  normalizeExportOptions,
  type WorkspaceExportOptions,
  type WorkspaceExportFormat,
  WorkspaceExportAccessError
} from "@/lib/exports/workspace-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const exportRequestSchema = z.object({
  format: z.enum(["pdf", "excel", "csv", "word", "google_sheets"]).default("csv"),
  dateRange: z.enum(["all", "this_month", "last_month", "custom"]).default("all"),
  customStart: z.string().optional(),
  customEnd: z.string().optional(),
  includeSummary: z.boolean().default(true),
  includeTransactions: z.boolean().default(true),
  includeDebts: z.boolean().default(true),
  includeNotes: z.boolean().default(true),
  includeMembers: z.boolean().default(true),
  includeCharts: z.boolean().default(true),
  csvVariant: z.enum(["combined", "transactions", "debts"]).default("combined")
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") ?? "csv") as WorkspaceExportFormat;

  const payload = {
    ...defaultExportOptions(format),
    format,
    dateRange: (searchParams.get("dateRange") ?? "all") as WorkspaceExportOptions["dateRange"],
    customStart: searchParams.get("customStart") ?? undefined,
    customEnd: searchParams.get("customEnd") ?? undefined,
    csvVariant: (searchParams.get("csvVariant") ?? "combined") as WorkspaceExportOptions["csvVariant"],
    includeSummary: parseBoolean(searchParams.get("includeSummary"), true),
    includeTransactions: parseBoolean(searchParams.get("includeTransactions"), true),
    includeDebts: parseBoolean(searchParams.get("includeDebts"), true),
    includeNotes: parseBoolean(searchParams.get("includeNotes"), true),
    includeMembers: parseBoolean(searchParams.get("includeMembers"), true),
    includeCharts: parseBoolean(searchParams.get("includeCharts"), format === "pdf")
  };

  return handleExportRequest(workspaceId, payload);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const body = await request.json();
  const parsed = exportRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return handleExportRequest(workspaceId, parsed.data);
}

async function handleExportRequest(workspaceId: string, rawOptions: Partial<WorkspaceExportOptions>) {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const options = normalizeExportOptions(rawOptions);
    const { data } = await buildWorkspaceExportData(workspaceId, user.id, options);
    const payload = await generateWorkspaceExport(data, options);

    if (options.format === "google_sheets") {
      return NextResponse.json({
        openUrl: payload.openUrl,
        suggestedFileName: payload.suggestedFileName,
        csvContent: payload.csvContent
      });
    }

    if (payload.text !== undefined) {
      return new Response(payload.text, {
        headers: {
          "Content-Type": payload.contentType,
          "Content-Disposition": `attachment; filename="${payload.fileName}"`
        }
      });
    }

    return new Response(payload.buffer ? new Uint8Array(payload.buffer) : null, {
      headers: {
        "Content-Type": payload.contentType,
        "Content-Disposition": `attachment; filename="${payload.fileName}"`
      }
    });
  } catch (error) {
    if (error instanceof WorkspaceExportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[workspace-export] Failed to export workspace", {
      workspaceId,
      error
    });

    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  return value === "1" || value === "true" || value === "yes" || value === "on";
}
