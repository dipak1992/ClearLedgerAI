import { NextResponse } from "next/server";
import { z } from "zod";

import { heuristicParseImport } from "@/lib/ai/parsers";
import { aiPrompts } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parseInputSchema = z.object({
  input: z.string().min(4),
  mode: z.enum(["receipt", "bank", "note", "chat"]).default("note")
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = parseInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const mappedPrompt =
    parsed.data.mode === "receipt"
      ? aiPrompts.receiptParser
      : parsed.data.mode === "bank"
        ? aiPrompts.bankScreenshotParser
        : parsed.data.mode === "chat"
          ? aiPrompts.chatDebtParser
          : aiPrompts.noteToTransactionParser;

  const parsedResult = heuristicParseImport(parsed.data.input);

  return NextResponse.json({
    data: parsedResult,
    metadata: {
      parser: "heuristic-fallback",
      promptTemplate: mappedPrompt
    }
  });
}
