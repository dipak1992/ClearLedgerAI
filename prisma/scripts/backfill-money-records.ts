/**
 * Idempotent backfill: populate `MoneyRecord` rows for every existing
 * `Transaction` and `Debt` that does not yet have one, and mirror
 * each `DebtPayment` into `MoneyRecordPayment`.
 *
 * Usage (against Neon):
 *
 *   DATABASE_URL=... npx tsx prisma/scripts/backfill-money-records.ts
 *
 * The script is safe to run multiple times — rows with a non-null
 * `moneyRecordId` or payments already mirrored are skipped.
 */

import { MoneyRecordStatus, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  debtStatusToRecordStatus,
  debtToRecordData,
  transactionToRecordData
} from "../../src/lib/money-records/mappers";

const BATCH = 200;

async function main() {
  const connectionString =
    process.env.DATABASE_URL ??
    process.env.NEON_DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL or NEON_DATABASE_URL must be set before running backfill."
    );
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    let txCount = 0;
    let debtCount = 0;
    let paymentCount = 0;

    // -------- Transactions --------
    for (;;) {
      const batch = await prisma.transaction.findMany({
        where: { moneyRecordId: null },
        take: BATCH,
        orderBy: { createdAt: "asc" }
      });

      if (batch.length === 0) break;

      for (const tx of batch) {
        const record = await prisma.moneyRecord.create({
          data: transactionToRecordData(tx)
        });
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { moneyRecordId: record.id }
        });
        txCount++;
      }
    }

    // -------- Debts + payments --------
    for (;;) {
      const batch = await prisma.debt.findMany({
        where: { moneyRecordId: null },
        take: BATCH,
        orderBy: { createdAt: "asc" },
        include: { payments: true }
      });

      if (batch.length === 0) break;

      for (const debt of batch) {
        const record = await prisma.moneyRecord.create({
          data: debtToRecordData(debt)
        });

        await prisma.debt.update({
          where: { id: debt.id },
          data: { moneyRecordId: record.id }
        });

        if (debt.payments.length > 0) {
          await prisma.moneyRecordPayment.createMany({
            data: debt.payments.map((payment) => ({
              recordId: record.id,
              createdById: payment.createdById,
              amount: payment.amount,
              paymentDate: payment.paymentDate,
              method: payment.method ?? null,
              notes: payment.notes ?? null
            }))
          });
          paymentCount += debt.payments.length;
        }

        // Sync the aggregate amountPaid/status on the new record.
        await prisma.moneyRecord.update({
          where: { id: record.id },
          data: {
            amountPaid: debt.amountPaid,
            status:
              Number(debt.amountPaid) >= Number(debt.amountTotal)
                ? MoneyRecordStatus.PAID
                : debtStatusToRecordStatus(debt.status)
          }
        });

        debtCount++;
      }
    }

    console.log(
      `[backfill] Done. transactions=${txCount} debts=${debtCount} payments=${paymentCount}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[backfill] Failed", err);
  process.exit(1);
});
