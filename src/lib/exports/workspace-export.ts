import { DebtStatus, DebtType, TransactionType, WorkspaceRole } from "@prisma/client";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } from "docx";
import ExcelJS from "exceljs";
import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";

import { prisma } from "@/lib/server/prisma";
import { formatCurrency } from "@/lib/utils";

export type WorkspaceExportFormat = "pdf" | "excel" | "csv" | "word" | "google_sheets";
export type WorkspaceExportDateRange = "all" | "this_month" | "last_month" | "custom";
export type WorkspaceCsvVariant = "combined" | "transactions" | "debts";

export interface WorkspaceExportOptions {
  format: WorkspaceExportFormat;
  dateRange: WorkspaceExportDateRange;
  customStart?: string;
  customEnd?: string;
  includeSummary: boolean;
  includeTransactions: boolean;
  includeDebts: boolean;
  includeNotes: boolean;
  includeMembers: boolean;
  includeCharts: boolean;
  csvVariant?: WorkspaceCsvVariant;
}

export interface WorkspaceExportPayload {
  fileName: string;
  contentType: string;
  buffer?: Buffer;
  text?: string;
  openUrl?: string;
  suggestedFileName?: string;
  csvContent?: string;
}

interface ExportMembership {
  role: WorkspaceRole;
}

export interface WorkspaceExportData {
  workspace: {
    id: string;
    name: string;
    description: string | null;
    ownerName: string | null;
    ownerEmail: string | null;
  };
  dateRangeLabel: string;
  exportedAt: Date;
  members: Array<{ name: string; email: string; role: WorkspaceRole }>;
  summary: {
    totalExpenses: number;
    totalIncome: number;
    netFlow: number;
    debtsOwedToUser: number;
    debtsUserOwe: number;
  };
  transactions: Array<{
    id: string;
    date: Date;
    title: string;
    merchant: string | null;
    category: string | null;
    type: TransactionType;
    amount: number;
    currency: string;
    paymentMethod: string | null;
    notes: string | null;
  }>;
  debts: Array<{
    id: string;
    createdAt: Date;
    counterpartyName: string;
    type: DebtType;
    status: DebtStatus;
    total: number;
    paid: number;
    balance: number;
    currency: string;
    dueDate: Date | null;
    purpose: string | null;
    notes: string | null;
  }>;
  categorySummaries: Array<{ category: string; total: number }>;
  monthlySummaries: Array<{ month: string; expenses: number; income: number; net: number }>;
  notes: Array<{ source: "transaction" | "debt"; title: string; note: string }>;
}

export class WorkspaceExportAccessError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "WorkspaceExportAccessError";
    this.status = status;
  }
}

export function defaultExportOptions(format: WorkspaceExportFormat = "pdf"): WorkspaceExportOptions {
  return {
    format,
    dateRange: "all",
    includeSummary: true,
    includeTransactions: true,
    includeDebts: true,
    includeNotes: true,
    includeMembers: true,
    includeCharts: format === "pdf",
    csvVariant: "combined"
  };
}

export function normalizeExportOptions(input: Partial<WorkspaceExportOptions>): WorkspaceExportOptions {
  const format = input.format ?? "pdf";
  const defaults = defaultExportOptions(format);

  return {
    ...defaults,
    ...input,
    format,
    csvVariant: input.csvVariant ?? defaults.csvVariant
  };
}

