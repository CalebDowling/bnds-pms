"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type AgingBucket = {
  current: number;   // 0-30 days
  days30: number;    // 31-60 days
  days60: number;    // 61-90 days
  days90: number;    // 91-120 days
  days120Plus: number; // 120+ days
  total: number;
};

export type PatientAging = {
  patientId: string;
  patientName: string;
  mrn: string;
  accountNumber: string | null;
  phone: string | null;
  email: string | null;
  buckets: AgingBucket;
  oldestChargeDate: string | null;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
};

export type AgingSummary = {
  totals: AgingBucket;
  patientCount: number;
  patients: PatientAging[];
};

/**
 * Get AR aging report with 30/60/90/120+ day buckets per patient.
 */
export async function getArAgingReport({
  search = "",
  minBalance = 0,
  sortBy = "total_desc",
}: {
  search?: string;
  minBalance?: number;
  sortBy?: string;
} = {}): Promise<AgingSummary> {
  await requireUser();

  const now = new Date();
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const day60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const day90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const day120 = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);

  // Get all charge accounts with a positive balance
  const accounts = await prisma.chargeAccount.findMany({
    where: {
      currentBalance: { gt: 0 },
      status: "active",
      ...(search
        ? {
            patient: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { mrn: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mrn: true,
          email: true,
          phoneNumbers: {
            where: { isPrimary: true },
            select: { number: true },
            take: 1,
          },
        },
      },
      transactions: {
        where: {
          transactionType: "charge",
        },
        orderBy: { createdAt: "asc" },
        select: {
          amount: true,
          createdAt: true,
        },
      },
    },
  });

  // Get last payment for each patient
  const patientIds = accounts.map((a) => a.patient.id);
  const lastPayments = await prisma.payment.findMany({
    where: {
      patientId: { in: patientIds },
      status: "completed",
    },
    orderBy: { processedAt: "desc" },
    distinct: ["patientId"],
    select: {
      patientId: true,
      amount: true,
      processedAt: true,
    },
  });

  const paymentMap = new Map(
    lastPayments.map((p) => [p.patientId, p])
  );

  // Calculate aging buckets per patient
  const patients: PatientAging[] = [];
  const summaryTotals: AgingBucket = {
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
    days120Plus: 0,
    total: 0,
  };

  for (const account of accounts) {
    const buckets: AgingBucket = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      days120Plus: 0,
      total: 0,
    };

    let oldestDate: Date | null = null;

    // Distribute charges into aging buckets based on transaction date
    for (const tx of account.transactions) {
      const amount = Number(tx.amount);
      const date = new Date(tx.createdAt);

      if (!oldestDate || date < oldestDate) oldestDate = date;

      if (date > day30) {
        buckets.current += amount;
      } else if (date > day60) {
        buckets.days30 += amount;
      } else if (date > day90) {
        buckets.days60 += amount;
      } else if (date > day120) {
        buckets.days90 += amount;
      } else {
        buckets.days120Plus += amount;
      }
    }

    // Cap total to actual balance (payments may have reduced it)
    const actualBalance = Number(account.currentBalance);
    const chargeTotal = buckets.current + buckets.days30 + buckets.days60 + buckets.days90 + buckets.days120Plus;

    // If charges > actual balance, proportionally reduce from newest buckets first
    if (chargeTotal > actualBalance && chargeTotal > 0) {
      const ratio = actualBalance / chargeTotal;
      buckets.current = Math.round(buckets.current * ratio * 100) / 100;
      buckets.days30 = Math.round(buckets.days30 * ratio * 100) / 100;
      buckets.days60 = Math.round(buckets.days60 * ratio * 100) / 100;
      buckets.days90 = Math.round(buckets.days90 * ratio * 100) / 100;
      buckets.days120Plus = Math.round(buckets.days120Plus * ratio * 100) / 100;
    }

    buckets.total = Math.round((buckets.current + buckets.days30 + buckets.days60 + buckets.days90 + buckets.days120Plus) * 100) / 100;

    if (buckets.total < minBalance) continue;

    const lastPayment = paymentMap.get(account.patient.id);

    patients.push({
      patientId: account.patient.id,
      patientName: `${account.patient.lastName}, ${account.patient.firstName}`,
      mrn: account.patient.mrn,
      accountNumber: account.accountNumber,
      phone: account.patient.phoneNumbers[0]?.number || null,
      email: account.patient.email || null,
      buckets,
      oldestChargeDate: oldestDate?.toISOString() || null,
      lastPaymentDate: lastPayment?.processedAt.toISOString() || null,
      lastPaymentAmount: lastPayment ? Number(lastPayment.amount) : null,
    });

    summaryTotals.current += buckets.current;
    summaryTotals.days30 += buckets.days30;
    summaryTotals.days60 += buckets.days60;
    summaryTotals.days90 += buckets.days90;
    summaryTotals.days120Plus += buckets.days120Plus;
    summaryTotals.total += buckets.total;
  }

  // Round totals
  summaryTotals.current = Math.round(summaryTotals.current * 100) / 100;
  summaryTotals.days30 = Math.round(summaryTotals.days30 * 100) / 100;
  summaryTotals.days60 = Math.round(summaryTotals.days60 * 100) / 100;
  summaryTotals.days90 = Math.round(summaryTotals.days90 * 100) / 100;
  summaryTotals.days120Plus = Math.round(summaryTotals.days120Plus * 100) / 100;
  summaryTotals.total = Math.round(summaryTotals.total * 100) / 100;

  // Sort
  if (sortBy === "total_desc") {
    patients.sort((a, b) => b.buckets.total - a.buckets.total);
  } else if (sortBy === "total_asc") {
    patients.sort((a, b) => a.buckets.total - b.buckets.total);
  } else if (sortBy === "oldest") {
    patients.sort((a, b) => {
      if (!a.oldestChargeDate) return 1;
      if (!b.oldestChargeDate) return -1;
      return new Date(a.oldestChargeDate).getTime() - new Date(b.oldestChargeDate).getTime();
    });
  } else if (sortBy === "patient") {
    patients.sort((a, b) => a.patientName.localeCompare(b.patientName));
  }

  return {
    totals: summaryTotals,
    patientCount: patients.length,
    patients,
  };
}
