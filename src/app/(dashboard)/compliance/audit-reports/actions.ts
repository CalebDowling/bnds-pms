"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { formatPatientName, formatPrescriberName } from "@/lib/utils/formatters";

// Compliance reports show staff actor names ("filler", "verifier",
// "compounder"). These are User rows whose firstName/lastName are
// internal, not DRX-imported, so artifact stripping is a no-op here —
// but we still route through the centralized formatter for
// consistency, title-casing, and to keep this file in line with the
// rest of the codebase. The formatter accepts any { firstName, lastName }
// shape, including User rows.
function formatStaffName(
  user: { firstName?: string | null; lastName?: string | null } | null | undefined
): string {
  if (!user) return "";
  return formatPatientName({
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  });
}

/**
 * Get dispensing log for Board of Pharmacy audits
 * Shows all dispensed fills within a date range with relevant details
 */
export async function getDispensingLog(
  startDate: string,
  endDate: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const where: Prisma.PrescriptionFillWhereInput = {
    status: "dispensed",
    dispensedAt: {
      gte: new Date(`${startDate}T00:00:00.000Z`),
      lte: new Date(`${endDate}T23:59:59.999Z`),
    },
  };

  const fills = await prisma.prescriptionFill.findMany({
    where,
    include: {
      prescription: {
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
            },
          },
        },
      },
      item: {
        select: {
          id: true,
          ndc: true,
          name: true,
          strength: true,
          dosageForm: true,
        },
      },
      filler: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          licenseNumber: true,
        },
      },
      verifier: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          licenseNumber: true,
        },
      },
    },
    orderBy: { dispensedAt: "desc" },
  });

  return fills.map((fill) => ({
    id: fill.id,
    rxNumber: fill.prescription.rxNumber,
    patientName: formatPatientName(fill.prescription.patient),
    patientMrn: fill.prescription.patient.mrn,
    drugName: fill.item?.name || "N/A",
    ndc: fill.item?.ndc,
    strength: fill.item?.strength,
    dosageForm: fill.item?.dosageForm,
    quantity: Number(fill.quantity),
    daysSupply: fill.daysSupply,
    filledBy: formatStaffName(fill.filler) || "N/A",
    verifiedBy: formatStaffName(fill.verifier) || "N/A",
    dispensedDate: fill.dispensedAt || fill.createdAt,
    filledDate: fill.filledAt,
    verifiedDate: fill.verifiedAt,
  }));
}

/**
 * Get controlled substance report with perpetual inventory tracking
 * Separate Schedule II, III, IV, and V substances
 */
export async function getControlledSubstanceReport(
  startDate: string,
  endDate: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const where: Prisma.PrescriptionFillWhereInput = {
    item: {
      isControlled: true,
    },
    dispensedAt: {
      gte: new Date(`${startDate}T00:00:00.000Z`),
      lte: new Date(`${endDate}T23:59:59.999Z`),
    },
  };

  const fills = await prisma.prescriptionFill.findMany({
    where,
    include: {
      item: {
        select: {
          id: true,
          ndc: true,
          name: true,
          strength: true,
          deaSchedule: true,
          isControlled: true,
        },
      },
      prescription: {
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              mrn: true,
            },
          },
        },
      },
      verifier: {
        select: {
          firstName: true,
          lastName: true,
          licenseNumber: true,
        },
      },
    },
    orderBy: { dispensedAt: "desc" },
  });

  // Group by schedule
  const bySchedule: Record<string, typeof fills> = {
    II: [],
    III: [],
    IV: [],
    V: [],
  };

  fills.forEach((fill) => {
    const schedule = fill.item?.deaSchedule as string;
    if (schedule && bySchedule[schedule]) {
      bySchedule[schedule].push(fill);
    }
  });

  const scheduleStats = Object.entries(bySchedule).map(([schedule, scheduleFills]) => {
    const totalQuantity = scheduleFills.reduce(
      (sum, f) => sum + Number(f.quantity),
      0
    );

    return {
      schedule,
      count: scheduleFills.length,
      totalQuantity,
      fills: scheduleFills.map((fill) => ({
        id: fill.id,
        rxNumber: fill.prescription.rxNumber,
        drugName: fill.item?.name || "N/A",
        ndc: fill.item?.ndc,
        schedule: fill.item?.deaSchedule,
        quantity: Number(fill.quantity),
        patientName: formatPatientName(fill.prescription.patient),
        verifiedBy: formatStaffName(fill.verifier) || "N/A",
        dispensedDate: fill.dispensedAt,
      })),
    };
  });

  return scheduleStats;
}

/**
 * Get pharmacist verification log
 * Shows who verified what and when
 */
export async function getPharmacistVerificationLog(
  startDate: string,
  endDate: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const fills = await prisma.prescriptionFill.findMany({
    where: {
      verifiedAt: {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      },
    },
    include: {
      prescription: {
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              mrn: true,
            },
          },
        },
      },
      verifier: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          licenseNumber: true,
          isPharmacist: true,
        },
      },
      item: {
        select: {
          name: true,
          strength: true,
        },
      },
    },
    orderBy: { verifiedAt: "desc" },
  });

  return fills.map((fill) => {
    const filledAt = fill.filledAt || fill.createdAt;
    const verifiedAt = fill.verifiedAt || new Date();
    const verificationTimeMinutes = Math.round(
      (verifiedAt.getTime() - filledAt.getTime()) / 60000
    );

    return {
      id: fill.id,
      rxNumber: fill.prescription.rxNumber,
      patientName: formatPatientName(fill.prescription.patient),
      drugName: fill.item?.name || "N/A",
      strength: fill.item?.strength,
      quantity: Number(fill.quantity),
      verifiedBy: formatStaffName(fill.verifier) || "N/A",
      licenseNumber: fill.verifier?.licenseNumber || "N/A",
      verifiedDate: fill.verifiedAt,
      filledDate: filledAt,
      verificationTimeMinutes,
    };
  });
}