export async function buildWorkspaceExportData(
  workspaceId: string,
  userId: string,
  rawOptions: Partial<WorkspaceExportOptions>
): Promise<{ data: WorkspaceExportData; membership: ExportMembership }> {
  const options = normalizeExportOptions(rawOptions);
  const { from, to, label } = resolveDateRange(options);

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true }
  });

  if (!membership) {
    throw new WorkspaceExportAccessError("You do not have access to this workspace.");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      owner: { select: { name: true, email: true } },
      members: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        include: { user: { select: { name: true, email: true } } }
      }
    }
  });

  if (!workspace) {
    throw new WorkspaceExportAccessError("Workspace not found.", 404);
  }

  const transactionWhere = {
    workspaceId,
    ...(from || to
      ? {
          transactionDate: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {})
          }
        }
      : {})
  };

  const debtWhere = {
    workspaceId,
    ...(from || to
      ? {
          dateCreated: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {})
          }
        }
      : {})
  };

  const [transactionsRaw, debtsRaw] = await Promise.all([
    prisma.transaction.findMany({
      where: transactionWhere,
      orderBy: { transactionDate: "desc" },
      include: { category: { select: { name: true } } }
    }),
    prisma.debt.findMany({
      where: debtWhere,
      orderBy: { dateCreated: "desc" }
    })
  ]);

  const transactions = transactionsRaw.map((tx) => ({
    id: tx.id,
    date: tx.transactionDate,
    title: tx.title,
    merchant: tx.merchant,
    category: tx.category?.name ?? null,
    type: tx.transactionType,
    amount: Number(tx.amount),
    currency: tx.currency,
    paymentMethod: tx.paymentMethod,
    notes: tx.notes
  }));

  const debts = debtsRaw.map((debt) => ({
    id: debt.id,
    createdAt: debt.dateCreated,
    counterpartyName: debt.counterpartyName,
    type: debt.type,
    status: debt.status,
    total: Number(debt.amountTotal),
    paid: Number(debt.amountPaid),
    balance: Number(debt.balanceRemaining),
    currency: debt.currency,
    dueDate: debt.dueDate,
    purpose: debt.purpose,
    notes: debt.notes
  }));

  const totalExpenses = transactions
    .filter((tx) => tx.type === "EXPENSE")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalIncome = transactions
    .filter((tx) => tx.type === "INCOME" || tx.type === "REIMBURSEMENT")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const netFlow = totalIncome - totalExpenses;
  const debtsOwedToUser = debts
    .filter((debt) => ["LENT", "CUSTOMER_UNPAID", "REIMBURSEMENT_PENDING"].includes(debt.type))
    .reduce((sum, debt) => sum + debt.balance, 0);
  const debtsUserOwe = debts
    .filter((debt) => ["BORROWED", "ADVANCE_PAYMENT"].includes(debt.type))
    .reduce((sum, debt) => sum + debt.balance, 0);

  const categoryMap = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "EXPENSE") continue;
    const key = tx.category ?? "Uncategorized";
    categoryMap.set(key, (categoryMap.get(key) ?? 0) + tx.amount);
  }

  const monthlyMap = new Map<string, { expenses: number; income: number }>();
  for (const tx of transactions) {
    const month = format(tx.date, "MMM yyyy");
    const existing = monthlyMap.get(month) ?? { expenses: 0, income: 0 };
    if (tx.type === "EXPENSE") existing.expenses += tx.amount;
    if (tx.type === "INCOME" || tx.type === "REIMBURSEMENT") existing.income += tx.amount;
    monthlyMap.set(month, existing);
  }

  const notes = [
    ...transactions
      .filter((tx) => tx.notes?.trim())
      .map((tx) => ({ source: "transaction" as const, title: tx.title, note: tx.notes!.trim() })),
    ...debts
      .filter((debt) => debt.notes?.trim())
      .map((debt) => ({ source: "debt" as const, title: debt.counterpartyName, note: debt.notes!.trim() }))
  ];

  return {
    membership,
    data: {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        ownerName: workspace.owner.name,
        ownerEmail: workspace.owner.email
      },
      exportedAt: new Date(),
      dateRangeLabel: label,
      members: workspace.members.map((member) => ({
        name: member.user.name ?? member.user.email ?? "Unknown",
        email: member.user.email,
        role: member.role
      })),
      summary: {
        totalExpenses,
        totalIncome,
        netFlow,
        debtsOwedToUser,
        debtsUserOwe
      },
      transactions,
      debts,
      categorySummaries: [...categoryMap.entries()]
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total),
      monthlySummaries: [...monthlyMap.entries()].map(([month, values]) => ({
        month,
        expenses: values.expenses,
        income: values.income,
        net: values.income - values.expenses
      })),
      notes
    }
  };
}

export async function generateWorkspaceExport(
  data: WorkspaceExportData,
  options: WorkspaceExportOptions
): Promise<WorkspaceExportPayload> {
  switch (options.format) {
    case "excel":
      return createExcelExport(data, options);
    case "word":
      return createWordExport(data, options);
    case "pdf":
      return createPdfExport(data, options);
    case "google_sheets":
      return createGoogleSheetsPayload(data, options);
    case "csv":
    default:
      return createCsvExport(data, options);
  }
}

