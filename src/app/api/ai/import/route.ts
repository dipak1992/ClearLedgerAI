import { DebtStatus, DebtType, TransactionType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { heuristicParseImport, parsedImportSchema } from "@/lib/ai/parsers";
import { aiPrompts } from "@/lib/ai/prompts";
import { env } from "@/lib/env";
import { getRequestUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parseInputSchema = z.object({
  workspaceId: z.string().cuid(),
  input: z.string().optional(),
  imageData: z.string().optional(),      // base64 data URL (data:image/...;base64,...)
  editedData: parsedImportSchema.optional(), // skip AI — save user-edited preview directly
  mode: z
    .enum(["receipt", "bank", "note", "chat", "screenshot", "receipt_photo", "handwritten", "camera"])
    .default("note"),
  persist: z.boolean().default(true)
});

const openAiImportSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    amount: { type: "number" },
    merchant: { type: "string" },
    category: { type: "string" },
    paymentMethod: { type: "string" },
    notes: { type: "string" },
    counterpartyName: { type: "string" },
    currency: { type: "string" },
    transactionDate: { type: "string" },
    type: { type: "string", enum: ["TRANSACTION", "DEBT"] },
    transactionType: { type: "string", enum: ["EXPENSE", "INCOME", "TRANSFER", "REIMBURSEMENT"] },
    debtType: {
      type: "string",
      enum: ["LENT", "BORROWED", "CUSTOMER_UNPAID", "ADVANCE_PAYMENT", "REIMBURSEMENT_PENDING"]
    },
    dueDate: { type: "string" },
    confidence: { type: "number" }
  },
  required: ["title", "amount", "type"]
};

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = parseInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { workspaceId, input, imageData, editedData, mode, persist } = parsed.data;

  // At least one input source is required
  if (!editedData && !input && !imageData) {
    return NextResponse.json(
      { error: "Provide input text, imageData, or editedData" },
      { status: 400 }
    );
  }

  const user = await getRequestUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: user.id }
  });

  if (!membership) {
    return NextResponse.json({ error: "You do not have access to this workspace" }, { status: 403 });
  }

  // If the client sent pre-edited data, skip AI entirely
  let parsedResult = editedData ?? null;
  let parserUsed: "user-edited" | "openai-vision" | "openai-text" | "heuristic" = "heuristic";
  let parserError: string | null = null;

  if (!parsedResult) {
    if (imageData) {
      const attempt = await parseImageWithOpenAI({ imageData, mode });
      parsedResult = attempt.data;
      parserUsed = "openai-vision";
      parserError = attempt.error;
    } else {
      const prompt = getModePrompt(mode);
      const attempt = await parseWithOpenAI({ input: input!, prompt, mode });
      parsedResult = attempt.data;
      parserUsed = "openai-text";
      parserError = attempt.error;
    }

    if (!parsedResult) {
      if (!imageData) {
        parsedResult = heuristicParseImport(input ?? "");
        if (parsedResult) {
          parserUsed = "heuristic";
        }
      }
    }

    if (!parsedResult) {
      return NextResponse.json(
        {
          error: parserError ?? "We couldn't extract a trustworthy record from that input. Try a clearer image or add more details."
        },
        { status: 422 }
      );
    }
  } else {
    parserUsed = "user-edited";
  }

  let saved:
    | {
        kind: "transaction" | "debt";
        id: string;
      }
    | undefined;

  if (persist) {
    if (parsedResult.type === "DEBT") {
      const dueDate = toValidDate(parsedResult.dueDate);
      const debt = await prisma.debt.create({
        data: {
          workspaceId,
          createdById: user.id,
          counterpartyName: parsedResult.counterpartyName ?? "Unknown",
          amountTotal: parsedResult.amount,
          amountPaid: 0,
          balanceRemaining: parsedResult.amount,
          currency: (parsedResult.currency ?? "USD").toUpperCase(),
          type: toDebtType(parsedResult.debtType),
          status: dueDate && dueDate.getTime() < Date.now() ? DebtStatus.OVERDUE : DebtStatus.OPEN,
          dueDate,
          notes: parsedResult.notes,
          metadata: { aiMode: mode, aiParser: parserUsed }
        }
      });

      saved = { kind: "debt", id: debt.id };
    } else {
      const transactionDate = toValidDate(parsedResult.transactionDate) ?? new Date();
      const transaction = await prisma.transaction.create({
        data: {
          workspaceId,
          createdById: user.id,
          title: parsedResult.title,
          amount: parsedResult.amount,
          currency: (parsedResult.currency ?? "USD").toUpperCase(),
          merchant: parsedResult.merchant,
          transactionType: toTransactionType(parsedResult.transactionType),
          paymentMethod: parsedResult.paymentMethod,
          transactionDate,
          notes: parsedResult.notes,
          aiSource: parserUsed
        }
      });

      saved = { kind: "transaction", id: transaction.id };
    }
  }

  return NextResponse.json({
    data: parsedResult,
    saved,
    metadata: {
      parser: parserUsed,
      parserError,
      persisted: persist
    }
  });
}

