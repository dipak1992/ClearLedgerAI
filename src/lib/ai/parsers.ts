import { z } from "zod";

const parsedImportSchema = z.object({
  title: z.string(),
  amount: z.number().positive(),
  merchant: z.string().optional(),
  category: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  counterpartyName: z.string().optional(),
  type: z.enum(["TRANSACTION", "DEBT"]).default("TRANSACTION"),
  dueDate: z.string().optional()
});

export type ParsedImport = z.infer<typeof parsedImportSchema>;

export function heuristicParseImport(input: string): ParsedImport {
  const amountMatch = input.match(/\$\s?(\d+(?:\.\d{1,2})?)/i);
  const amount = amountMatch ? Number(amountMatch[1]) : 0;
  const lower = input.toLowerCase();

  const type = /owe|return|borrow|lent|debt|pay back|repay/i.test(input) ? "DEBT" : "TRANSACTION";
  const paymentMethod = /zelle|cash|bank|card|check/i.exec(lower)?.[0];
  const merchant = /walmart|costco|target|uber|netflix|amazon/i.exec(lower)?.[0];

  const draft = {
    title: input.slice(0, 80),
    amount: amount > 0 ? amount : 1,
    merchant,
    category: merchant ? "Shopping" : undefined,
    paymentMethod,
    notes: input,
    counterpartyName: type === "DEBT" ? extractCounterparty(input) : undefined,
    type,
    dueDate: extractRelativeDueDate(input)
  };

  return parsedImportSchema.parse(draft);
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