function resolveDateRange(options: WorkspaceExportOptions) {
  const now = new Date();

  switch (options.dateRange) {
    case "this_month":
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
        label: "This month"
      };
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
        label: "Last month"
      };
    }
    case "custom":
      return {
        from: options.customStart ? new Date(options.customStart) : undefined,
        to: options.customEnd ? new Date(options.customEnd) : undefined,
        label: options.customStart || options.customEnd
          ? `${options.customStart ?? "Start"} to ${options.customEnd ?? "End"}`
          : "Custom range"
      };
    case "all":
    default:
      return {
        from: undefined,
        to: undefined,
        label: "All time"
      };
  }
}

function slugifyFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function makeFileBaseName(data: WorkspaceExportData) {
  return `clearledger-${slugifyFilePart(data.workspace.name)}-${format(data.exportedAt, "yyyy-MM-dd")}`;
}

function createCsvExport(data: WorkspaceExportData, options: WorkspaceExportOptions): WorkspaceExportPayload {
  const variant = options.csvVariant ?? "combined";
  const fileName = `${makeFileBaseName(data)}-${variant}.csv`;
  const rows =
    variant === "transactions"
      ? buildTransactionCsvRows(data)
      : variant === "debts"
        ? buildDebtCsvRows(data)
        : buildCombinedCsvRows(data);

  return {
    fileName,
    contentType: "text/csv; charset=utf-8",
    text: rows.map((row) => row.map(escapeCsv).join(",")).join("\n")
  };
}

function createGoogleSheetsPayload(data: WorkspaceExportData, options: WorkspaceExportOptions): WorkspaceExportPayload {
  const csv = createCsvExport(data, { ...options, format: "csv", csvVariant: options.csvVariant ?? "combined" });

  return {
    fileName: csv.fileName,
    contentType: "application/json",
    openUrl: "https://docs.google.com/spreadsheets/u/0/create",
    suggestedFileName: csv.fileName,
    csvContent: csv.text
  };
}

