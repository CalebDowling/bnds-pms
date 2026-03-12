"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── THIRD PARTY PLANS ──────────────────────

export async function getPlans({ search = "", page = 1, limit = 25 }: { search?: string; page?: number; limit?: number } = {}) {
  const skip = (page - 1) * limit;
  const where: any = {};
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
  const [pending, submitted, rejected, paid] = await Promise.all([
    prisma.claim.count({ where: { status: "pending" } }),
    prisma.claim.count({ where: { status: "submitted" } }),
    prisma.claim.count({ where: { status: "rejected" } }),
    prisma.claim.count({ where: { status: "paid" } }),
  ]);
  return { pending, submitted, rejected, paid };
}
