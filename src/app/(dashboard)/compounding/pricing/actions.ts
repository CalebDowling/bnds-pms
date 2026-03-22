'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  lineTotal: number;
}

export async function getFormulas() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const formulas = await prisma.formula.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        formulaCode: true,
      },
      orderBy: { name: 'asc' },
    });

    return formulas;
  } catch (error) {
    console.error('Error fetching formulas:', error);
    throw error;
  }
}

export async function getFormulaIngredients(formulaId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      include: {
        versions: {
          where: {
            id: formulaId,
          },
          include: {
            ingredients: {
              include: {
                item: {
                  select: {
                    id: true,
                    name: true,
                    acquisitionCost: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!formula || formula.versions.length === 0) {
      return [];
    }

    return formula.versions[0].ingredients.map((ing) => ({
      id: ing.id,
      name: ing.item.name,
      quantity: ing.quantity,
      unit: ing.unit,
      costPerUnit: ing.item.acquisitionCost?.toNumber() || 0,
      lineTotal:
        ing.quantity.toNumber() *
        (ing.item.acquisitionCost?.toNumber() || 0),
    }));
  } catch (error) {
    console.error('Error fetching formula ingredients:', error);
    throw error;
  }
}

export async function calculatePricing(
  ingredients: Ingredient[],
  laborRate: number,
  laborMinutes: number,
  overhead: number,
  containerCost: number,
  dispensingFee: number,
  markupPercent: number,
  quantityMade: number
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    // Calculate ingredient subtotal
    const ingredientSubtotal = ingredients.reduce(
      (sum, ing) => sum + ing.lineTotal,
      0
    );

    // Calculate labor cost
    const laborCost = (laborRate / 60) * laborMinutes;

    // Calculate overhead
    const overheadCost = ingredientSubtotal * (overhead / 100);

    // Total cost
    const totalCost =
      ingredientSubtotal +
      laborCost +
      overheadCost +
      containerCost +
      dispensingFee;

    // Per-unit cost
    const perUnitCost = quantityMade > 0 ? totalCost / quantityMade : 0;

    // Suggested retail with markup
    const suggestedRetail = perUnitCost * (1 + markupPercent / 100);

    return {
      ingredientSubtotal,
      laborCost,
      overheadCost,
      containerCost,
      dispensingFee,
      totalCost,
      perUnitCost,
      suggestedRetail,
      quantityMade,
      markupPercent,
    };
  } catch (error) {
    console.error('Pricing calculation error:', error);
    throw error;
  }
}

export async function saveQuote(
  formulaId: string,
  pricingData: any
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    if (formulaId === 'custom') {
      // For custom quotes, we could store in a separate model
      // For now, just return success
      return {
        success: true,
        message: 'Custom quote noted (not persisted)',
      };
    }

    // Update formula version with pricing info
    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!formula || formula.versions.length === 0) {
      return {
        success: false,
        message: 'Formula not found',
      };
    }

    const latestVersion = formula.versions[0];

    // Update the formula version with new pricing
    await prisma.formulaVersion.update({
      where: { id: latestVersion.id },
      data: {
        baseCost: pricingData.totalCost,
        price: pricingData.suggestedRetail,
        pricingMethod: 'calculated',
      },
    });

    return {
      success: true,
      message: `Quote saved for ${formula.name}`,
    };
  } catch (error) {
    console.error('Save quote error:', error);
    throw error;
  }
}

export async function getIngredientCost(itemId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        name: true,
        acquisitionCost: true,
      },
    });

    if (!item) {
      return null;
    }

    return {
      id: item.id,
      name: item.name,
      cost: item.acquisitionCost?.toNumber() || 0,
    };
  } catch (error) {
    console.error('Error fetching ingredient cost:', error);
    throw error;
  }
}
