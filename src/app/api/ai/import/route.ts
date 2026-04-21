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
  input: z.string().min(4),
  mode: z.enum(["receipt", "bank", "note", "chat"]).default("note"),
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
    debtType: {
      type: "string",
      enum: ["LENT", "BORROWED", "CUSTOMER_UNPAID", "ADVANCE_PAYMENT", "REIMBURSEMENT_PENDING"]
    },
    dueDate: { type: "string" }
  },
  required: ["title", "amount", "type"]
};

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = parseInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getRequestUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: parsed.data.workspaceId,
      userId: user.id
    }
  });

  if (!membership) {
    return NextResponse.json({ error: "You do not have access to this workspace" }, { status: 403 });
  }

  const mappedPrompt =
    parsed.data.mode === "receipt"
      ? aiPrompts.receiptParser
      : parsed.data.mode === "bank"
        ? aiPrompts.bankScreenshotParser
        : parsed.data.mode === "chat"
          ? aiPrompts.chatDebtParser
          : aiPrompts.noteToTransactionParser;

  const openAiAttempt = await parseWithOpenAI({
    input: parsed.data.input,
    prompt: mappedPrompt,
    mode: parsed.data.mode
  });

  const parsedResult = openAiAttempt.data ?? heuristicParseImport(parsed.data.input);

  let saved:
    | {
        kind: "transaction" | "debt";
        id: string;
      }
    | undefined;

  if (parsed.data.persist) {
    if (parsedResult.type === "DEBT") {
      const dueDate = toValidDate(parsedResult.dueDate);
      const debt = await prisma.debt.create({
        data: {
          workspaceId: parsed.data.workspaceId,
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
          metadata: {
            aiMode: parsed.data.mode,
            aiParser: openAiAttempt.data ? "openai" : "heuristic"
          }
        }
      });

      saved = { kind: "debt", id: debt.id };
    } else {
      const transactionDate = toValidDate(parsedResult.transactionDate) ?? new Date();
      const transaction = await prisma.transaction.create({
        data: {
          workspaceId: parsed.data.workspaceId,
          createdById: user.id,
          title: parsedResult.title,
          amount: parsedResult.amount,
          currency: (parsedResult.currency ?? "USD").toUpperCase(),
          merchant: parsedResult.merchant,
          transactionType: TransactionType.EXPENSE,
          paymentMethod: parsedResult.paymentMethod,
          transactionDate,
          notes: parsedResult.notes,
          aiSource: openAiAttempt.data ? "openai" : "heuristic"
        }
      });

      saved = { kind: "transaction", id: transaction.id };
    }
  }

  return NextResponse.json({
    data: parsedResult,
    saved,
    metadata: {
      parser: openAiAttempt.data ? "openai-structured" : "heuristic-fallback",
      persisted: parsed.data.persist,
      promptTemplate: mappedPrompt,
      ...(openAiAttempt.error ? { fallbackReason: openAiAttempt.error } : {})
    }
  });
}

async function parseWithOpenAI({
  input,
  prompt,
  mode
}: {
  input: string;
  prompt: string;
  mode: "receipt" | "bank" | "note" | "chat";
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

async function backoff(attempt: number) {
  if (attempt >= 3) {
    return;
  }

  await new Promise((resolve) => {
    setTimeout(resolve, 250 * attempt);
  });
}
