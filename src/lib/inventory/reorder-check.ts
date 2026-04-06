"use server";

import { Decimal } from "@prisma/client/runtime/library";

/**
 * Reorder check result for a single item
 */
export interface ReorderItemResult {
  itemId: string;
  itemName: string;
  ndc?: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  supplierId?: string;
  supplierName?: string;
  isCritical: boolean; // stock = 0
  severity: "critical" | "low"; // critical = 0, low = <= reorderPoint
}

/**
 * Summary result from reorder check
 */
export interface ReorderCheckResult {
  totalItemsProcessed: number;
  itemsNeedingReorder: ReorderItemResult[];
  criticalItems: ReorderItemResult[];
  lowStockItems: ReorderItemResult[];
  itemsBySupplier: Map<string, ReorderItemResult[]>;
  timestamp: Date;
}

/**
 * Check reorder levels for all inventory items
 * Returns items where currentStock <= reorderPoint
 * Groups by supplier for bulk ordering
 */
export async function checkReorderLevels(): Promise<ReorderCheckResult> {
  const { prisma } = await import("@/lib/prisma");
  const { createNotification } = await import("@/lib/notifications");

  const result: ReorderCheckResult = {
    totalItemsProcessed: 0,
    itemsNeedingReorder: [],
    criticalItems: [],
    lowStockItems: [],
    itemsBySupplier: new Map(),
    timestamp: new Date(),
  };

  try {
    // Get all active items with reorder points and their current stock
    // Note: `supplier` include requires `npx prisma generate` after the schema update
    // that added `supplierId` to the Item model. The `as any` cast can be removed after regeneration.
    const items = await (prisma.item.findMany as any)({
      where: {
        isActive: true,
        reorderPoint: { not: null },
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        lots: {
          where: {
            quantityOnHand: { gt: 0 },
          },
          select: {
            quantityOnHand: true,
          },
        },
        poItems: {
          where: {
            purchaseOrder: {
              status: { in: ["pending", "approved"] },
            },
          },
          select: {
            quantity: true,
          },
        },
      },
    });

    result.totalItemsProcessed = items.length;

    // Process each item
    for (const item of items as any[]) {
      try {
        // Calculate current stock from available lots
        const currentStock = item.lots.reduce(
          (sum: number, lot: any) => sum + Number(lot.quantityOnHand || 0),
          0
        );

        const reorderPoint = Number(item.reorderPoint || 0);
        const reorderQuantity = Number(item.reorderQuantity || 0);

        // Only include items at or below reorder point
        if (currentStock <= reorderPoint) {
          const isCritical = currentStock === 0;
          const severity = isCritical ? "critical" : "low";

          const reorderItem: ReorderItemResult = {
            itemId: item.id,
            itemName: item.name,
            ndc: item.ndc || undefined,
            currentStock,
            reorderPoint,
            reorderQuantity,
            supplierId: item.supplier?.id,
            supplierName: item.supplier?.name,
            isCritical,
            severity,
          };

          result.itemsNeedingReorder.push(reorderItem);

          if (isCritical) {
            result.criticalItems.push(reorderItem);
          } else {
            result.lowStockItems.push(reorderItem);
          }

          // Group by supplier for bulk ordering
          const supplierKey = item.supplier?.id || "unassigned";
          if (!result.itemsBySupplier.has(supplierKey)) {
            result.itemsBySupplier.set(supplierKey, []);
          }
          result.itemsBySupplier.get(supplierKey)!.push(reorderItem);
        }
      } catch (error) {
        console.error(`Error processing item ${item.id} for reorder check:`, error);
      }
    }

    // Create notifications for users with inventory management permissions
    if (result.itemsNeedingReorder.length > 0) {
      const users = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: {
                name: {
                  in: ["admin", "inventory_manager"],
                },
              },
            },
          },
          isActive: true,
        },
      });

      for (const user of users) {
        // Create separate notifications for critical items
        if (result.criticalItems.length > 0) {
          await createNotification(
            user.id,
            "low_stock",
            `Critical Stock Alert: ${result.criticalItems.length} items out of stock`,
            `${result.criticalItems.length} item(s) are out of stock and need immediate reordering.`,
            {
              itemsCount: result.criticalItems.length,
              severity: "critical",
              items: result.criticalItems.map((i) => ({
                itemId: i.itemId,
                itemName: i.itemName,
              })),
            }
          );
        }

        // Create notification for low stock items
        if (result.lowStockItems.length > 0) {
          await createNotification(
            user.id,
            "low_stock",
            `Low Stock Alert: ${result.lowStockItems.length} items below reorder point`,
            `${result.lowStockItems.length} item(s) have fallen below their reorder point.`,
            {
              itemsCount: result.lowStockItems.length,
              severity: "low",
              items: result.lowStockItems.map((i) => ({
                itemId: i.itemId,
                itemName: i.itemName,
                currentStock: i.currentStock,
                reorderPoint: i.reorderPoint,
              })),
            }
          );
        }
      }
    }
  } catch (error) {
    console.error("Error in checkReorderLevels:", error);
  }

  return result;
}

/**
 * Get current reorder status - lightweight query for dashboard widget
 */
export async function getReorderStatus() {
  const { prisma } = await import("@/lib/prisma");

  try {
    const items = await prisma.item.findMany({
      where: {
        isActive: true,
        reorderPoint: { not: null },
      },
      select: {
        id: true,
        name: true,
        ndc: true,
        reorderPoint: true,
        reorderQuantity: true,
        lots: {
          where: {
            quantityOnHand: { gt: 0 },
          },
          select: {
            quantityOnHand: true,
          },
        },
      },
    });

    const critical: ReorderItemResult[] = [];
    const low: ReorderItemResult[] = [];

    for (const item of items) {
      const currentStock = item.lots.reduce(
        (sum, lot) => sum + Number(lot.quantityOnHand || 0),
        0
      );
      const reorderPoint = Number(item.reorderPoint || 0);

      if (currentStock <= reorderPoint) {
        const reorderItem: ReorderItemResult = {
          itemId: item.id,
          itemName: item.name,
          ndc: item.ndc || undefined,
          currentStock,
          reorderPoint,
          reorderQuantity: Number(item.reorderQuantity || 0),
          isCritical: currentStock === 0,
          severity: currentStock === 0 ? "critical" : "low",
        };

        if (currentStock === 0) {
          critical.push(reorderItem);
        } else {
          low.push(reorderItem);
        }
      }
    }

    return {
      criticalCount: critical.length,
      lowCount: low.length,
      totalCount: critical.length + low.length,
      critical,
      low,
    };
  } catch (error) {
    console.error("Error getting reorder status:", error);
    return {
      criticalCount: 0,
      lowCount: 0,
      totalCount: 0,
      critical: [],
      low: [],
    };
  }
}
