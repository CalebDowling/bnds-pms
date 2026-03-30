"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface EligibilityResponse {
  eligible: boolean;
  copayGeneric: number;
  copayBrand: number;
  deductible: number;
  deductibleMet: number;
  coveragePercent: number;
  priorAuthRequired: boolean;
  message: string;
}

interface SearchPatientResult {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
  insuranceCount: number;
}

interface PatientInsuranceWithPlan {
  id: string;
  memberId: string;
  groupNumber: string | null;
  personCode: string | null;
  relationship: string | null;
  cardholderName: string | null;
  cardholderId: string | null;
  effectiveDate: Date | null;
  terminationDate: Date | null;
  isActive: boolean;
  priority: string;
  lastEligibilityCheck: Date | null;
  thirdPartyPlan: {
    id: string;
    planName: string;
    bin: string | null;
    pcn: string | null;
  } | null;
}

interface EligibilityCheckResult {
  id: string;
  status: string;
  responseData: EligibilityResponse | null;
  checkedAt: Date;
}

interface RecentCheckResult {
  id: string;
  status: string;
  responseData: EligibilityResponse | null;
  checkedAt: Date;
  checkedBy: string | null;
  insurance: {
    memberId: string;
    patient: {
      firstName: string;
      lastName: string;
    };
    thirdPartyPlan: {
      planName: string;
    } | null;
  };
}

export async function searchPatientsForEligibility(
  query: string
): Promise<SearchPatientResult[]> {
  const user = await requireUser();

  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        {
          firstName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          mrn: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      mrn: true,
      dateOfBirth: true,
      _count: {
        select: {
          insurances: true,
        },
      },
    },
    take: 20,
  });

  return patients.map((patient) => ({
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    mrn: patient.mrn,
    dateOfBirth: patient.dateOfBirth.toISOString().split("T")[0],
    insuranceCount: patient._count.insurances,
  }));
}

export async function getPatientInsurance(
  patientId: string
): Promise<PatientInsuranceWithPlan[]> {
  const user = await requireUser();

  const insurances = await prisma.patientInsurance.findMany({
    where: {
      patientId,
    },
    select: {
      id: true,
      memberId: true,
      groupNumber: true,
      personCode: true,
      relationship: true,
      cardholderName: true,
      cardholderId: true,
      effectiveDate: true,
      terminationDate: true,
      isActive: true,
      priority: true,
      lastEligibilityCheck: true,
      thirdPartyPlan: {
        select: {
          id: true,
          planName: true,
          bin: true,
          pcn: true,
        },
      },
    },
    orderBy: [{ priority: "asc" }, { effectiveDate: "desc" }],
  });

  return insurances as PatientInsuranceWithPlan[];
}

export async function runEligibilityCheck(
  patientId: string,
  insuranceId: string
): Promise<EligibilityCheckResult> {
  const user = await requireUser();

  // Verify the insurance belongs to the patient
  const insurance = await prisma.patientInsurance.findUnique({
    where: { id: insuranceId },
  });

  if (!insurance || insurance.patientId !== patientId) {
    throw new Error("Insurance record not found for this patient");
  }

  // Simulate eligibility check response
  // In production, this would call an actual NCPDP E1 service
  const simulatedResponse: EligibilityResponse = {
    eligible: Math.random() > 0.1, // 90% eligible
    copayGeneric: Math.floor(Math.random() * 15) + 5, // $5-20
    copayBrand: Math.floor(Math.random() * 30) + 15, // $15-45
    deductible: [0, 250, 500, 1000][Math.floor(Math.random() * 4)],
    deductibleMet: Math.floor(Math.random() * 1000),
    coveragePercent: [80, 85, 90, 100][Math.floor(Math.random() * 4)],
    priorAuthRequired: Math.random() > 0.85,
    message: "Coverage verified from insurance carrier",
  };

  // Create eligibility check record
  const eligibilityCheck = await prisma.eligibilityCheck.create({
    data: {
      id: crypto.randomUUID(),
      patientId,
      insuranceId,
      status: simulatedResponse.eligible ? "eligible" : "ineligible",
      responseData: simulatedResponse as unknown as object,
      checkedBy: user.id,
    },
  });

  // Update last eligibility check timestamp
  await prisma.patientInsurance.update({
    where: { id: insuranceId },
    data: {
      lastEligibilityCheck: new Date(),
    },
  });

  revalidatePath("/insurance/eligibility");

  return {
    id: eligibilityCheck.id,
    status: eligibilityCheck.status,
    responseData: simulatedResponse,
    checkedAt: eligibilityCheck.checkedAt,
  };
}