async function createExcelExport(data: WorkspaceExportData, options: WorkspaceExportOptions): Promise<WorkspaceExportPayload> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ClearLedger AI";
  workbook.created = new Date();

  if (options.includeSummary) {
    const sheet = workbook.addWorksheet("Summary");
    styleWorksheetHeader(sheet);
    sheet.columns = [
      { header: "Metric", key: "metric", width: 28 },
      { header: "Value", key: "value", width: 22 }
    ];
    addHeaderRowStyle(sheet.getRow(1));
    const summaryRows = [
      ["Workspace", data.workspace.name],
      ["Exported At", format(data.exportedAt, "PPpp")],
      ["Date Range", data.dateRangeLabel],
      ["Owner", [data.workspace.ownerName, data.workspace.ownerEmail].filter(Boolean).join(" · ") || "Unavailable"],
      ["Total Expenses", data.summary.totalExpenses],
      ["Total Income", data.summary.totalIncome],
      ["Net Flow", data.summary.netFlow],
      ["Debts Owed To User", data.summary.debtsOwedToUser],
      ["Debts User Owes", data.summary.debtsUserOwe]
    ];
    summaryRows.forEach(([metric, value]) => {
      const row = sheet.addRow([metric, value]);
      if (typeof value === "number") {
        row.getCell(2).numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';
      }
    });

    if (options.includeMembers) {
      sheet.addRow([]);
      const memberHeader = sheet.addRow(["Members", "Role"]);
      addHeaderRowStyle(memberHeader);
      if (data.members.length === 0) {
        sheet.addRow(["No members available", ""]);
      } else {
        data.members.forEach((member) => sheet.addRow([`${member.name} (${member.email})`, member.role]));
      }
    }
  }

  if (options.includeTransactions) {
    const sheet = workbook.addWorksheet("Transactions");
    styleWorksheetHeader(sheet);
    sheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Title", key: "title", width: 28 },
      { header: "Merchant", key: "merchant", width: 24 },
      { header: "Category", key: "category", width: 20 },
      { header: "Type", key: "type", width: 16 },
      { header: "Amount", key: "amount", width: 16 },
      { header: "Currency", key: "currency", width: 12 },
      { header: "Payment Method", key: "paymentMethod", width: 18 },
      { header: "Notes", key: "notes", width: 36 }
    ];
    addHeaderRowStyle(sheet.getRow(1));
    if (data.transactions.length === 0) {
      sheet.addRow(["No records available for selected range."]);
    } else {
      data.transactions.forEach((tx) => {
        const row = sheet.addRow([
          format(tx.date, "yyyy-MM-dd"),
          tx.title,
          tx.merchant ?? "",
          tx.category ?? "",
          tx.type,
          tx.amount,
          tx.currency,
          tx.paymentMethod ?? "",
          tx.notes ?? ""
        ]);
        row.getCell(6).numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';
      });
    }
  }

  if (options.includeDebts) {
    const sheet = workbook.addWorksheet("Debts");
    styleWorksheetHeader(sheet);
    sheet.columns = [
      { header: "Created", key: "createdAt", width: 14 },
      { header: "Counterparty", key: "counterparty", width: 24 },
      { header: "Type", key: "type", width: 22 },
      { header: "Status", key: "status", width: 14 },
      { header: "Total", key: "total", width: 16 },
      { header: "Paid", key: "paid", width: 16 },
      { header: "Balance", key: "balance", width: 16 },
      { header: "Due Date", key: "dueDate", width: 14 },
      { header: "Purpose", key: "purpose", width: 28 },
      { header: "Notes", key: "notes", width: 36 }
    ];
    addHeaderRowStyle(sheet.getRow(1));
    if (data.debts.length === 0) {
      sheet.addRow(["No records available for selected range."]);
    } else {
      data.debts.forEach((debt) => {
        const row = sheet.addRow([
          format(debt.createdAt, "yyyy-MM-dd"),
          debt.counterpartyName,
          debt.type,
          debt.status,
          debt.total,
          debt.paid,
          debt.balance,
          debt.dueDate ? format(debt.dueDate, "yyyy-MM-dd") : "",
          debt.purpose ?? "",
          debt.notes ?? ""
        ]);
        [5, 6, 7].forEach((index) => {
          row.getCell(index).numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';
        });
      });
    }
  }

  {
    const sheet = workbook.addWorksheet("Categories");
    styleWorksheetHeader(sheet);
    sheet.columns = [
      { header: "Category", key: "category", width: 24 },
      { header: "Total", key: "total", width: 18 }
    ];
    addHeaderRowStyle(sheet.getRow(1));
    if (data.categorySummaries.length === 0) {
      sheet.addRow(["No records available for selected range."]);
    } else {
      data.categorySummaries.forEach((entry) => {
        const row = sheet.addRow([entry.category, entry.total]);
        row.getCell(2).numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';
      });
    }
  }

  {
    const sheet = workbook.addWorksheet("Monthly Trends");
    styleWorksheetHeader(sheet);
    sheet.columns = [
      { header: "Month", key: "month", width: 18 },
      { header: "Expenses", key: "expenses", width: 18 },
      { header: "Income", key: "income", width: 18 },
      { header: "Net", key: "net", width: 18 }
    ];
    addHeaderRowStyle(sheet.getRow(1));
    if (data.monthlySummaries.length === 0) {
      sheet.addRow(["No records available for selected range."]);
    } else {
      data.monthlySummaries.forEach((entry) => {
        const row = sheet.addRow([entry.month, entry.expenses, entry.income, entry.net]);
        [2, 3, 4].forEach((index) => {
          row.getCell(index).numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';
        });
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    fileName: `${makeFileBaseName(data)}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(buffer)
  };
}

async function createWordExport(data: WorkspaceExportData, options: WorkspaceExportOptions): Promise<WorkspaceExportPayload> {
  const sections: Paragraph[] = [
    new Paragraph({
      text: "ClearLedger Workspace Export",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [new TextRun({ text: data.workspace.name, bold: true, size: 28 })],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun(`Exported ${format(data.exportedAt, "PPpp")} · ${data.dateRangeLabel}`)]
    }),
    new Paragraph("")
  ];

  if (options.includeSummary) {
    sections.push(new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_1 }));
    sections.push(...summaryParagraphs(data));
  }

  const docChildren: Array<Paragraph | Table> = [...sections];

  if (options.includeMembers) {
    docChildren.push(new Paragraph({ text: "Members", heading: HeadingLevel.HEADING_1 }));
    docChildren.push(
      tableFromRows([
        ["Name", "Email", "Role"],
        ...(data.members.length
          ? data.members.map((member) => [member.name, member.email, member.role])
          : [["No members available", "", ""]])
      ])
    );
  }

  if (options.includeTransactions) {
    docChildren.push(new Paragraph({ text: "Transactions", heading: HeadingLevel.HEADING_1 }));
    docChildren.push(
      tableFromRows([
        ["Date", "Title", "Type", "Amount", "Merchant", "Category"],
        ...(data.transactions.length
          ? data.transactions.map((tx) => [
              format(tx.date, "yyyy-MM-dd"),
              tx.title,
              tx.type,
              formatCurrency(tx.amount, tx.currency),
              tx.merchant ?? "",
              tx.category ?? ""
            ])
          : [["No records available for selected range.", "", "", "", "", ""]])
      ])
    );
  }

  if (options.includeDebts) {
    docChildren.push(new Paragraph({ text: "Debts", heading: HeadingLevel.HEADING_1 }));
    docChildren.push(
      tableFromRows([
        ["Created", "Counterparty", "Type", "Status", "Balance", "Due Date"],
        ...(data.debts.length
          ? data.debts.map((debt) => [
              format(debt.createdAt, "yyyy-MM-dd"),
              debt.counterpartyName,
              debt.type,
              debt.status,
              formatCurrency(debt.balance, debt.currency),
              debt.dueDate ? format(debt.dueDate, "yyyy-MM-dd") : ""
            ])
          : [["No records available for selected range.", "", "", "", "", ""]])
      ])
    );
  }

  docChildren.push(new Paragraph({ text: "Category Summaries", heading: HeadingLevel.HEADING_1 }));
  docChildren.push(
    tableFromRows([
      ["Category", "Total"],
      ...(data.categorySummaries.length
        ? data.categorySummaries.map((entry) => [entry.category, formatCurrency(entry.total)])
        : [["No records available for selected range.", ""]])
    ])
  );

  docChildren.push(new Paragraph({ text: "Monthly Summaries", heading: HeadingLevel.HEADING_1 }));
  docChildren.push(
    tableFromRows([
      ["Month", "Expenses", "Income", "Net"],
      ...(data.monthlySummaries.length
        ? data.monthlySummaries.map((entry) => [
            entry.month,
            formatCurrency(entry.expenses),
            formatCurrency(entry.income),
            formatCurrency(entry.net)
          ])
        : [["No records available for selected range.", "", "", ""]])
    ])
  );

  if (options.includeNotes) {
    docChildren.push(new Paragraph({ text: "Notes", heading: HeadingLevel.HEADING_1 }));
    if (data.notes.length === 0) {
      docChildren.push(new Paragraph("No notes available for selected range."));
    } else {
      data.notes.slice(0, 40).forEach((note) => {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${note.source === "transaction" ? "Transaction" : "Debt"} · ${note.title}: `, bold: true }),
              new TextRun(note.note)
            ]
          })
        );
      });
    }
  }

  const doc = new Document({
    sections: [{ children: docChildren }]
  });

  return {
    fileName: `${makeFileBaseName(data)}.docx`,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: await Packer.toBuffer(doc)
  };
}

