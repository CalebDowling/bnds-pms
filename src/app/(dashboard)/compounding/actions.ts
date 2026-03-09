"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────

export type FormulaFormData = {
  name: string;
  formulaCode: string;
  category?: string;
  dosageForm?: string;
  route?: string;
  isSterile: boolean;
  defaultBudDays?: number;
  storageConditions?: string;
};

export type FormulaIngredientData = {
  itemId: string;
  quantity: number;
  unit: string;
  isActiveIngredient: boolean;
  sortOrder: number;
};

export type FormulaStepData = {
  stepNumber: number;
  instruction: string;
  equipment?: string;
  durationMinutes?: number;
  requiresPharmacist: boolean;
};

export type BatchFormData = {
  formulaVersionId: string;
  prescriptionId?: string;
  quantityPrepared: number;
  unit: string;
  budDate: string;
  envTemp?: number;
  envHumidity?: number;
  notes?: string;
};

export type BatchIngredientData = {
  itemLotId: string;
  quantityUsed: number;
  unit: string;
};

export type BatchQaData = {
  checkType: string;
  expectedValue?: string;
  actualValue?: string;
  result: string;
  notes?: string;
};

// ═══════════════════════════════════════════════
// FORMULAS
// ═══════════════════════════════════════════════

export async function getFormulas({
  search = "",
  category = "",
  page = 1,
  limit = 25,
}: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
} = {}) {
  const skip = (page - 1) * limit;
  const where: any = { isActive: true };

  if (category && category !== "all") {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { formulaCode: { contains: search, mode: "insensitive" } },
    ];
  }

  const [formulas, total] = await Promise.all([
    prisma.formula.findMany({
      where,
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            ingredients: {
              include: { item: { select: { name: true } } },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        _count: { select: { prescriptions: true } },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.formula.count({ where }),
  ]);

  return { formulas, total, pages: Math.ceil(total / limit), page };
}

export async function getFormula(id: string) {
  return prisma.formula.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          ingredients: {
            include: { item: { select: { id: true, name: true, strength: true, unitOfMeasure: true } } },
            orderBy: { sortOrder: "asc" },
          },
          steps: { orderBy: { stepNumber: "asc" } },
          creator: { select: { firstName: true, lastName: true } },
          batches: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              compounder: { select: { firstName: true, lastName: true } },
              verifier: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
      prescriptions: {
        orderBy: { dateReceived: "desc" },
        take: 10,
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true } },
        },
      },
    },
  });
}

export async function createFormula(data: FormulaFormData) {
  const formula = await prisma.formula.create({
    data: {
      name: data.name.trim(),
      formulaCode: data.formulaCode.trim().toUpperCase(),
      category: data.category?.trim() || null,
      dosageForm: data.dosageForm?.trim() || null,
      route: data.route?.trim() || null,
      isSterile: data.isSterile,
      defaultBudDays: data.defaultBudDays || null,
      storageConditions: data.storageConditions?.trim() || null,
    },
  });

  revalidatePath("/compounding");
  return formula;
}

export async function updateFormula(id: string, data: FormulaFormData) {
  const formula = await prisma.formula.update({
    where: { id },
    data: {
      name: data.name.trim(),
      formulaCode: data.formulaCode.trim().toUpperCase(),
      category: data.category?.trim() || null,
      dosageForm: data.dosageForm?.trim() || null,
      route: data.route?.trim() || null,
      isSterile: data.isSterile,
      defaultBudDays: data.defaultBudDays || null,
      storageConditions: data.storageConditions?.trim() || null,
    },
  });

  revalidatePath("/compounding");
  revalidatePath(`/compounding/formulas/${id}`);
  return formula;
}

// ─── FORMULA VERSIONS ───────────────────────

export async function createFormulaVersion(
  formulaId: string,
  data: {
    effectiveDate: string;
    baseCost?: number;
    price?: number;
    pricingMethod?: string;
    notes?: string;
    ingredients: FormulaIngredientData[];
    steps: FormulaStepData[];
  },
  userId?: string
) {
  // Get next version number
  const lastVersion = await prisma.formulaVersion.findFirst({
    where: { formulaId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });

  const nextVersion = (lastVersion?.versionNumber || 0) + 1;

  const version = await prisma.formulaVersion.create({
    data: {
      formulaId,
      versionNumber: nextVersion,
      effectiveDate: new Date(data.effectiveDate),
      baseCost: data.baseCost || null,
      price: data.price || null,
      pricingMethod: data.pricingMethod || null,
      notes: data.notes?.trim() || null,
      createdBy: userId || null,
      ingredients: {
        create: data.ingredients.map((ing) => ({
          itemId: ing.itemId,
          quantity: ing.quantity,
          unit: ing.unit,
          isActiveIngredient: ing.isActiveIngredient,
          sortOrder: ing.sortOrder,
        })),
      },
      steps: {
        create: data.steps.map((step) => ({
          stepNumber: step.stepNumber,
          instruction: step.instruction.trim(),
          equipment: step.equipment?.trim() || null,
          durationMinutes: step.durationMinutes || null,
          requiresPharmacist: step.requiresPharmacist,
        })),
      },
    },
  });

  // Update formula's current version pointer
  await prisma.formula.update({
    where: { id: formulaId },
    data: { currentVersionId: version.id },
  });

  revalidatePath(`/compounding/formulas/${formulaId}`);
  return version;
}

// ─── SEARCH (for Rx form) ───────────────────

export async function searchFormulas(query: string) {
  if (!query || query.length < 2) return [];

  return prisma.formula.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { formulaCode: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      formulaCode: true,
      dosageForm: true,
      category: true,
    },
    take: 10,
    orderBy: { name: "asc" },
  });
}

