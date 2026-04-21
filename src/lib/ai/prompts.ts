export const aiPrompts = {
  receiptParser: `Extract transaction fields from this receipt: date, amount, merchant, currency, category, payment method, card ending, notes.`,
  bankScreenshotParser: `Extract all transactions from this bank screenshot. Normalize date to ISO, include amount sign and merchant.`,
  noteToTransactionParser: `Convert freeform money notes into structured transaction records with date, amount, category, merchant, notes, and related person.`,
  chatDebtParser: `Extract debt entries from this message thread including counterparty, amount, debt type, due date, and status.`,
  expenseCategorizer: `Classify transaction records into meaningful categories for personal and small business finance tracking.`,
  duplicateDetector: `Detect potential duplicates by amount, merchant similarity, date proximity, and attachment similarity. Return confidence score.`,
  monthlySummaryWriter: `Generate a concise and friendly monthly finance summary with key spend categories, debt changes, and actionable reminders.`
};