async function createPdfExport(data: WorkspaceExportData, options: WorkspaceExportOptions): Promise<WorkspaceExportPayload> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 70;

  const drawText = (text: string, size = 11, isBold = false, color = rgb(0.1, 0.14, 0.2), x = margin) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: isBold ? bold : regular,
      color
    });
    y -= size + 6;
  };

  const ensureSpace = (needed = 40) => {
    if (y < margin + needed) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 50;
    }
  };

  page.drawRectangle({ x: 0, y: pageHeight - 160, width: pageWidth, height: 160, color: rgb(0.08, 0.12, 0.2) });
  y = pageHeight - 80;
  page.drawText("ClearLedger Workspace Export", { x: margin, y, size: 24, font: bold, color: rgb(1, 1, 1) });
  y -= 34;
  page.drawText(data.workspace.name, { x: margin, y, size: 18, font: regular, color: rgb(0.85, 0.94, 1) });
  y -= 24;
  page.drawText(`Exported ${format(data.exportedAt, "PPpp")} · ${data.dateRangeLabel}`, {
    x: margin,
    y,
    size: 10,
    font: regular,
    color: rgb(0.8, 0.88, 0.94)
  });

  y = pageHeight - 210;
  drawText("Workspace Snapshot", 16, true);
  if (options.includeSummary) {
    drawSummaryCardsPdf(page, data, y);
    y -= 120;
  }

  drawText(`Owner: ${[data.workspace.ownerName, data.workspace.ownerEmail].filter(Boolean).join(" · ") || "Unavailable"}`, 10);
  if (data.workspace.description) {
    drawText(`Description: ${data.workspace.description}`, 10);
  }

  if (options.includeMembers) {
    ensureSpace(80);
    drawText("Members", 14, true);
    if (data.members.length === 0) {
      drawText("No members available for this workspace.", 10);
    } else {
      data.members.forEach((member) => {
        ensureSpace(20);
        drawText(`${member.name} · ${member.email} · ${member.role}`, 10);
      });
    }
  }

  if (options.includeCharts && data.categorySummaries.length > 0) {
    ensureSpace(160);
    drawText("Category Spend", 14, true);
    const chartMax = Math.max(...data.categorySummaries.slice(0, 6).map((entry) => entry.total), 1);
    data.categorySummaries.slice(0, 6).forEach((entry) => {
      ensureSpace(24);
      page.drawText(entry.category, { x: margin, y, size: 9, font: regular });
      page.drawRectangle({ x: margin + 130, y: y - 2, width: 220, height: 8, color: rgb(0.92, 0.94, 0.98) });
      page.drawRectangle({
        x: margin + 130,
        y: y - 2,
        width: 220 * (entry.total / chartMax),
        height: 8,
        color: rgb(0.19, 0.7, 0.58)
      });
      page.drawText(formatCurrency(entry.total), { x: margin + 365, y: y - 2, size: 9, font: bold });
      y -= 18;
    });
    y -= 12;
  }

  if (options.includeTransactions) {
    drawText("Transactions", 14, true);
    y = drawPdfTable({
      pdf,
      page,
      startY: y,
      columns: [
        { title: "Date", width: 65 },
        { title: "Title", width: 150 },
        { title: "Type", width: 70 },
        { title: "Amount", width: 80 },
        { title: "Merchant", width: 120 }
      ],
      rows: data.transactions.length
        ? data.transactions.map((tx) => [
            format(tx.date, "yyyy-MM-dd"),
            tx.title,
            tx.type,
            formatCurrency(tx.amount, tx.currency),
            tx.merchant ?? ""
          ])
        : [["No records available for selected range.", "", "", "", ""]],
      regular,
      bold,
      pageWidth,
      pageHeight,
      margin
    }).y;
    page = drawPdfTable({
      pdf,
      page,
      startY: y,
      columns: [],
      rows: [],
      regular,
      bold,
      pageWidth,
      pageHeight,
      margin
    }).page;
    y -= 10;
  }

  if (options.includeDebts) {
    ensureSpace(80);
    drawText("Debts", 14, true);
    const result = drawPdfTable({
      pdf,
      page,
      startY: y,
      columns: [
        { title: "Created", width: 65 },
        { title: "Counterparty", width: 120 },
        { title: "Status", width: 70 },
        { title: "Balance", width: 80 },
        { title: "Due", width: 70 },
        { title: "Type", width: 110 }
      ],
      rows: data.debts.length
        ? data.debts.map((debt) => [
            format(debt.createdAt, "yyyy-MM-dd"),
            debt.counterpartyName,
            debt.status,
            formatCurrency(debt.balance, debt.currency),
            debt.dueDate ? format(debt.dueDate, "yyyy-MM-dd") : "",
            debt.type
          ])
        : [["No records available for selected range.", "", "", "", "", ""]],
      regular,
      bold,
      pageWidth,
      pageHeight,
      margin
    });
    page = result.page;
    y = result.y - 10;
  }

  ensureSpace(100);
  drawText("Category Summary", 14, true);
  if (data.categorySummaries.length) {
    data.categorySummaries.slice(0, 10).forEach((entry) => drawText(`${entry.category}: ${formatCurrency(entry.total)}`, 10));
  } else {
    drawText("No records available for selected range.", 10);
  }

  ensureSpace(100);
  drawText("Monthly Summary", 14, true);
  if (data.monthlySummaries.length) {
    data.monthlySummaries.slice(0, 12).forEach((entry) =>
      drawText(`${entry.month}: ${formatCurrency(entry.expenses)} spent · ${formatCurrency(entry.income)} income · ${formatCurrency(entry.net)} net`, 10)
    );
  } else {
    drawText("No records available for selected range.", 10);
  }

  if (options.includeNotes) {
    ensureSpace(80);
    drawText("Notes", 14, true);
    if (data.notes.length === 0) {
      drawText("No notes available for selected range.", 10);
    } else {
      data.notes.slice(0, 20).forEach((note) => {
        ensureSpace(24);
        drawText(`${note.source === "transaction" ? "Transaction" : "Debt"} · ${note.title}`, 10, true);
        drawText(note.note.slice(0, 140), 9);
      });
    }
  }

  const pages = pdf.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawText(`${index + 1} / ${pages.length}`, {
      x: pageWidth - 70,
      y: 20,
      size: 9,
      font: regular,
      color: rgb(0.38, 0.43, 0.5)
    });
  });

  return {
    fileName: `${makeFileBaseName(data)}.pdf`,
    contentType: "application/pdf",
    buffer: Buffer.from(await pdf.save())
  };
}

