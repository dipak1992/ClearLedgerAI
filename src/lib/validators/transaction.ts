import { TransactionType } from "@prisma/client";
import { z } from "zod";

export const createTransactionSchema = z.object({
  workspaceId: z.string().cuid(),
  title: z.string().min(2).max(120),
  amount: z.coerce.number().positive(),
  transactionType: z.nativeEnum(TransactionType).default(TransactionType.EXPENSE),
  currency: z.string().length(3).default("USD"),
  merchant: z.string().max(120).optional(),
  transactionDate: z.coerce.date(),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
  categoryId: z.string().cuid().optional()
});

export const updateTransactionSchema = createTransactionSchema.omit({
  workspaceId: true
});
