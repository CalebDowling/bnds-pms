"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

const DEA_SCHEDULES = ["II", "III", "IV", "V"];

export async function getControlledSubstanceLog({
  schedule,
  startDate,
  endDate,
  search,
  page = 1,
  limit = 25,
}: {
  schedule?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;
  const where: Prisma.PrescriptionFillWhereInput = {};

  where.item = {
    deaSchedule: { in: ["II", "III", "IV", "V"] },
  };

  if (schedule && DEA_SCHEDULES.includes(schedule)) {
    where.item = { deaSchedule: schedule };
  }

  if (startDate || endDate) {
    where.dispensedAt = {};
    if (startDate) {
      (where.dispensedAt as any).gte = new Date(`${startDate}T00:00:00.000-06:00`);
    }
    if (endDate) {
      (where.dispensedAt as any).lte = new Date(`${endDate}T23:59:59.999-06:00`);
    }
  }

  if (search) {
    where.OR = [
      { prescription: { patient: { lastName: { contains: search, mode: "insensitive" } } } },
      { prescription: { patient: { firstName: { contains: search, mode: "insensitive" } } } },
      { prescription: { patient: { mrn: { contains: search, mode: "insensitive" } } } },
      { item: { name: { contains: search, mode: "insensitive" } } } as any,
    ];
  }

  const [fills, total] = await Promise.all([
    prisma.prescriptionFill.findMany({
      where,
      include: {
        prescription: {
          include: {
            patient: { select: { firstName: true, lastName: true, mrn: true } },
          },
        },
        item: { select: { name: true, strength: true, deaSchedule: true } },
        verifier: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dispensedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.prescriptionFill.count({ where }),
  ]);

  return {
    fills: fills.map((fill) => {
      const metadata = fill.metadata as Record<string, unknown> | null;
      const flagged = !!(metadata && metadata.discrepancyFlagged);
      const runningBalance = 0;

      return {
        id: fill.id,
        date: fill.dispensedAt || fill.createdAt,
        rxNumber: fill.prescription.rxNumber,
        patient: `${fill.prescription.patient.lastName}, ${fill.prescription.patient.firstName}`,
        mrn: fill.prescription.patient.mrn,
        drugName: `${fill.item?.name || ""}${fill.item?.strength ? ` ${fill.item.strength}` : ""}`,
        schedule: fill.item?.deaSchedule,
        quantity: Number(fill.quantity),
        pharmacist: fill.verifier ? `${fill.verifier.firstName} ${fill.verifier.lastName}` : "—",
        runningBalance,
        flagged,
        flagNotes: metadata && metadata.discrepancyNotes ? (metadata.discrepancyNotes as string) : null,
      };
    }),
    total,
    pages: Math.ceil(total / limit),
    page,
  };
}

export async function getDEAStats(startDate?: string, endDate?: string) {
  const where: Prisma.PrescriptionFillWhereInput = {
    item: { deaSchedule: { in: ["II", "III", "IV", "V"] } },
  };

  if (startDate || endDate) {
    where.dispensedAt = {};
    if (startDate) {
      (where.dispensedAt as any).gte = new Date(`${startDate}T00:00:00.000-06:00`);
    }
    if (endDate) {
      (where.dispensedAt as any).lte = new Date(`${endDate}T23:59:59.999-06:00`);
    }
  }

  const fills = await prisma.prescriptionFill.findMany({
    where,
    select: {
      quantity: true,
      item: { select: { deaSchedule: true } },
    },
  });

  const scheduleStats = {
    II: { count: 0, quantity: 0 },
    III: { count: 0, quantity: 0 },
    IV: { count: 0, quantity: 0 },
    V: { count: 0, quantity: 0 },
  };

  fills.forEach((fill) => {
    const schedule = fill.item?.deaSchedule as keyof typeof scheduleStats;
    if (schedule && scheduleStats[schedule]) {
      scheduleStats[schedule].count += 1;
      scheduleStats[schedule].quantity += Number(fill.quantity);
    }
  });

  return {
    total: fills.length,
    scheduleII: scheduleStats.II.count,
    quantityII: scheduleStats.II.quantity,
    scheduleIII: scheduleStats.III.count,
    quantityIII: scheduleStats.III.quantity,
    scheduleIV: scheduleStats.IV.count,
    quantityIV: scheduleStats.IV.quantity,
    scheduleV: scheduleStats.V.count,
    quantityV: scheduleStats.V.quantity,
  };
}

export async function flagDiscrepancy(
  fillId: string,
  notes: string
) {
  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
  });

  if (!fill) throw new Error("Fill not found");

  const metadata = (fill.metadata as Record<string, unknown>) || {};

  await prisma.prescriptionFill.update({
    where: { id: fillId },
    data: {
      metadata: {
        ...metadata,
        discrepancyFlagged: true,
        discrepancyNotes: notes,
        discrepancyFlaggedAt: new Date().toISOString(),
      },
    },
  });

  revalidatePath("/compliance/dea-log");
  return true;
}

export async function getDiscrepancies() {
  const fills = await prisma.prescriptionFill.findMany({
    where: {
      metadata: {
        path: ["discrepancyFlagged"],
        equals: true,
      },
    },
    include: {
      prescription: {
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true } },
        },
      },
      item: { select: { name: true, strength: true, deaSchedule: true } },
      verifier: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return fills.map((fill) => {
    const metadata = fill.metadata as Record<string, unknown> | null;
    return {
      id: fill.id,
      date: fill.dispensedAt || fill.createdAt,
      rxNumber: fill.prescription.rxNumber,
      patient: `${fill.prescription.patient.lastName}, ${fill.prescription.patient.firstName}`,
      mrn: fill.prescription.patient.mrn,
      drugName: `${fill.item?.name || ""}${fill.item?.strength ? ` ${fill.item.strength}` : ""}`,
      schedule: fill.item?.deaSchedule,
      quantity: Number(fill.quantity),
      notes: metadata?.discrepancyNotes || "—",
      flaggedAt: metadata?.discrepancyFlaggedAt || fill.createdAt,
    };
  });
}

export async function getTodayDEAStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const where: Prisma.PrescriptionFillWhereInput = {
    item: { deaSchedule: { in: ["II", "III", "IV", "V"] } },
    dispensedAt: { gte: today, lt: tomorrow },
  };

  const fills = await prisma.prescriptionFill.findMany({
    where,
    select: {
      quantity: true,
      item: { select: { deaSchedule: true } },
    },
  });

  const scheduleII = fills.filter((f) => f.item?.deaSchedule === "II");
  const scheduleIIIV = fills.filter((f) =>
    ["III", "IV", "V"].includes(f.item?.deaSchedule || "")
  );

  return {
    scheduleIIQuantity: scheduleII.reduce((sum, f) => sum + Number(f.quantity), 0),
    scheduleIIIVQuantity: scheduleIIIV.reduce((sum, f) => sum + Number(f.quantity), 0),
    discrepanciesFlagged: 0,
  };
}
