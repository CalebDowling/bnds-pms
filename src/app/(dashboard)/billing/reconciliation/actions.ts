"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

// ═══════════════════════════════════════════════
// CASH RECONCILIATION
// ═══════════════════════════════════════════════

export async function getCashReconciliation({
  startDate,
  endDate,
  page = 1,
  limit = 25,
}: {
  startDate: Date;
  endDate: Date;
  page?: number;
  limit?: number;
}) {
  const skip = (page - 1) * limit;

  const where: Prisma.PosLineItemWhereInput = {
    transaction: {
      processedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  };

  const [items, total] = await Promise.all([
    prisma.posLineItem.findMany({
      where,
      include: {
        transaction: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        fill: {
          include: {
            prescription: { select: { rxNumber: true } },
          },
        },
      },
      orderBy: { transaction: { processedAt: "desc" } },
      skip,
      take: limit,
    }),
    prisma.posLineItem.count({ where }),
  ]);

  const reconciled = items.map((item) => {
    const expectedAmount = item.fill?.copayAmount ? Number(item.fill.copayAmount) : Number(item.total);
    const receivedAmount = Number(item.total);
    const difference = receivedAmount - expectedAmount;

    return {
      id: item.id,
      saleNumber: item.transaction.id,
      patient: item.transaction.patient
        ? `${item.transaction.patient.firstName} ${item.transaction.patient.lastName}`
        : "Unknown",
      expectedAmount,
      receivedAmount,
      difference,
      status: difference === 0 ? "matched" : "discrepancy",
      date: item.transaction.processedAt,
    };
  });

  return {
    items: reconciled,
    total,
    pages: Math.ceil(total / limit),
    page,
  };
}

// ═══════════════════════════════════════════════
// INSURANCE RECONCILIATION
// ═══════════════════════════════════════════════

export async function getInsuranceReconciliation({
  startDate,
  endDate,
  page = 1,
  limit = 25,
}: {
  startDate: Date;
  endDate: Date;
  page?: number;
  limit?: number;
}) {
  const skip = (page - 1) * limit;

  const where: Prisma.ClaimWhereInput = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  const [claims, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      include: {
        insurance: {
          include: {
            thirdPartyPlan: { select: { planName: true } },
            patient: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        fills: {
          take: 1,
          include: {
            prescription: { select: { rxNumber: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.claim.count({ where }),
  ]);

  const reconciled = claims.map((claim) => {
    const expectedAmount = Number(claim.amountAllowed || claim.amountBilled);
    const receivedAmount = Number(claim.amountPaid || 0);
    const difference = receivedAmount - expectedAmount;

    return {
      id: claim.id,
      claimNumber: claim.claimNumber || "",
      patient: claim.insurance?.patient
        ? `${claim.insurance.patient.firstName} ${claim.insurance.patient.lastName}`
        : "Unknown",
      expectedAmount,
      receivedAmount,
      difference,
      status: Math.abs(difference) < 0.01
        ? "matched"
        : receivedAmount < expectedAmount
          ? "underpayment"
          : "overpayment",
      date: claim.createdAt,
    };
  });

  return {
    items: reconciled,
    total,
    pages: Math.ceil(total / limit),
    page,
  };
}

// ═══════════════════════════════════════════════
// RECONCILIATION STATS
// ═══════════════════════════════════════════════

export async function getReconciliationStats(startDate: Date, endDate: Date) {
  const [cashItems, insuranceClaims] = await Promise.all([
    prisma.posLineItem.findMany({
      where: {
        transaction: {
          processedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: { transaction: true, fill: true },
    }),
    prisma.claim.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
  ]);

  // Cash stats
  let cashTotal = 0;
  let cashMatched = 0;
  let cashDiscrepancies = 0;

  cashItems.forEach((item) => {
    cashTotal += Number(item.total);
    const expectedAmount = item.fill?.copayAmount ? Number(item.fill.copayAmount) : Number(item.total);
    const receivedAmount = Number(item.total);
    const difference = receivedAmount - expectedAmount;

    if (Math.abs(difference) < 0.01) {
      cashMatched++;
    } else {
      cashDiscrepancies++;
    }
  });

  // Insurance stats
  let expectedInsurance = 0;
  let receivedInsurance = 0;
  let insuranceMatched = 0;
  let insuranceDiscrepancies = 0;

  insuranceClaims.forEach((claim) => {
    const expected = Number(claim.amountAllowed || claim.amountBilled);
    const received = Number(claim.amountPaid || 0);

    expectedInsurance += expected;
    receivedInsurance += received;

    if (Math.abs(received - expected) < 0.01) {
      insuranceMatched++;
    } else {
      insuranceDiscrepancies++;
    }
  });

  return {
    cash: {
      totalExpected: cashTotal,
      totalReceived: cashTotal,
      itemsMatched: cashMatched,
      itemsDiscrepancies: cashDiscrepancies,
      totalItems: cashItems.length,
      percentMatched: cashItems.length > 0 ? (cashMatched / cashItems.length) * 100 : 0,
    },
    insurance: {
      totalExpected: expectedInsurance,
      totalReceived: receivedInsurance,
      itemsMatched: insuranceMatched,
      itemsDiscrepancies: insuranceDiscrepancies,
      totalItems: insuranceClaims.length,
      percentMatched: insuranceClaims.length > 0 ? (insuranceMatched / insuranceClaims.length) * 100 : 0,
    },
  };
}

// ═══════════════════════════════════════════════
// MARK RECONCILED
// ═══════════════════════════════════════════════

export async function markReconciled(
  ids: string[],
  type: "cash" | "insurance"
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  if (type === "cash") {
    // Cash reconciliation - PosTransaction doesn't have metadata field
    // Reconciliation tracking would need to be stored in a separate audit log or status field
    // For now, just acknowledge the action
  } else if (type === "insurance") {
    const claims = await prisma.claim.findMany({ where: { id: { in: ids } } });

    for (const claim of claims) {
      // Store reconciliation info in notes field as JSON
      let reconData = {
        reconciled: true,
        reconciledAt: new Date().toISOString(),
        reconciledBy: user.id,
      };

      if (claim.notes) {
        try {
          const existingData = JSON.parse(claim.notes);
          reconData = { ...existingData, ...reconData };
        } catch {
          // notes is plain text, start fresh
        }
      }

      await prisma.claim.update({
        where: { id: claim.id },
        data: { notes: JSON.stringify(reconData) },
      });
    }
  }

  revalidatePath("/billing/reconciliation");
}