/**
 * Get compounding log with batch details
 * Shows all compounded batches, ingredients, lot numbers, and BUD dates
 */
export async function getCompoundingLog(
  startDate: string,
  endDate: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const batches = await prisma.batch.findMany({
    where: {
      compoundedAt: {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      },
    },
    include: {
      formulaVersion: {
        include: {
          formula: true,
          ingredients: {
            include: {
              item: true,
            },
          },
        },
      },
      ingredients: {
        include: {
          itemLot: true,
        },
      },
      qa: true,
    },
  });

  // Get user data for compounded_by and verified_by
  const compoundedByIds = [...new Set(batches.map((b) => b.compoundedBy))];
  const verifiedByIds = [
    ...new Set(batches.map((b) => b.verifiedBy).filter(Boolean)),
  ] as string[];

  const [compounders, verifiers] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: compoundedByIds } },
      select: { id: true, firstName: true, lastName: true, licenseNumber: true },
    }),
    prisma.user.findMany({
      where: { id: { in: verifiedByIds } },
      select: { id: true, firstName: true, lastName: true, licenseNumber: true },
    }),
  ]);

  const compounterMap = Object.fromEntries(
    compounders.map((u) => [u.id, u])
  );
  const verifierMap = Object.fromEntries(verifiers.map((u) => [u.id, u]));

  return batches.map((batch) => {
    const compounder = compounterMap[batch.compoundedBy];
    const verifier = batch.verifiedBy ? verifierMap[batch.verifiedBy] : null;

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      formulaName: batch.formulaVersion.formula.name,
      formulaCode: batch.formulaVersion.formula.formulaCode,
      dosageForm: batch.formulaVersion.formula.dosageForm,
      isSterile: batch.formulaVersion.formula.isSterile,
      quantityPrepared: Number(batch.quantityPrepared),
      unit: batch.unit,
      budDate: batch.budDate,
      status: batch.status,
      compoundedBy: formatStaffName(compounder) || "N/A",
      compoundedDate: batch.compoundedAt,
      verifiedBy: formatStaffName(verifier) || "Not yet verified",
      verifiedDate: batch.verifiedAt,
      ingredients: batch.ingredients.map((bi) => ({
        itemName: "Unknown",
        ndc: undefined,
        quantityUsed: Number(bi.quantityUsed),
        unit: bi.unit,
        lotNumber: bi.itemLot.lotNumber,
        lotExpirationDate: bi.itemLot.expirationDate,
      })),
      qaChecks: batch.qa.map((qa) => ({
        checkType: qa.checkType,
        result: qa.result,
        performedAt: qa.performedAt,
      })),
    };
  });
}

/**
 * Get summary audit statistics for the header
 */
export async function getAuditSummaryStats(
  startDate: string,
  endDate: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const dateRange = {
    gte: new Date(`${startDate}T00:00:00.000Z`),
    lte: new Date(`${endDate}T23:59:59.999Z`),
  };

  // Total Rxs dispensed in period
  const totalDispensed = await prisma.prescriptionFill.count({
    where: {
      status: "dispensed",
      dispensedAt: dateRange,
    },
  });

  // Controlled substances dispensed
  const controlledDispensed = await prisma.prescriptionFill.count({
    where: {
      item: { isControlled: true },
      dispensedAt: dateRange,
    },
  });

  // Get all fills for error rate calculation
  const allFills = await prisma.prescriptionFill.findMany({
    where: {
      dispensedAt: dateRange,
    },
    select: {
      id: true,
      metadata: true,
      verifiedAt: true,
      filledAt: true,
    },
  });

  // Calculate error rate (fills with discrepancies in metadata)
  const errorCount = allFills.filter((fill) => {
    const metadata = fill.metadata as Record<string, unknown> | null;
    return metadata && metadata.discrepancyFlagged;
  }).length;

  const errorRate =
    totalDispensed > 0 ? ((errorCount / totalDispensed) * 100).toFixed(2) : "0.00";

  // Calculate average verification time
  let totalVerificationTime = 0;
  let verifiedCount = 0;

  allFills.forEach((fill) => {
    if (fill.verifiedAt && fill.filledAt) {
      totalVerificationTime +=
        fill.verifiedAt.getTime() - fill.filledAt.getTime();
      verifiedCount += 1;
    }
  });

  const avgVerificationMinutes =
    verifiedCount > 0
      ? Math.round(totalVerificationTime / verifiedCount / 60000)
      : 0;

  return {
    totalRxsDispensed: totalDispensed,
    controlledSubstancePercentage:
      totalDispensed > 0
        ? ((controlledDispensed / totalDispensed) * 100).toFixed(1)
        : "0.0",
    errorRate: parseFloat(errorRate),
    avgVerificationTimeMinutes: avgVerificationMinutes,
  };
}