// ═══════════════════════════════════════════════
// BATCHES
// ═══════════════════════════════════════════════

export async function getBatches({
  search = "",
  status = "",
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

  if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { batchNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where,
      include: {
        formulaVersion: {
          include: {
            formula: { select: { name: true, formulaCode: true } },
          },
        },
        compounder: { select: { firstName: true, lastName: true } },
        verifier: { select: { firstName: true, lastName: true } },
        prescription: {
          select: { rxNumber: true, patient: { select: { firstName: true, lastName: true } } },
        },
        _count: { select: { qa: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.batch.count({ where }),
  ]);

  return { batches, total, pages: Math.ceil(total / limit), page };
}

export async function getBatch(id: string) {
  return prisma.batch.findUnique({
    where: { id },
    include: {
      formulaVersion: {
        include: {
          formula: true,
          ingredients: {
            include: { item: { select: { id: true, name: true, strength: true, unitOfMeasure: true } } },
            orderBy: { sortOrder: "asc" },
          },
          steps: { orderBy: { stepNumber: "asc" } },
        },
      },
      compounder: { select: { firstName: true, lastName: true } },
      verifier: { select: { firstName: true, lastName: true } },
      prescription: {
        select: {
          rxNumber: true,
          patient: { select: { firstName: true, lastName: true, mrn: true } },
        },
      },
      ingredients: {
        include: {
          itemLot: {
            include: { item: { select: { name: true } } },
          },
          weigher: { select: { firstName: true, lastName: true } },
        },
      },
      qa: {
        include: { performer: { select: { firstName: true, lastName: true } } },
        orderBy: { performedAt: "desc" },
      },
      fills: {
        select: { id: true, fillNumber: true, status: true, quantity: true },
      },
    },
  });
}

async function generateBatchNumber(): Promise<string> {
  const today = new Date();
  const prefix = `B${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}`;

  const lastBatch = await prisma.batch.findFirst({
    where: { batchNumber: { startsWith: prefix } },
    orderBy: { batchNumber: "desc" },
    select: { batchNumber: true },
  });

  let seq = 1;
  if (lastBatch?.batchNumber) {
    const lastSeq = parseInt(lastBatch.batchNumber.slice(prefix.length + 1), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}-${seq.toString().padStart(3, "0")}`;
}

export async function createBatch(data: BatchFormData, userId: string) {
  const batchNumber = await generateBatchNumber();

  const batch = await prisma.batch.create({
    data: {
      batchNumber,
      formulaVersionId: data.formulaVersionId,
      prescriptionId: data.prescriptionId || null,
      quantityPrepared: data.quantityPrepared,
      unit: data.unit,
      budDate: new Date(data.budDate),
      status: "in_progress",
      compoundedBy: userId,
      envTemp: data.envTemp || null,
      envHumidity: data.envHumidity || null,
      notes: data.notes?.trim() || null,
    },
  });

  revalidatePath("/compounding");
  return batch;
}

export async function updateBatchStatus(
  id: string,
  status: string,
  userId: string
) {
  const updateData: any = { status };

  if (status === "completed") {
    updateData.compoundedAt = new Date();
  } else if (status === "verified") {
    updateData.verifiedBy = userId;
    updateData.verifiedAt = new Date();
  }

  const batch = await prisma.batch.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/compounding");
  revalidatePath(`/compounding/batches/${id}`);
  return batch;
}

// ─── BATCH INGREDIENTS ──────────────────────

export async function addBatchIngredient(
  batchId: string,
  data: BatchIngredientData,
  userId: string
) {
  const ingredient = await prisma.batchIngredient.create({
    data: {
      batchId,
      itemLotId: data.itemLotId,
      quantityUsed: data.quantityUsed,
      unit: data.unit,
      weighedBy: userId,
      weighedAt: new Date(),
    },
  });

  revalidatePath(`/compounding/batches/${batchId}`);
  return ingredient;
}

// ─── BATCH QA ───────────────────────────────

export async function addBatchQa(
  batchId: string,
  data: BatchQaData,
  userId: string
) {
  const qa = await prisma.batchQa.create({
    data: {
      batchId,
      checkType: data.checkType.trim(),
      expectedValue: data.expectedValue?.trim() || null,
      actualValue: data.actualValue?.trim() || null,
      result: data.result,
      performedBy: userId,
      notes: data.notes?.trim() || null,
    },
  });

  revalidatePath(`/compounding/batches/${batchId}`);
  return qa;
}

// ─── FORMULA CATEGORIES ─────────────────────

export async function getFormulaCategories() {
  const categories = await prisma.formula.findMany({
    where: { isActive: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return categories.map((c) => c.category).filter(Boolean) as string[];
}
