import {
  DebtType,
  MoneyRecordStatus,
  MoneyRecordType,
  TransactionType,
  type Debt,
  type DebtStatus,
  type Transaction
} from "@prisma/client";

/**
 * Map a legacy TransactionType enum value to its unified
 * MoneyRecordType equivalent.
 */
export function transactionTypeToRecordType(type: TransactionType): MoneyRecordType {
  switch (type) {
    case TransactionType.INCOME:
      return MoneyRecordType.INCOME;
    case TransactionType.TRANSFER:
      return MoneyRecordType.TRANSFER;
    case TransactionType.REIMBURSEMENT:
      return MoneyRecordType.REIMBURSEMENT;
    case TransactionType.EXPENSE:
    default:
      return MoneyRecordType.EXPENSE;
  }
}

/**
 * Map a legacy DebtType enum value to its unified MoneyRecordType.
 * All "money is owed to me" variants fold into DEBT_GIVEN; all
 * "I owe someone" variants fold into DEBT_BORROWED.
 */
export function debtTypeToRecordType(type: DebtType): MoneyRecordType {
  switch (type) {
    case DebtType.BORROWED:
    case DebtType.ADVANCE_PAYMENT:
      return MoneyRecordType.DEBT_BORROWED;
    case DebtType.LENT:
    case DebtType.CUSTOMER_UNPAID:
    case DebtType.REIMBURSEMENT_PENDING:
    default:
      return MoneyRecordType.DEBT_GIVEN;
  }
}

/**
 * Map a legacy DebtStatus value to its MoneyRecordStatus equivalent.
 */
export function debtStatusToRecordStatus(status: DebtStatus): MoneyRecordStatus {
  switch (status) {
    case "PAID":
      return MoneyRecordStatus.PAID;
    case "PARTIAL":
      return MoneyRecordStatus.PARTIAL;
    case "OVERDUE":
      return MoneyRecordStatus.OVERDUE;
    case "OPEN":
    default:
      return MoneyRecordStatus.PENDING;
  }
}

export type TransactionToRecordInput = Pick<
  Transaction,
  | "workspaceId"
  | "createdById"
  | "categoryId"
  | "title"
  | "amount"
  | "currency"
  | "transactionType"
  | "merchant"
  | "transactionDate"
  | "paymentMethod"
  | "notes"
  | "aiSource"
  | "metadata"
>;

/**
 * Produce the `data` object used to create a MoneyRecord that mirrors
 * a given Transaction row. The caller is responsible for persistence.
 */
export function transactionToRecordData(tx: TransactionToRecordInput) {
  return {
    workspaceId: tx.workspaceId,
    createdById: tx.createdById,
    categoryId: tx.categoryId ?? null,
    type: transactionTypeToRecordType(tx.transactionType),
    status:
      tx.transactionType === TransactionType.TRANSFER
        ? MoneyRecordStatus.CLEARED
        : MoneyRecordStatus.CLEARED,
    title: tx.title,
    amount: tx.amount,
    currency: tx.currency,
    occurredAt: tx.transactionDate,
    counterpartyName: tx.merchant ?? null,
    merchant: tx.merchant ?? null,
    paymentMethod: tx.paymentMethod ?? null,
    notes: tx.notes ?? null,
    aiSource: tx.aiSource ?? null,
    metadata: tx.metadata ?? undefined
  } as const;
}

export type DebtToRecordInput = Pick<
  Debt,
  | "workspaceId"
  | "createdById"
  | "counterpartyName"
  | "amountTotal"
  | "amountPaid"
  | "currency"
  | "type"
  | "status"
  | "purpose"
  | "dateCreated"
  | "dueDate"
  | "method"
  | "notes"
  | "metadata"
>;

/**
 * Produce the `data` object used to create a MoneyRecord that mirrors
 * a given Debt row.
 */
export function debtToRecordData(debt: DebtToRecordInput) {
  return {
    workspaceId: debt.workspaceId,
    createdById: debt.createdById,
    categoryId: null,
    type: debtTypeToRecordType(debt.type),
    status: debtStatusToRecordStatus(debt.status),
    title: debt.purpose ?? `Debt: ${debt.counterpartyName}`,
    amount: debt.amountTotal,
    amountPaid: debt.amountPaid,
    currency: debt.currency,
    occurredAt: debt.dateCreated,
    dueDate: debt.dueDate ?? null,
    counterpartyName: debt.counterpartyName,
    paymentMethod: debt.method ?? null,
    notes: debt.notes ?? null,
    metadata: debt.metadata ?? undefined
  } as const;
}
