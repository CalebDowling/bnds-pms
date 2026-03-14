"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════════
// CLAIMS
// ═══════════════════════════════════════════════

export async function getClaims({
  search = "",
  status = "all",
  page = 1,
  limit = 25,
}: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;
  const where: any = {};

  if (status && status !== "all") where.status = status;

  if (search) {
    where.claimNumber = { contains: search, mode: "insensitive" };
  }

  const [claims, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      include: {
        insurance: {
          include: {
            thirdPartyPlan: { select: { planName: true, bin: true, pcn: true } },
            patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
          },
        },
        fills: {
          take: 1,
          include: {
            prescription: {
              select: {
                rxNumber: true,
                item: { select: { name: true } },
                formula: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.claim.count({ where }),
  ]);

  return { claims, total, pages: Math.ceil(total / limit), page };
}

export async function getClaim(id: string) {
  return prisma.claim.findUnique({
    where: { id },
    include: {
      insurance: {
        include: {
          thirdPartyPlan: true,
          patient: true,
        },
      },
      fills: {
        include: {
          prescription: {
            include: {
              patient: { select: { firstName: true, lastName: true, mrn: true } },
              item: true,
              prescriber: { select: { firstName: true, lastName: true, npi: true } },
            },
          },
        },
      },
    },
  });
}

export async function createClaim(data: {
  fillId: string;
  insuranceId: string;
  amountBilled: number;
}) {
  const claim = await prisma.claim.create({
    data: {
      fillId: data.fillId,
      insuranceId: data.insuranceId,
      amountBilled: data.amountBilled,
      status: "pending",
    },
  });

  revalidatePath("/billing");
  return claim;
}

export async function updateClaimStatus(
  id: string,
  status: string,
  data?: {
    amountAllowed?: number;
    amountPaid?: number;
    patientCopay?: number;
    claimNumber?: string;
  }
) {
  const updateData: any = { status };

  if (status === "submitted") updateData.submittedAt = new Date();
  if (status === "paid" || status === "partial") {
    updateData.adjudicatedAt = new Date();
    updateData.paidAt = new Date();
  }
  if (status === "rejected") updateData.adjudicatedAt = new Date();

  if (data?.amountAllowed !== undefined) updateData.amountAllowed = data.amountAllowed;
  if (data?.amountPaid !== undefined) updateData.amountPaid = data.amountPaid;
  if (data?.patientCopay !== undefined) updateData.patientCopay = data.patientCopay;
  if (data?.claimNumber) updateData.claimNumber = data.claimNumber;

  const claim = await prisma.claim.update({ where: { id }, data: updateData });
  revalidatePath("/billing");
  return claim;
}

// ═══════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════

export async function getPayments({
  search = "",
  page = 1,
  limit = 25,
}: {
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;
  const where: any = {};

  if (search) {
    where.OR = [
      { referenceNumber: { contains: search, mode: "insensitive" } },
      { patient: { lastName: { contains: search, mode: "insensitive" } } },
      { patient: { firstName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        fill: {
          select: { fillNumber: true, prescription: { select: { rxNumber: true } } },
        },
        processor: { select: { firstName: true, lastName: true } },
      },
      orderBy: { processedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return { payments, total, pages: Math.ceil(total / limit), page };
}

export async function createPayment(data: {
  patientId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  fillId?: string;
  userId: string;
}) {
  const payment = await prisma.payment.create({
    data: {
      patientId: data.patientId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber || null,
      fillId: data.fillId || null,
      processedBy: data.userId,
      status: "completed",
    },
  });

  revalidatePath("/billing");
  return payment;
}

// ─── STATS ──────────────────────────────────

export async function getBillingStats() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [pendingClaims, rejectedClaims, paymentsThisMonth, outstandingAgg] = await Promise.all([
    prisma.claim.count({ where: { status: "pending" } }),
    prisma.claim.count({ where: { status: "rejected" } }),
    prisma.payment.aggregate({
      where: { processedAt: { gte: startOfMonth }, status: "completed" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.claim.aggregate({
      where: { status: { in: ["submitted", "pending"] } },
      _sum: { amountBilled: true },
    }),
  ]);

  return {
    pendingClaims,
    rejectedClaims,
    paymentsThisMonth: paymentsThisMonth._count,
    paymentsThisMonthAmount: Number(paymentsThisMonth._sum.amount || 0),
    totalOutstanding: Number(outstandingAgg._sum.amountBilled || 0),
  };
}