function drawSummaryCardsPdf(page: PDFPage, data: WorkspaceExportData, topY: number) {
  const cards = [
    { label: "Expenses", value: formatCurrency(data.summary.totalExpenses), color: rgb(0.85, 0.35, 0.35) },
    { label: "Income", value: formatCurrency(data.summary.totalIncome), color: rgb(0.19, 0.7, 0.58) },
    { label: "Net Flow", value: formatCurrency(data.summary.netFlow), color: rgb(0.15, 0.45, 0.85) },
    { label: "Debt Balance", value: formatCurrency(data.summary.debtsOwedToUser - data.summary.debtsUserOwe), color: rgb(0.67, 0.53, 0.18) }
  ];

  cards.forEach((card, index) => {
    const x = 40 + (index % 2) * 250;
    const y = topY - Math.floor(index / 2) * 52;
    page.drawRectangle({ x, y, width: 220, height: 40, color: rgb(0.96, 0.97, 0.99), borderColor: rgb(0.88, 0.9, 0.95), borderWidth: 1 });
    page.drawText(card.label, { x: x + 12, y: y + 24, size: 9, color: rgb(0.33, 0.38, 0.45) });
    page.drawText(card.value, { x: x + 12, y: y + 9, size: 13, color: card.color });
  });
}

function drawPdfTable({
  pdf,
  page,
  startY,
  columns,
  rows,
  regular,
  bold,
  pageWidth,
  pageHeight,
  margin
}: {
  pdf: PDFDocument;
  page: PDFPage;
  startY: number;
  columns: Array<{ title: string; width: number }>;
  rows: string[][];
  regular: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  pageWidth: number;
  pageHeight: number;
  margin: number;
}) {
  let currentPage: PDFPage = page;
  let y = startY;
  const rowHeight = 18;

  const addPage = () => {
    currentPage = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - 50;
    drawHeader();
  };

  const drawHeader = () => {
    if (!columns.length) return;
    let x = margin;
    currentPage.drawRectangle({ x: margin, y: y - 3, width: columns.reduce((sum, col) => sum + col.width, 0), height: rowHeight, color: rgb(0.93, 0.95, 0.98) });
    columns.forEach((col) => {
      currentPage.drawText(col.title, { x: x + 4, y: y + 2, size: 9, font: bold, color: rgb(0.18, 0.22, 0.3) });
      x += col.width;
    });
    y -= rowHeight;
  };

  if (columns.length) {
    if (y < margin + 40) addPage();
    drawHeader();
  }

  rows.forEach((row) => {
    if (y < margin + 20) addPage();
    let x = margin;
    row.forEach((cell, index) => {
      const width = columns[index]?.width ?? 120;
      currentPage.drawText(String(cell).slice(0, 32), {
        x: x + 4,
        y: y + 2,
        size: 8,
        font: regular,
        color: rgb(0.14, 0.18, 0.24)
      });
      x += width;
    });
    y -= rowHeight;
  });

  return { page: currentPage, y };
}

