import { z } from "zod";

export const parsedImportSchema = z.object({
  title: z.string(),
  amount: z.number().positive(),
  merchant: z.string().optional(),
  category: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  counterpartyName: z.string().optional(),
  currency: z.string().length(3).optional(),
  transactionDate: z.string().optional(),
  type: z.enum(["TRANSACTION", "DEBT"]).default("TRANSACTION"),
  transactionType: z.enum(["EXPENSE", "INCOME", "TRANSFER", "REIMBURSEMENT"]).optional(),
  debtType: z.enum(["LENT", "BORROWED", "CUSTOMER_UNPAID", "ADVANCE_PAYMENT", "REIMBURSEMENT_PENDING"]).optional(),
  dueDate: z.string().optional(),
  confidence: z.number().min(0).max(1).optional()
});

export type ParsedImport = z.infer<typeof parsedImportSchema>;

export function heuristicParseImport(input: string): ParsedImport | null {
  const amount = extractAmount(input);
  if (!amount || amount <= 0) {
    return null;
  }

  const lower = input.toLowerCase();

  const type = /owe|return|borrow|lent|debt|pay back|repay|unpaid|reimburse/i.test(input) ? "DEBT" : "TRANSACTION";
  const paymentMethod = /zelle|cash|bank|card|check/i.exec(lower)?.[0];
  const merchant = extractMerchant(input);
  const transactionType = inferTransactionType(input, lower);

  const draft = {
    title: buildTitle(input, merchant, transactionType, type),
    amount,
    merchant,
    category: merchant ? "Shopping" : undefined,
    paymentMethod,
    notes: input,
    counterpartyName: type === "DEBT" ? extractCounterparty(input) : undefined,
    type,
    transactionType: type === "TRANSACTION" ? transactionType : undefined,
    transactionDate: extractDate(input),
    dueDate: extractRelativeDueDate(input),
    confidence: 0.45
  };

  return parsedImportSchema.parse(draft);
}

function extractAmount(input: string) {
  const normalized = input.replace(/,/g, "");
  const amountMatch =
    normalized.match(/(?:total|amount|paid|payment|charge|cost|for)\D{0,8}(-?\d+(?:\.\d{1,2})?)/i) ??
    normalized.match(/\$\s*(-?\d+(?:\.\d{1,2})?)/i) ??
    normalized.match(/\b(-?\d+\.\d{2})\b/);

  return amountMatch ? Math.abs(Number(amountMatch[1])) : null;
}

function extractMerchant(input: string) {
  const namedPartyMatch = input.match(/(?:at|from|to)\s+([A-Z][A-Za-z0-9&'. -]{2,40})/);
  if (namedPartyMatch?.[1]) {
    return sanitizeName(namedPartyMatch[1]);
  }

  const knownMerchantMatch = input.match(/(walmart|costco|target|uber|netflix|amazon|starbucks|lyft|shell|chevron)/i);
  if (knownMerchantMatch?.[1]) {
    return sanitizeName(knownMerchantMatch[1]);
  }

  return undefined;
}

function inferTransactionType(input: string, lower: string) {
  if (/refund|reimburs/i.test(input)) return "REIMBURSEMENT";
  if (/transfer|moved|sent to savings|between accounts|from checking|to checking/i.test(input)) return "TRANSFER";
  if (/salary|paycheck|invoice paid|deposit|received|income|sold/i.test(input) || /credit/i.test(lower)) return "INCOME";
  return "EXPENSE";
}

function buildTitle(
  input: string,
  merchant: string | undefined,
  transactionType: "EXPENSE" | "INCOME" | "TRANSFER" | "REIMBURSEMENT",
  type: "TRANSACTION" | "DEBT"
) {
  if (merchant) return merchant;
  if (type === "DEBT") return "Debt entry";
  if (transactionType === "INCOME") return "Imported income";
  if (transactionType === "TRANSFER") return "Imported transfer";
  if (transactionType === "REIMBURSEMENT") return "Imported reimbursement";
  return input.trim().slice(0, 80) || "Imported expense";
}

function extractDate(input: string) {
  const isoMatch = input.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) return isoMatch[0];

  const slashMatch = input.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/);
  if (slashMatch) {
    const date = new Date(slashMatch[0]);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return undefined;
}

function sanitizeName(value: string) {
  return value.trim().replace(/[.,]$/, "");
}

function extractCounterparty(input: string) {
  const cleaned = input.replace(/[.,]/g, "");
  const words = cleaned.split(/\s+/);
  const marker = words.findIndex((word) => ["john", "sarah", "mike", "bro", "friend"].includes(word.toLowerCase()));

  if (marker === -1) {
    return undefined;
  }

  const candidate = words[marker];
  return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
}

function extractRelativeDueDate(input: string) {
  if (/next friday/i.test(input)) {
    return "next-friday";
  }

  if (/tomorrow/i.test(input)) {
    return "tomorrow";
  }

  return undefined;
}