function getModePrompt(mode: string): string {
  switch (mode) {
    case "receipt":
    case "receipt_photo":
      return aiPrompts.receiptParser;
    case "bank":
    case "screenshot":
      return aiPrompts.bankScreenshotParser;
    case "chat":
      return aiPrompts.chatDebtParser;
    case "handwritten":
    case "camera":
      return aiPrompts.imageParser;
    default:
      return aiPrompts.noteToTransactionParser;
  }
}

async function parseImageWithOpenAI({
  imageData,
  mode
}: {
  imageData: string;
  mode: string;
}) {
  if (!env.OPENAI_API_KEY) {
    return { data: null, error: "OPENAI_API_KEY missing" } as const;
  }

  let lastError = "OpenAI vision request failed";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0,
          messages: [
            {
              role: "system",
              content: [
                "You are a financial data extraction engine for ClearLedger AI.",
                "Return only structured JSON. No markdown, no explanation.",
                "Never invent fields that are not visible in the image.",
                `Import mode: ${mode}`,
                `Task prompt: ${getModePrompt(mode)} ${aiPrompts.imageParser}`
              ].join(" ")
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: imageData, detail: "high" }
                },
                {
                  type: "text",
                  text: "Extract all financial data from this image and return structured JSON matching the schema."
                }
              ]
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "clearledger_import",
              strict: true,
              schema: openAiImportSchema
            }
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const message = await response.text();
        lastError = `OpenAI HTTP ${response.status}: ${message.slice(0, 180)}`;

        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break;
        }

        await backoff(attempt);
        continue;
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = payload.choices?.[0]?.message?.content;

      if (!content) {
        lastError = "OpenAI vision returned empty content";
        await backoff(attempt);
        continue;
      }

      const parsedSchema = parsedImportSchema.safeParse(JSON.parse(content));

      if (!parsedSchema.success) {
        lastError = "Vision response did not match expected schema";
        await backoff(attempt);
        continue;
      }

      return { data: parsedSchema.data, error: null } as const;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err instanceof Error ? err.message : "OpenAI vision error";
      await backoff(attempt);
    }
  }

  return { data: null, error: lastError } as const;
}

async function parseWithOpenAI({
  input,
  prompt,
  mode
}: {
  input: string;
  prompt: string;
  mode: string;
}) {
  if (!env.OPENAI_API_KEY) {
    return { data: null, error: "OPENAI_API_KEY missing" } as const;
  }

  let lastError = "OpenAI request failed";

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          messages: [
            {
              role: "system",
              content: [
                "You are an extraction engine for ClearLedger AI.",
                "Return only structured JSON, no markdown.",
                "Use the schema exactly.",
                "Never invent missing values.",
                `Import mode: ${mode}`,
                `Task prompt: ${prompt}`
              ].join(" ")
            },
            {
              role: "user",
              content: input
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "clearledger_import",
              strict: true,
              schema: openAiImportSchema
            }
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const message = await response.text();
        lastError = `OpenAI HTTP ${response.status}: ${message.slice(0, 180)}`;

        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break;
        }

        await backoff(attempt);
        continue;
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };

      const content = payload.choices?.[0]?.message?.content;

      if (!content) {
        lastError = "OpenAI returned empty content";
        await backoff(attempt);
        continue;
      }

      const parsed = parsedImportSchema.safeParse(JSON.parse(content));

      if (!parsed.success) {
        lastError = "OpenAI response did not match expected schema";
        await backoff(attempt);
        continue;
      }

      return { data: parsed.data, error: null } as const;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error.message : "OpenAI request error";
      await backoff(attempt);
    }
  }

  return { data: null, error: lastError } as const;
}

function toValidDate(input?: string) {
  if (!input) {
    return null;
  }

  const value = new Date(input);
  return Number.isNaN(value.getTime()) ? null : value;
}

function toDebtType(type?: string) {
  if (!type) {
    return DebtType.LENT;
  }

  if (
    type === DebtType.LENT ||
    type === DebtType.BORROWED ||
    type === DebtType.CUSTOMER_UNPAID ||
    type === DebtType.ADVANCE_PAYMENT ||
    type === DebtType.REIMBURSEMENT_PENDING
  ) {
    return type;
  }

  return DebtType.LENT;
}

function toTransactionType(type?: string) {
  if (
    type === TransactionType.EXPENSE ||
    type === TransactionType.INCOME ||
    type === TransactionType.TRANSFER ||
    type === TransactionType.REIMBURSEMENT
  ) {
    return type;
  }

  return TransactionType.EXPENSE;
}

async function backoff(attempt: number) {
  if (attempt >= 3) {
    return;
  }

  await new Promise((resolve) => {
    setTimeout(resolve, 250 * attempt);
  });
}
