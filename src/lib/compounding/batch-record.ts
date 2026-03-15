import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Calculate Beyond-Use Date (BUD) based on USP <795> guidelines
 * - Water-containing: 14 days (refrigerated)
 * - Non-aqueous: 180 days or earliest ingredient expiry (whichever is sooner)
 * - Solid: 180 days or 25% of earliest ingredient expiry
 */
function calculateBUD(
  createdAt: Date,
  dosageForm: string | null | undefined,
  ingredientExpiries: Date[]
): Date {
  const baseDate = new Date(createdAt);
  const dosageFormLower = (dosageForm || "").toLowerCase();

  // Determine if water-containing (assumption: liquids, suspensions, solutions)
  const isWaterContaining =
    dosageFormLower.includes("suspension") ||
    dosageFormLower.includes("solution") ||
    dosageFormLower.includes("syrup") ||
    dosageFormLower.includes("lotion") ||
    dosageFormLower.includes("cream") ||
    dosageFormLower.includes("ointment");

  if (isWaterContaining) {
    // Water-containing: 14 days
    baseDate.setDate(baseDate.getDate() + 14);
    return baseDate;
  }

  // For non-aqueous and solids, check ingredient expiries
  if (ingredientExpiries.length > 0) {
    const earliestExpiry = new Date(
      Math.min(...ingredientExpiries.map((d) => d.getTime()))
    );

    // Non-aqueous: 180 days or earliest expiry
    if (!dosageFormLower.includes("powder") && !dosageFormLower.includes("capsule")) {
      const nonAqueousBUD = new Date(baseDate);
      nonAqueousBUD.setDate(nonAqueousBUD.getDate() + 180);

      if (earliestExpiry < nonAqueousBUD) {
        return earliestExpiry;
      }
      return nonAqueousBUD;
    }

    // Solid: 180 days or 25% of earliest ingredient expiry
    const solidBUD = new Date(baseDate);
    solidBUD.setDate(solidBUD.getDate() + 180);

    const daysUntilExpiry = Math.floor(
      (earliestExpiry.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const twentyFivePercent = Math.floor(daysUntilExpiry * 0.25);
    const percentBUD = new Date(baseDate);
    percentBUD.setDate(percentBUD.getDate() + twentyFivePercent);

    if (percentBUD < solidBUD) {
      return percentBUD;
    }
    return solidBUD;
  }

  // Default: 180 days
  baseDate.setDate(baseDate.getDate() + 180);
  return baseDate;
}

export interface BatchRecordData {
  id: string;
  batchNumber: string;
  formulaName: string;
  formulaCode: string;
  dosageForm: string | null;
  route: string | null;
  category: string | null;
  storageConditions: string | null;
  quantityPrepared: number;
  unit: string;
  budDate: Date;
  calculatedBudDate: Date;
  status: string;
  compoundedBy: {
    id: string;
    firstName: string;
    lastName: string;
    licenseNumber: string | null;
  };
  verifiedBy: {
    id: string;
    firstName: string;
    lastName: string;
    licenseNumber: string | null;
  } | null;
  compoundedAt: Date | null;
  verifiedAt: Date | null;
  createdAt: Date;
  notes: string | null;
  ingredients: {
    id: string;
    itemName: string;
    itemId: string;
    quantityRequired: number;
    unit: string;
    quantityUsed: number | null;
    lotNumber: string | null;
    manufacturer: string | null;
    ndc: string | null;
    expiryDate: Date | null;
    weighedBy: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    weighedAt: Date | null;
    scaleReading: number | null;
    isActiveIngredient: boolean;
  }[];
  steps: {
    stepNumber: number;
    instruction: string;
    equipment: string | null;
    durationMinutes: number | null;
    requiresPharmacist: boolean;
  }[];
  qaChecks: {
    id: string;
    checkType: string;
    expectedValue: string | null;
    actualValue: string | null;
    result: string;
    performedBy: {
      id: string;
      firstName: string;
      lastName: string;
    };
    performedAt: Date;
    notes: string | null;
  }[];
  environmentConditions: {
    temperature: number | null;
    humidity: number | null;
  };
}

export async function buildBatchRecord(
  batchId: string
): Promise<BatchRecordData | null> {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      formulaVersion: {
        include: {
          formula: true,
          ingredients: {
            include: {
              item: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
          steps: {
            orderBy: {
              stepNumber: "asc",
            },
          },
        },
      },
      compounder: true,
      verifier: true,
      ingredients: {
        include: {
          itemLot: {
            include: {
              item: true,
              supplier: true,
            },
          },
          weigher: true,
        },
      },
      qa: {
        include: {
          performer: true,
        },
        orderBy: {
          performedAt: "asc",
        },
      },
    },
  });

  if (!batch) {
    return null;
  }

  // Collect ingredient expiry dates for BUD calculation
  const ingredientExpiries = batch.ingredients
    .map((bi) => bi.itemLot?.expirationDate)
    .filter((d) => d !== null && d !== undefined) as Date[];

  // Calculate BUD
  const calculatedBudDate = calculateBUD(
    batch.createdAt,
    batch.formulaVersion.formula.dosageForm,
    ingredientExpiries
  );

  // Build ingredients array
  const ingredients = batch.formulaVersion.ingredients.map((fi) => {
    // Find corresponding batch ingredient
    const batchIng = batch.ingredients.find(
      (bi) => bi.itemLot?.itemId === fi.itemId
    );

    return {
      id: fi.id,
      itemName: fi.item.name,
      itemId: fi.itemId,
      quantityRequired: Number(fi.quantity),
      unit: fi.unit,
      quantityUsed: batchIng ? Number(batchIng.quantityUsed) : null,
      lotNumber: batchIng?.itemLot?.lotNumber || null,
      manufacturer: batchIng?.itemLot?.supplier?.name || null,
      ndc: null, // Could be added to Item model if needed
      expiryDate: batchIng?.itemLot?.expirationDate || null,
      weighedBy: batchIng?.weigher
        ? {
            id: batchIng.weigher.id,
            firstName: batchIng.weigher.firstName,
            lastName: batchIng.weigher.lastName,
          }
        : null,
      weighedAt: batchIng?.weighedAt || null,
      scaleReading: batchIng?.scaleReading ? Number(batchIng.scaleReading) : null,
      isActiveIngredient: fi.isActiveIngredient,
    };
  });

  return {
    id: batch.id,
    batchNumber: batch.batchNumber,
    formulaName: batch.formulaVersion.formula.name,
    formulaCode: batch.formulaVersion.formula.formulaCode,
    dosageForm: batch.formulaVersion.formula.dosageForm,
    route: batch.formulaVersion.formula.route,
    category: batch.formulaVersion.formula.category,
    storageConditions: batch.formulaVersion.formula.storageConditions,
    quantityPrepared: Number(batch.quantityPrepared),
    unit: batch.unit,
    budDate: new Date(batch.budDate),
    calculatedBudDate,
    status: batch.status,
    compoundedBy: {
      id: batch.compounder.id,
      firstName: batch.compounder.firstName,
      lastName: batch.compounder.lastName,
      licenseNumber: batch.compounder.licenseNumber,
    },
    verifiedBy: batch.verifier
      ? {
          id: batch.verifier.id,
          firstName: batch.verifier.firstName,
          lastName: batch.verifier.lastName,
          licenseNumber: batch.verifier.licenseNumber,
        }
      : null,
    compoundedAt: batch.compoundedAt,
    verifiedAt: batch.verifiedAt,
    createdAt: batch.createdAt,
    notes: batch.notes,
    ingredients,
    steps: batch.formulaVersion.steps.map((step) => ({
      stepNumber: step.stepNumber,
      instruction: step.instruction,
      equipment: step.equipment,
      durationMinutes: step.durationMinutes,
      requiresPharmacist: step.requiresPharmacist,
    })),
    qaChecks: batch.qa.map((qa) => ({
      id: qa.id,
      checkType: qa.checkType,
      expectedValue: qa.expectedValue,
      actualValue: qa.actualValue,
      result: qa.result,
      performedBy: {
        id: qa.performer.id,
        firstName: qa.performer.firstName,
        lastName: qa.performer.lastName,
      },
      performedAt: qa.performedAt,
      notes: qa.notes,
    })),
    environmentConditions: {
      temperature: batch.envTemp ? Number(batch.envTemp) : null,
      humidity: batch.envHumidity ? Number(batch.envHumidity) : null,
    },
  };
}
