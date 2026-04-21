import { DebtStatus, DebtType } from "@prisma/client";
import { z } from "zod";

export const createDebtSchema = z.object({
  workspaceId: z.string().cuid(),
  counterpartyName: z.string().min(2).max(120),
  amountTotal: z.coerce.number().positive(),
  type: z.nativeEnum(DebtType),
  status: z.nativeEnum(DebtStatus).default(DebtStatus.OPEN),
  purpose: z.string().max(150).optional(),
  dateCreated: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  method: z.string().max(50).optional(),
  notes: z.string().max(1000).optional()
});

export const addDebtPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentDate: z.coerce.date().optional(),
  method: z.string().max(50).optional(),
  notes: z.string().max(1000).optional()
});
