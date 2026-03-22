"use server";

import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

export interface ReorderAlert {
  itemId: string;
  itemName: string;
  ndc?: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity?: number;
  suggestedQuantity: number;
  supplierId?: string;
  supplierName?: string;
  unitOfMeasure?: string;
  urgencyScore: number;
}

export interface PurchaseOrderData {
  itemId: string;
  quantity: number;
}

export interface ReorderHistoryItem {
  id: string;
  poNumber: string;
  supplier: string;
  status: string;
  itemCount: number;
  createdAt: Date;
  createdBy: string;
}

export interface ReorderSettings {
  autoReorderEnabled: boolean;
  leadTimeBuffer: number;
}

// ───────────────────────────────────────────
// GET REORDER ALERTS
// ───────────────────────────────────────────

export async function getReorderAlerts(): Promise<ReorderAlert[]> {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Get all items below reorder point with their lots
  const items = await prisma.item.findMany({
    where: {
      isActive: true,
      reorderPoint: { gt: 0 },
    },
    include: {
      lots: {
        where: { quantityOnHand: { gt: 0 } },
        select: { quantityOnHand: true },
      },
    },
  });

  const alerts: ReorderAlert[] = [];

  for (const item of items) {
    const currentStock = item.lots.reduce(
      (sum, lot) => sum + Number(lot.quantityOnHand),
      0
    );
    const reorderPoint = Number(item.reorderPoint || 0);

    if (currentStock <= reorderPoint) {
      const suggestedQuantity = Math.max(
        Number(item.reorderQuantity || reorderPoint * 2),
        reorderPoint - currentStock
      );

      // Calculate urgency: how far below threshold
      const urgencyScore = reorderPoint - currentStock;

      alerts.push({
        itemId: item.id,
        itemName: item.name,
        ndc: item.ndc || undefined,
        currentStock,
        reorderPoint,
        reorderQuantity: Number(item.reorderQuantity || undefined),
        suggestedQuantity,
        unitOfMeasure: item.unitOfMeasure || undefined,
        urgencyScore,
      });
    }
  }

  // Sort by urgency (most urgent first)
  alerts.sort((a, b) => b.urgencyScore - a.urgencyScore);

  return alerts;
}

// ───────────────────────────────────────────
// GENERATE PURCHASE ORDER
// ───────────────────────────────────────────

export async function generatePurchaseOrder(
  items: PurchaseOrderData[]
): Promise<string> {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  if (items.length === 0) {
    throw new Error("No items provided");
  }

  // Fetch item details including supplier
  const itemDetails = await prisma.item.findMany({
    where: {
      id: { in: items.map((i) => i.itemId) },
    },
    include: {
      lots: {
        where: { status: "available" },
        select: { supplierId: true },
        take: 1,
      },
    },
  });

  // Group items by supplier
  const itemsBySupplier: Record<string, PurchaseOrderData[]> = {};

  for (const item of itemDetails) {
    const supplierId = item.lots[0]?.supplierId;
    if (!supplierId) {
      throw new Error(
        `No supplier found for item: ${item.name}. Please set a supplier for a lot.`
      );
    }

    if (!itemsBySupplier[supplierId]) {
      itemsBySupplier[supplierId] = [];
    }
    const itemToAdd = items.find((i) => i.itemId === item.id);
    if (itemToAdd) {
      itemsBySupplier[supplierId].push(itemToAdd);
    }
  }

  // Create PO for the first supplier (all items grouped)
  const supplierIds = Object.keys(itemsBySupplier);
  if (supplierIds.length === 0) {
    throw new Error("No valid suppliers for items");
  }

  const supplierId = supplierIds[0];
  const poItems = itemsBySupplier[supplierId];

  // Generate unique PO number
  const poNumber = `PO-${Date.now()}`;

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId,
      status: "draft",
      createdBy: user.id,
      items: {
        create: poItems.map((item) => ({
          itemId: item.itemId,
          quantity: new Decimal(item.quantity),
        })),
      },
    },
    include: {
      items: true,
      supplier: true,
    },
  });

  revalidatePath("/inventory/reorder");
  return po.id;
}

// ───────────────────────────────────────────
// AUTO-GENERATE REORDERS
// ───────────────────────────────────────────

export async function autoGenerateReorders(): Promise<{
  createdOrders: number;
  itemsProcessed: number;
}> {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const alerts = await getReorderAlerts();

  if (alerts.length === 0) {
    return { createdOrders: 0, itemsProcessed: 0 };
  }

  // Group by supplier
  const itemsBySupplier: Record<string, PurchaseOrderData[]> = {};

  for (const alert of alerts) {
    // Get the supplier ID for this item
    const lot = await prisma.itemLot.findFirst({
      where: {
        itemId: alert.itemId,
        quantityOnHand: { gt: 0 },
      },
      select: { supplierId: true },
    });

    if (lot?.supplierId) {
      if (!itemsBySupplier[lot.supplierId]) {
        itemsBySupplier[lot.supplierId] = [];
      }
      itemsBySupplier[lot.supplierId].push({
        itemId: alert.itemId,
        quantity: alert.suggestedQuantity,
      });
    }
  }

  // Create a PO for each supplier
  let createdOrders = 0;

  for (const [supplierId, items] of Object.entries(itemsBySupplier)) {
    if (items.length > 0) {
      const poNumber = `PO-${Date.now()}-${supplierId.substring(0, 8)}`;

      await prisma.purchaseOrder.create({
        data: {
          poNumber,
          supplierId,
          status: "draft",
          createdBy: user.id,
          items: {
            create: items.map((item) => ({
              itemId: item.itemId,
              quantity: new Decimal(item.quantity),
            })),
          },
        },
      });

      createdOrders++;
    }
  }

  revalidatePath("/inventory/reorder");
  return { createdOrders, itemsProcessed: alerts.length };
}

// ───────────────────────────────────────────
// GET REORDER HISTORY
// ───────────────────────────────────────────

export async function getReorderHistory(
  limit = 10
): Promise<ReorderHistoryItem[]> {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      supplier: { select: { name: true } },
      creator: { select: { firstName: true, lastName: true } },
      _count: { select: { items: true } },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    poNumber: order.poNumber,
    supplier: order.supplier.name,
    status: order.status,
    itemCount: order._count.items,
    createdAt: order.createdAt,
    createdBy: `${order.creator.firstName} ${order.creator.lastName}`,
  }));
}

// ───────────────────────────────────────────
// APPROVE ORDER
// ───────────────────────────────────────────

export async function approveOrder(orderId: string): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.purchaseOrder.update({
    where: { id: orderId },
    data: {
      status: "approved",
      approvedBy: user.id,
      approvedAt: new Date(),
      estimatedArrival: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days default
      ),
    },
  });

  revalidatePath("/inventory/reorder");
}

// ───────────────────────────────────────────
// GET REORDER SETTINGS
// ───────────────────────────────────────────

export async function getReorderSettings(): Promise<ReorderSettings> {
  // In a real system, fetch from database
  // For now, return defaults
  return {
    autoReorderEnabled: false,
    leadTimeBuffer: 7,
  };
}

// ───────────────────────────────────────────
// UPDATE REORDER SETTINGS
// ───────────────────────────────────────────

export async function updateReorderSettings(
  settings: ReorderSettings
): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // In a real system, save to database
  // Placeholder for future implementation
  revalidatePath("/inventory/reorder");
}