function styleWorksheetHeader(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.properties.defaultRowHeight = 20;
}

function addHeaderRowStyle(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF0F172A" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" }
  };
  row.alignment = { vertical: "middle" };
}

function tableFromRows(rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: rows.map((row, rowIndex) =>
      new TableRow({
        children: row.map((cell) =>
          new TableCell({
            width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: cell, bold: rowIndex === 0 })]
              })
            ]
          })
        )
      })
    )
  });
}

function summaryParagraphs(data: WorkspaceExportData) {
  return [
    new Paragraph(`Total expenses: ${formatCurrency(data.summary.totalExpenses)}`),
    new Paragraph(`Total income: ${formatCurrency(data.summary.totalIncome)}`),
    new Paragraph(`Net flow: ${formatCurrency(data.summary.netFlow)}`),
    new Paragraph(`Debts owed to user: ${formatCurrency(data.summary.debtsOwedToUser)}`),
    new Paragraph(`Debts user owes: ${formatCurrency(data.summary.debtsUserOwe)}`)
  ];
}

function buildTransactionCsvRows(data: WorkspaceExportData) {
  return [
    ["date", "title", "type", "amount", "currency", "merchant", "category", "paymentMethod", "notes"],
    ...(data.transactions.length
      ? data.transactions.map((tx) => [
          format(tx.date, "yyyy-MM-dd"),
          tx.title,
          tx.type,
          tx.amount.toFixed(2),
          tx.currency,
          tx.merchant ?? "",
          tx.category ?? "",
          tx.paymentMethod ?? "",
          tx.notes ?? ""
        ])
      : [["No records available for selected range.", "", "", "", "", "", "", "", ""]])
  ];
}

