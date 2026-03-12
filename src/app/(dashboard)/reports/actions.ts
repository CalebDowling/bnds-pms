"use server";

import { prisma } from "@/lib/prisma";

export async function getDailyFillReport(date?: string) {
  const targetDate = date || new Date().toISOString().split("T")[0];
  // Use the date string directly to avoid timezone issues
  // Target: midnight to midnight in local time (CST/CDT = UTC-5/6)
  const startOfDay = new Date(`${targetDate}T00:00:00.000-06:00`);
  const endOfDay = new Date(`${targetDate}T23:59:59.999-06:00`);

  const fills = await prisma.prescriptionFill.findMany({
    where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    include: {
      prescription: {
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true } },
          prescriber: { select: { firstName: true, lastName: true } },
          item: { select: { name: true, strength: true } },
          formula: { select: { name: true } },
        },
      },
      filler: { select: { firstName: true, lastName: true } },
      verifier: { select: { firstName: true, lastName: true } },
      itemLot: { select: { lotNumber: true } },
      batch: { select: { batchNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return fills;
}

export async function getInventoryReport() {
  const items = await prisma.item.findMany({
    where: { isActive: true },
    include: {
      lots: {
        where: { status: "available" },
        select: { quantityOnHand: true, expirationDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return items.map((item) => {
    const totalOnHand = item.lots.reduce((sum, l) => sum + Number(l.quantityOnHand), 0);
    const earliestExp = item.lots.length > 0
      ? item.lots.reduce((earliest, l) =>
          l.expirationDate < earliest ? l.expirationDate : earliest,
          item.lots[0].expirationDate
        )
      : null;
    const isLow = item.reorderPoint ? totalOnHand < Number(item.reorderPoint) : false;

    return {
      id: item.id,
      name: item.name,
      genericName: item.genericName,
      strength: item.strength,
      ndc: item.ndc,
      unitOfMeasure: item.unitOfMeasure,
      totalOnHand,
      reorderPoint: item.reorderPoint ? Number(item.reorderPoint) : null,
      lotCount: item.lots.length,
      earliestExp,
      isLow,
      isCompoundIngredient: item.isCompoundIngredient,
      isRefrigerated: item.isRefrigerated,
      isControlled: item.isControlled,
    };
  });
}

export async function getBatchReport(startDate?: string, endDate?: string) {
  const where: any = {};
  if (startDate) {
    where.createdAt = { ...(where.createdAt || {}), gte: new Date(`${startDate}T00:00:00.000-06:00`) };
  }
  if (endDate) {
    where.createdAt = { ...(where.createdAt || {}), lte: new Date(`${endDate}T23:59:59.999-06:00`) };
  }

  return prisma.batch.findMany({
    where,
    include: {
      formulaVersion: {
        include: { formula: { select: { name: true, formulaCode: true } } },
      },
      compounder: { select: { firstName: true, lastName: true } },
      verifier: { select: { firstName: true, lastName: true } },
      _count: { select: { qa: true, fills: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
