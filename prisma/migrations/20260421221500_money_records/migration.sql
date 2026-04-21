-- Phase 1: Unified Money Records engine (additive only).
-- This migration introduces MoneyRecord and its satellites, plus
-- nullable link columns on Transaction and Debt so legacy rows can
-- map 1:1 to new rows during dual-write. No existing column or
-- table is altered destructively.

-- CreateEnum
CREATE TYPE "MoneyRecordType" AS ENUM ('EXPENSE', 'INCOME', 'DEBT_GIVEN', 'DEBT_BORROWED', 'SPLIT_EXPENSE', 'TRANSFER', 'REIMBURSEMENT');

-- CreateEnum
CREATE TYPE "MoneyRecordStatus" AS ENUM ('PENDING', 'CLEARED', 'PAID', 'PARTIAL', 'OVERDUE', 'VOID');

-- CreateTable
CREATE TABLE "MoneyRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "categoryId" TEXT,
    "type" "MoneyRecordType" NOT NULL,
    "status" "MoneyRecordStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "counterpartyName" TEXT,
    "counterpartyUserId" TEXT,
    "merchant" TEXT,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "aiSource" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyRecordAttachment" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'RECEIPT',
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyRecordAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyRecordSplit" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "participantEmail" TEXT,
    "participantUserId" TEXT,
    "share" DECIMAL(12,2) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyRecordSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyRecordPayment" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyRecordPayment_pkey" PRIMARY KEY ("id")
);

-- AlterTable: nullable link column on Transaction (additive)
ALTER TABLE "Transaction" ADD COLUMN "moneyRecordId" TEXT;

-- AlterTable: nullable link column on Debt (additive)
ALTER TABLE "Debt" ADD COLUMN "moneyRecordId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_moneyRecordId_key" ON "Transaction"("moneyRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "Debt_moneyRecordId_key" ON "Debt"("moneyRecordId");

-- CreateIndex
CREATE INDEX "MoneyRecord_workspaceId_occurredAt_idx" ON "MoneyRecord"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "MoneyRecord_workspaceId_type_idx" ON "MoneyRecord"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "MoneyRecord_workspaceId_status_idx" ON "MoneyRecord"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "MoneyRecordAttachment_recordId_idx" ON "MoneyRecordAttachment"("recordId");

-- CreateIndex
CREATE INDEX "MoneyRecordSplit_recordId_idx" ON "MoneyRecordSplit"("recordId");

-- CreateIndex
CREATE INDEX "MoneyRecordPayment_recordId_idx" ON "MoneyRecordPayment"("recordId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_moneyRecordId_fkey" FOREIGN KEY ("moneyRecordId") REFERENCES "MoneyRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_moneyRecordId_fkey" FOREIGN KEY ("moneyRecordId") REFERENCES "MoneyRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyRecord" ADD CONSTRAINT "MoneyRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyRecord" ADD CONSTRAINT "MoneyRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyRecord" ADD CONSTRAINT "MoneyRecord_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyRecordAttachment" ADD CONSTRAINT "MoneyRecordAttachment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MoneyRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyRecordSplit" ADD CONSTRAINT "MoneyRecordSplit_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MoneyRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyRecordPayment" ADD CONSTRAINT "MoneyRecordPayment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MoneyRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyRecordPayment" ADD CONSTRAINT "MoneyRecordPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
