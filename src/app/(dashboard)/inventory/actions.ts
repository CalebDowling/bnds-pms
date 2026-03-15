"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────

export type ItemFormData = {
  ndc?: string;
  name: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  route?: string;
  manufacturer?: string;
  unitOfMeasure?: string;
  packageSize?: string;
  awp?: number;
  acquisitionCost?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  deaSchedule?: string;
  isCompoundIngredient: boolean;
  isRefrigerated: boolean;
  isControlled: boolean;
  isOtc: boolean;
};

export type LotFormData = {
  itemId: string;
  lotNumber: string;
  expirationDate: string;
  quantityReceived: number;
  quantityOnHand: number;
  unit: string;
  unitCost?: number;
  dateReceived: string;
};

// ═══════════════════════════════════════════════
// ITEMS
// ═══════════════════════════════════════════════

export async function getItems({
  search = "",
  category = "all",
  page = 1,
  limit = 25,
}: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;
  const where: Prisma.ItemWhereInput = { isActive: true };

  if (category && category !== "all") {
    if (category === "compound_ingredient") {
      where.isCompoundIngredient = true;
    } else if (category === "refrigerated") {
      where.isRefrigerated = true;
    } else if (category === "controlled") {
      where.isControlled = true;
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { genericName: { contains: search, mode: "insensitive" } },
      { ndc: { contains: search, mode: "insensitive" } },
      { manufacturer: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      include: {
        lots: {
          where: { quantityOnHand: { gt: 0 } },
          select: { id: true, quantityOnHand: true, expirationDate: true },
        },
        _count: { select: { lots: true } },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.item.count({ where }),
  ]);

  const enrichedItems = items.map((item) => {
    const totalOnHand = item.lots.reduce((sum, lot) => sum + Number(lot.quantityOnHand), 0);
    const earliestExpiry = item.lots.length > 0
      ? item.lots.reduce((earliest, lot) =>
          lot.expirationDate && (!earliest || lot.expirationDate < earliest) ? lot.expirationDate : earliest,
        null as Date | null)
      : null;
    const isLow = item.reorderPoint ? totalOnHand <= Number(item.reorderPoint) : false;

    return { ...item, totalOnHand, earliestExpiry, isLow };
  });

  return { items: enrichedItems, total, pages: Math.ceil(total / limit), page };
}

export async function getItem(id: string) {
  return prisma.item.findUnique({
    where: { id },
    include: {
      lots: {
        orderBy: { expirationDate: "asc" },
        include: {
          batchIngredients: { select: { id: true } },
        },
      },
      formulaIngredients: {
        include: {
          formulaVersion: {
            include: { formula: { select: { id: true, name: true, formulaCode: true } } },
          },
        },
      },
      prescriptions: {
        orderBy: { dateReceived: "desc" },
        take: 15,
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true } },
        },
      },
    },
  });
}

export async function createItem(data: ItemFormData) {
  const item = await prisma.item.create({
    data: {
      ndc: data.ndc?.trim() || null,
      name: data.name.trim(),
      genericName: data.genericName?.trim() || null,
      brandName: data.brandName?.trim() || null,
      strength: data.strength?.trim() || null,
      dosageForm: data.dosageForm?.trim() || null,
      route: data.route?.trim() || null,
      manufacturer: data.manufacturer?.trim() || null,
      unitOfMeasure: data.unitOfMeasure?.trim() || null,
      packageSize: data.packageSize?.trim() || null,
      awp: data.awp || null,
      acquisitionCost: data.acquisitionCost || null,
      reorderPoint: data.reorderPoint || null,
      reorderQuantity: data.reorderQuantity || null,
      deaSchedule: data.deaSchedule || null,
      isCompoundIngredient: data.isCompoundIngredient,
      isRefrigerated: data.isRefrigerated,
      isControlled: data.isControlled,
      isOtc: data.isOtc,
    },
  });

  revalidatePath("/inventory");
  return item;
}

export async function updateItem(id: string, data: ItemFormData) {
  const item = await prisma.item.update({
    where: { id },
    data: {
      ndc: data.ndc?.trim() || null,
      name: data.name.trim(),
      genericName: data.genericName?.trim() || null,
      brandName: data.brandName?.trim() || null,
      strength: data.strength?.trim() || null,
      dosageForm: data.dosageForm?.trim() || null,
      route: data.route?.trim() || null,
      manufacturer: data.manufacturer?.trim() || null,
      unitOfMeasure: data.unitOfMeasure?.trim() || null,
      packageSize: data.packageSize?.trim() || null,
      awp: data.awp || null,
      acquisitionCost: data.acquisitionCost || null,
      reorderPoint: data.reorderPoint || null,
      reorderQuantity: data.reorderQuantity || null,
      deaSchedule: data.deaSchedule || null,
      isCompoundIngredient: data.isCompoundIngredient,
      isRefrigerated: data.isRefrigerated,
      isControlled: data.isControlled,
      isOtc: data.isOtc,
    },
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  return item;
}

// ─── SEARCH (for forms) ─────────────────────

export async function searchItems(query: string, compoundOnly = false) {
  if (!query || query.length < 2) return [];

  const where: Prisma.ItemWhereInput = {
    isActive: true,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { genericName: { contains: query, mode: "insensitive" } },
      { ndc: { contains: query, mode: "insensitive" } },
    ],
  };

  if (compoundOnly) {
    where.isCompoundIngredient = true;
  }

  return prisma.item.findMany({
    where,
    select: {
      id: true,
      name: true,
      genericName: true,
      ndc: true,
      strength: true,
      manufacturer: true,
      unitOfMeasure: true,
    },
    take: 10,
    orderBy: { name: "asc" },
  });
}

// ═══════════════════════════════════════════════
// LOTS
// ═══════════════════════════════════════════════

export async function addLot(data: LotFormData) {
  const lot = await prisma.itemLot.create({
    data: {
      itemId: data.itemId,
      lotNumber: data.lotNumber.trim(),
      expirationDate: new Date(data.expirationDate),
      quantityReceived: data.quantityReceived,
      quantityOnHand: data.quantityOnHand,
      unit: data.unit.trim(),
      unitCost: data.unitCost || null,
      dateReceived: new Date(data.dateReceived),
    },
  });

  revalidatePath(`/inventory/${data.itemId}`);
  revalidatePath("/inventory");
  return lot;
}

export async function adjustLotQuantity(
  lotId: string,
  newQuantity: number,
  itemId: string
) {
  const lot = await prisma.itemLot.update({
    where: { id: lotId },
    data: { quantityOnHand: newQuantity },
  });

  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/inventory");
  return lot;
}

// ─── STATS ──────────────────────────────────

export async function getInventoryStats() {
  const [totalItems, totalLots, expiringSoon, lowStockItems] = await Promise.all([
    prisma.item.count({ where: { isActive: true } }),
    prisma.itemLot.count({ where: { quantityOnHand: { gt: 0 } } }),
    prisma.itemLot.count({
      where: {
        quantityOnHand: { gt: 0 },
        expirationDate: {
          lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
    }),
    prisma.item.count({ where: { isActive: true, reorderPoint: { gt: 0 } } }),
  ]);

  return { totalItems, totalLots, expiringSoon, lowStockItems };
}