export async function batchEligibilityCheck(
  patientInsuranceIds: string[]
): Promise<EligibilityCheckResult[]> {
  const user = await requireUser();
  const results: EligibilityCheckResult[] = [];

  for (const insuranceId of patientInsuranceIds) {
    const insurance = await prisma.patientInsurance.findUnique({
      where: { id: insuranceId },
    });

    if (!insurance) continue;

    const simulatedResponse: EligibilityResponse = {
      eligible: Math.random() > 0.1,
      copayGeneric: Math.floor(Math.random() * 15) + 5,
      copayBrand: Math.floor(Math.random() * 30) + 15,
      deductible: [0, 250, 500, 1000][Math.floor(Math.random() * 4)],
      deductibleMet: Math.floor(Math.random() * 1000),
      coveragePercent: [80, 85, 90, 100][Math.floor(Math.random() * 4)],
      priorAuthRequired: Math.random() > 0.85,
      message: "Coverage verified from insurance carrier",
    };

    const eligibilityCheck = await prisma.eligibilityCheck.create({
      data: {
        id: crypto.randomUUID(),
        patientId: insurance.patientId,
        insuranceId,
        status: simulatedResponse.eligible ? "eligible" : "ineligible",
        responseData: simulatedResponse as unknown as object,
        checkedBy: user.id,
      },
    });

    await prisma.patientInsurance.update({
      where: { id: insuranceId },
      data: {
        lastEligibilityCheck: new Date(),
      },
    });

    results.push({
      id: eligibilityCheck.id,
      status: eligibilityCheck.status,
      responseData: simulatedResponse,
      checkedAt: eligibilityCheck.checkedAt,
    });
  }

  revalidatePath("/insurance/eligibility");

  return results;
}

interface GetRecentChecksOptions {
  limit?: number;
  patientId?: string;
}

export async function getRecentChecks(
  options: GetRecentChecksOptions = {}
): Promise<RecentCheckResult[]> {
  const user = await requireUser();
  const { limit = 20, patientId } = options;

  const checks = await prisma.eligibilityCheck.findMany({
    where: {
      ...(patientId && { patientId }),
    },
    select: {
      id: true,
      status: true,
      responseData: true,
      checkedAt: true,
      checkedBy: true,
      insurance: {
        select: {
          memberId: true,
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          thirdPartyPlan: {
            select: {
              planName: true,
            },
          },
        },
      },
    },
    orderBy: {
      checkedAt: "desc",
    },
    take: limit,
  });

  return checks as RecentCheckResult[];
}

interface EligibilityStats {
  checksToday: number;
  eligiblePercent: number;
  neverCheckedCount: number;
}

export async function getEligibilityStats(): Promise<EligibilityStats> {
  const user = await requireUser();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Total checks today
  const checksToday = await prisma.eligibilityCheck.count({
    where: {
      checkedAt: {
        gte: today,
      },
    },
  });

  // Eligible percentage
  const totalChecks = await prisma.eligibilityCheck.count();
  const eligibleChecks = await prisma.eligibilityCheck.count({
    where: {
      status: "eligible",
    },
  });
  const eligiblePercent =
    totalChecks > 0 ? Math.round((eligibleChecks / totalChecks) * 100) : 0;

  // Never checked count
  const neverCheckedCount = await prisma.patientInsurance.count({
    where: {
      lastEligibilityCheck: null,
      isActive: true,
    },
  });

  return {
    checksToday,
    eligiblePercent,
    neverCheckedCount,
  };
}
