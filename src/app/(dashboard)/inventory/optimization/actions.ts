"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  analyzeAllItems,
  analyzeItem,
  type OptimizationResult,
  type ItemAnalysis,
} from "@/lib/inventory/optimization-engine";

// ---------------------------------------------------------------------------
// getOptimizationDashboard
// ---------------------------------------------------------------------------

export async function getOptimizationDashboard(): Promise<OptimizationResult> {
  await requireUser();
  return analyzeAllItems(90, true);
}

// ---------------------------------------------------------------------------
// getItemAnalysis
// ---------------------------------------------------------------------------

export async function getItemAnalysis(itemId: string): Promise<ItemAnalysis> {
  await requireUser();

  if (!itemId) {
    throw new Error("Item ID is required");
  }

  return analyzeItem(itemId);
}

// ---------------------------------------------------------------------------
// applyRecommendation
// ---------------------------------------------------------------------------

export async function applyRecommendation(
  itemId: string,
  newReorderPoint: number,
  newReorderQty: number,
): Promise<{ success: boolean; message: string }> {
  const user = await requireUser();

  if (!itemId) {
    throw new Error("Item ID is required");
  }
  if (newReorderPoint < 0 || newReorderQty < 0) {
    throw new Error("Reorder point and quantity must be non-negative");
  }

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, name: true, reorderPoint: true, reorderQuantity: true },
  });

  if (!item) {
    throw new Error("Item not found");
  }

  await prisma.item.update({
    where: { id: itemId },
    data: {
      reorderPoint: newReorderPoint,
      reorderQuantity: newReorderQty,
    },
  });

  return {
    success: true,
    message: `Updated ${item.name}: reorder point = ${newReorderPoint}, reorder qty = ${newReorderQty}`,
  };
}
