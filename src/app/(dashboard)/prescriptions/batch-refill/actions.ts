"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type RefillCandidate = {
  id: string;
  rxNumber: string;
  patientName: string;
  patientId: string;
  drugName: string;
  strength: string | null;
  directions: string | null;
  lastFillDate: string | null;
  daysSinceLastFill: number | null;
  daysSupply: number | null;
  refillsRemaining: number;
  refillsAuthorized: number;
  prescriberName: string;
  isOverdue: boolean;
  isDueSoon: boolean;
};

export type BatchRefillResult = {
  prescriptionId: string;
  rxNumber: string;
  patientName: string;
  success: boolean;
  error?: string;
  fillNumber?: number;
};

/**
 * Get prescriptions eligible for refill.
 * Eligible = refillsRemaining > 0, not expired, active status.
 */
export async function getRefillCandidates({
  search = "",
  filter = "all", // all | overdue | due_soon
  sortBy = "overdue_first",
}: {
  search?: string;
  filter?: string;
  sortBy?: string;
} = {}): Promise<RefillCandidate[]> {
  await requireUser();

  const now = new Date();

  const prescriptions = await prisma.prescription.findMany({
    where: {
      refillsRemaining: { gt: 0 },
      status: { in: ["active", "on_hold", "ready", "verified", "dispensed"] },
      expirationDate: { gt: now },
      ...(search
        ? {
            OR: [
              { rxNumber: { contains: search, mode: "insensitive" } },
              { patient: { lastName: { contains: search, mode: "insensitive" } } },
              { patient: { firstName: { contains: search, mode: "insensitive" } } },
              { patient: { mrn: { contains: search, mode: "insensitive" } } },
              { item: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
      prescriber: {
        select: { firstName: true, lastName: true, suffix: true },
      },
      item: {
        select: { name: true, strength: true },
      },
      formula: {
        select: { name: true },
      },
      fills: {
        orderBy: { fillNumber: "desc" },
        take: 1,
        select: { filledAt: true, fillNumber: true },
      },
    },
    orderBy: { dateFilled: "asc" },
  });

  const candidates: RefillCandidate[] = prescriptions.map((rx) => {
    const lastFill = rx.fills[0];
    const lastFillDate = lastFill?.filledAt || rx.dateFilled;
    const daysSinceLastFill = lastFillDate
      ? Math.floor((now.getTime() - new Date(lastFillDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const isOverdue =
      daysSinceLastFill !== null && rx.daysSupply
        ? daysSinceLastFill > rx.daysSupply
        : false;

    const isDueSoon =
      daysSinceLastFill !== null && rx.daysSupply
        ? daysSinceLastFill >= rx.daysSupply - 7 && !isOverdue
        : false;

    return {
      id: rx.id,
      rxNumber: rx.rxNumber,
      patientName: `${rx.patient.lastName}, ${rx.patient.firstName}`,
      patientId: rx.patient.id,
      drugName: rx.item?.name || rx.formula?.name || "Compound",
      strength: rx.item?.strength || null,
      directions: rx.directions || null,
      lastFillDate: lastFillDate?.toISOString() || null,
      daysSinceLastFill,
      daysSupply: rx.daysSupply,
      refillsRemaining: rx.refillsRemaining,
      refillsAuthorized: rx.refillsAuthorized,
      prescriberName: rx.prescriber
        ? `Dr. ${rx.prescriber.lastName}${rx.prescriber.suffix ? `, ${rx.prescriber.suffix}` : ""}`
        : "Unknown",
      isOverdue,
      isDueSoon,
    };
  });

  // Apply filters
  let filtered = candidates;
  if (filter === "overdue") {
    filtered = candidates.filter((c) => c.isOverdue);
  } else if (filter === "due_soon") {
    filtered = candidates.filter((c) => c.isDueSoon || c.isOverdue);
  }

  // Sort
  if (sortBy === "overdue_first") {
    filtered.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isDueSoon && !b.isDueSoon) return -1;
      if (!a.isDueSoon && b.isDueSoon) return 1;
      return (b.daysSinceLastFill || 0) - (a.daysSinceLastFill || 0);
    });
  } else if (sortBy === "patient") {
    filtered.sort((a, b) => a.patientName.localeCompare(b.patientName));
  } else if (sortBy === "drug") {
    filtered.sort((a, b) => a.drugName.localeCompare(b.drugName));
  }

  return filtered;
}

/**
 * Process batch refills — creates pending fills for multiple prescriptions at once.
 */
export async function processBatchRefills(
  prescriptionIds: string[]
): Promise<BatchRefillResult[]> {
  const user = await requireUser();
  const results: BatchRefillResult[] = [];

  for (const prescriptionId of prescriptionIds) {
    try {
      const rx = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          fills: {
            orderBy: { fillNumber: "desc" },
            take: 1,
            select: { fillNumber: true },
          },
        },
      });

      if (!rx) {
        results.push({
          prescriptionId,
          rxNumber: "?",
          patientName: "Unknown",
          success: false,
          error: "Prescription not found",
        });
        continue;
      }

      const patientName = `${rx.patient.lastName}, ${rx.patient.firstName}`;

      if (rx.refillsRemaining <= 0) {
        results.push({
          prescriptionId,
          rxNumber: rx.rxNumber,
          patientName,
          success: false,
          error: "No refills remaining",
        });
        continue;
      }

      if (rx.expirationDate && new Date(rx.expirationDate) < new Date()) {
        results.push({
          prescriptionId,
          rxNumber: rx.rxNumber,
          patientName,
          success: false,
          error: "Prescription expired",
        });
        continue;
      }

      const nextFillNumber = (rx.fills[0]?.fillNumber || 0) + 1;

      await prisma.$transaction([
        prisma.prescriptionFill.create({
          data: {
            prescriptionId,
            fillNumber: nextFillNumber,
            quantity: rx.quantityPrescribed || 0,
            daysSupply: rx.daysSupply,
            status: "pending",
          },
        }),
        prisma.prescription.update({
          where: { id: prescriptionId },
          data: {
            refillsRemaining: { decrement: 1 },
            status: "intake",
          },
        }),
      ]);

      results.push({
        prescriptionId,
        rxNumber: rx.rxNumber,
        patientName,
        success: true,
        fillNumber: nextFillNumber,
      });
    } catch (err) {
      const rx = await prisma.prescription
        .findUnique({
          where: { id: prescriptionId },
          select: { rxNumber: true, patient: { select: { firstName: true, lastName: true } } },
        })
        .catch(() => null);

      results.push({
        prescriptionId,
        rxNumber: rx?.rxNumber || "?",
        patientName: rx ? `${rx.patient.lastName}, ${rx.patient.firstName}` : "Unknown",
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  revalidatePath("/prescriptions");
  revalidatePath("/queue");
  revalidatePath("/refills");

  return results;
}