function buildDebtCsvRows(data: WorkspaceExportData) {
  return [
    ["createdAt", "counterpartyName", "type", "status", "total", "paid", "balance", "currency", "dueDate", "purpose", "notes"],
    ...(data.debts.length
      ? data.debts.map((debt) => [
          format(debt.createdAt, "yyyy-MM-dd"),
          debt.counterpartyName,
          debt.type,
          debt.status,
          debt.total.toFixed(2),
          debt.paid.toFixed(2),
          debt.balance.toFixed(2),
          debt.currency,
          debt.dueDate ? format(debt.dueDate, "yyyy-MM-dd") : "",
          debt.purpose ?? "",
          debt.notes ?? ""
        ])
      : [["No records available for selected range.", "", "", "", "", "", "", "", "", "", ""]])
  ];
}

function buildCombinedCsvRows(data: WorkspaceExportData) {
  const header = [
    "recordType",
    "date",
    "title",
    "counterparty",
    "type",
    "status",
    "amount",
    "paid",
    "balance",
    "currency",
    "category",
    "notes"
  ];

  const transactionRows = data.transactions.map((tx) => [
    "transaction",
    format(tx.date, "yyyy-MM-dd"),
    tx.title,
    tx.merchant ?? "",
    tx.type,
    "",
    tx.amount.toFixed(2),
    "",
    "",
    tx.currency,
    tx.category ?? "",
    tx.notes ?? ""
  ]);
  const debtRows = data.debts.map((debt) => [
    "debt",
    format(debt.createdAt, "yyyy-MM-dd"),
    debt.purpose ?? debt.counterpartyName,
    debt.counterpartyName,
    debt.type,
    debt.status,
    debt.total.toFixed(2),
    debt.paid.toFixed(2),
    debt.balance.toFixed(2),
    debt.currency,
    "",
    debt.notes ?? ""
  ]);

  return [header, ...(transactionRows.length || debtRows.length ? [...transactionRows, ...debtRows] : [["No records available for selected range.", "", "", "", "", "", "", "", "", "", "", ""]])];
}

function escapeCsv(value: string) {
  if (value === undefined || value === null) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
