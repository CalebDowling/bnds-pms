"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ─── THIRD PARTY PLANS ──────────────────────

export async function getPlans({ search = "", page = 1, limit = 25 }: { search?: string; page?: number; limit?: number } = {}) {
  const { prisma } = await import("@/lib/prisma");
  const skip = (page - 1) * limit;
  const where: Prisma.ThirdPartyPlanWhereInput = {};
  if (search) {
    where.OR = [
      { planName: { contains: search, mode: "insensitive" } },
      { bin: { contains: search, mode: "insensitive" } },
    ];
  }

  const [plans, total] = await Promise.all([
    prisma.thirdPartyPlan.findMany({
      where,
      include: { _count: { select: { patientInsurance: true } } },
      orderBy: { planName: "asc" },
      skip,
      take: limit,
    }),
    prisma.thirdPartyPlan.count({ where }),
  ]);

  return { plans, total, pages: Math.ceil(total / limit), page };
}

export async function getPlan(id: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.thirdPartyPlan.findUnique({
    where: { id },
    include: {
      patientInsurance: {
        where: { isActive: true },
        include: { patient: { select: { firstName: true, lastName: true, mrn: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

export type PlanFormData = {
  planName: string;
  bin: string;
  pcn?: string;
  phone?: string;
  planType?: string;
};

export async function createPlan(data: PlanFormData) {
  const { prisma } = await import("@/lib/prisma");
  const plan = await prisma.thirdPartyPlan.create({
    data: {
      planName: data.planName.trim(),
      bin: data.bin.trim(),
      pcn: data.pcn?.trim() || null,
      phone: data.phone?.trim() || null,
      planType: data.planType?.trim() || null,
    },
  });
  revalidatePath("/insurance");
  return plan;
}

export async function updatePlan(id: string, data: PlanFormData) {
  const { prisma } = await import("@/lib/prisma");
  await prisma.thirdPartyPlan.update({
    where: { id },
    data: {
      planName: data.planName.trim(),
      bin: data.bin.trim(),
      pcn: data.pcn?.trim() || null,
      phone: data.phone?.trim() || null,
      planType: data.planType?.trim() || null,
    },
  });
  revalidatePath("/insurance");
}

// ─── PATIENT INSURANCE ──────────────────────

export async function searchPlans(query: string) {
  if (!query || query.length < 2) return [];
  const { prisma } = await import("@/lib/prisma");
  return prisma.thirdPartyPlan.findMany({
    where: {
      isActive: true,
      OR: [
        { planName: { contains: query, mode: "insensitive" } },
        { bin: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, planName: true, bin: true, pcn: true, planType: true },
    take: 10,
    orderBy: { planName: "asc" },
  });
}

export type PatientInsuranceFormData = {
  patientId: string;
  thirdPartyPlanId: string;
  priority: string;
  memberId: string;
  personCode?: string;
  groupNumber?: string;
  relationship?: string;
  cardholderName?: string;
  cardholderId?: string;
  effectiveDate?: string;
};

export async function addPatientInsurance(data: PatientInsuranceFormData) {
  const { prisma } = await import("@/lib/prisma");
  const ins = await prisma.patientInsurance.create({
    data: {
      patientId: data.patientId,
      thirdPartyPlanId: data.thirdPartyPlanId,
      priority: data.priority,
      memberId: data.memberId.trim(),
      personCode: data.personCode?.trim() || null,
      groupNumber: data.groupNumber?.trim() || null,
      relationship: data.relationship?.trim() || null,
      cardholderName: data.cardholderName?.trim() || null,
      cardholderId: data.cardholderId?.trim() || null,
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
    },
  });
  revalidatePath(`/patients/${data.patientId}`);
  return ins;
}

// ─── CLAIMS ENHANCEMENTS ────────────────────

export async function getClaimStats() {
  const { prisma } = await import("@/lib/prisma");
  const [pending, submitted, rejected, paid] = await Promise.all([
    prisma.claim.count({ where: { status: "pending" } }),
    prisma.claim.count({ where: { status: "submitted" } }),
    prisma.claim.count({ where: { status: "rejected" } }),
    prisma.claim.count({ where: { status: "paid" } }),
  ]);
  return { pending, submitted, rejected, paid };
}

/**
 * List claims for the /insurance page.
 *
 * Filter buckets:
 *   - rejected      → status="rejected" (operator must act)
 *   - pending       → status in ("pending", "submitted") (waiting for payer)
 *   - paid          → status in ("paid", "partial") (closed)
 *   - all           → no status filter
 *
 * Search hits the rxNumber, patient name, plan name. Limit defaults to
 * 50 so the page is responsive even on a large claim history; an
 * operator who needs older history pivots to the dedicated billing /
 * compliance reports.
 */
export async function getClaims({
  filter = "rejected",
  search = "",
  limit = 50,
  page = 1,
}: {
  filter?: "rejected" | "pending" | "paid" | "all";
  search?: string;
  limit?: number;
  page?: number;
} = {}) {
  const { prisma } = await import("@/lib/prisma");
  const { Prisma } = await import("@prisma/client");
  const where: import("@prisma/client").Prisma.ClaimWhereInput = {};

  if (filter === "rejected") where.status = "rejected";
  else if (filter === "pending") where.status = { in: ["pending", "submitted"] };
  else if (filter === "paid") where.status = { in: ["paid", "partial"] };

  if (search.trim()) {
    const q = search.trim();
    where.OR = [
      { claimNumber: { contains: q, mode: "insensitive" } },
      { fills: { some: { prescription: { rxNumber: { contains: q, mode: "insensitive" } } } } },
      {
        insurance: {
          patient: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
      { insurance: { thirdPartyPlan: { planName: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const skip = (page - 1) * limit;

  const [claims, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      include: {
        insurance: {
          include: {
            patient: { select: { firstName: true, lastName: true, middleName: true } },
            thirdPartyPlan: { select: { planName: true } },
          },
        },
        // Claim → PrescriptionFill is a 1-to-many via fills relation; we
        // use the first fill for display purposes (claims usually map to
        // a single fill, but the schema allows reversal/split linking).
        fills: {
          take: 1,
          include: {
            prescription: { select: { rxNumber: true } },
            item: {
              select: { name: true, genericName: true, brandName: true, ndc: true, strength: true },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.claim.count({ where }),
  ]);

  return { claims, total, pages: Math.ceil(total / limit), page };
}
