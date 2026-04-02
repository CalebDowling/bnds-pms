"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  searchCatalog as cardinalSearchCatalog,
  createOrder as cardinalCreateOrder,
  getOrderStatus as cardinalGetOrderStatus,
  checkAvailability as cardinalCheckAvailability,
  type CatalogItem,
} from "@/lib/integrations/cardinal-health";

// ─── Types ──────────────────────────────────────

export interface PurchaseOrderLineItem {
  ndc: string;
  productName: string;
  manufacturer: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  extendedPrice: number;
  strength?: string;
  dosageForm?: string;
  packageSize?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  cardinalOrderId?: string;
  status: "draft" | "submitted" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "error";
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  lineItems: PurchaseOrderLineItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  totalCost: number;
  trackingNumber?: string;
  trackingCarrier?: string;
  notes?: string;
  createdBy?: string;
  errorMessage?: string;
}

interface PurchaseOrdersStore {
  orders: PurchaseOrder[];
  lastSync?: string;
}

// ─── Storage Helpers ────────────────────────────

const SETTING_KEY = "purchase_orders";

async function getStoreId(): Promise<string> {
  const store = await prisma.store.findFirst();
  if (!store) throw new Error("No store configured");
  return store.id;
}

async function loadOrders(): Promise<PurchaseOrdersStore> {
  try {
    const storeId = await getStoreId();
    const setting = await prisma.storeSetting.findUnique({
      where: { storeId_settingKey: { storeId, settingKey: SETTING_KEY } },
    });

    if (setting?.settingValue) {
      const parsed = JSON.parse(setting.settingValue);
      return parsed as PurchaseOrdersStore;
    }
  } catch (error) {
    console.error("Failed to load purchase orders:", error);
  }

  return { orders: [] };
}

async function saveOrders(data: PurchaseOrdersStore): Promise<void> {
  const storeId = await getStoreId();
  const serialized = JSON.stringify(data);

  await prisma.storeSetting.upsert({
    where: { storeId_settingKey: { storeId, settingKey: SETTING_KEY } },
    create: {
      storeId,
      settingKey: SETTING_KEY,
      settingValue: serialized,
      settingType: "json",
    },
    update: {
      settingValue: serialized,
      updatedAt: new Date(),
    },
  });
}

// ─── Server Actions ─────────────────────────────

/**
 * List all purchase orders, most recent first.
 */
export async function getOrders(): Promise<PurchaseOrder[]> {
  const store = await loadOrders();
  return store.orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get a single purchase order by ID.
 */
export async function getOrderDetail(orderId: string): Promise<PurchaseOrder | null> {
  const store = await loadOrders();
  const order = store.orders.find((o) => o.id === orderId);

  if (!order) return null;

  // If order has a Cardinal order ID, try to refresh status
  if (order.cardinalOrderId && !["delivered", "cancelled", "error"].includes(order.status)) {
    try {
      const remoteStatus = await cardinalGetOrderStatus(order.cardinalOrderId);
      if (remoteStatus.status !== order.status) {
        order.status = remoteStatus.status;
        order.updatedAt = remoteStatus.updatedAt || new Date().toISOString();
        if (remoteStatus.tracking) {
          order.trackingNumber = remoteStatus.tracking.trackingNumber;
          order.trackingCarrier = remoteStatus.tracking.carrier;
        }
        // Save updated status
        await saveOrders(await loadOrders().then((s) => {
          const idx = s.orders.findIndex((o) => o.id === orderId);
          if (idx >= 0) s.orders[idx] = order;
          return s;
        }));
      }
    } catch {
      // Remote status check is best-effort
    }
  }

  return order;
}

/**
 * Create a new purchase order and submit it to Cardinal Health.
 */
export async function createOrder(
  items: Array<{
    ndc: string;
    productName: string;
    manufacturer: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    strength?: string;
    dosageForm?: string;
    packageSize?: string;
  }>,
  options?: { notes?: string; rushDelivery?: boolean }
): Promise<PurchaseOrder> {
  const store = await loadOrders();

  const lineItems: PurchaseOrderLineItem[] = items.map((item) => ({
    ndc: item.ndc,
    productName: item.productName,
    manufacturer: item.manufacturer,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    extendedPrice: Math.round(item.unitPrice * item.quantity * 100) / 100,
    strength: item.strength,
    dosageForm: item.dosageForm,
    packageSize: item.packageSize,
  }));

  const subtotal = lineItems.reduce((sum, li) => sum + li.extendedPrice, 0);
  const tax = 0; // Wholesale pharma is typically tax-exempt
  const shippingCost = 0; // Included in Cardinal account terms

  const orderId = `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const poNumber = `BNDS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(store.orders.length + 1).padStart(4, "0")}`;

  const order: PurchaseOrder = {
    id: orderId,
    poNumber,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lineItems,
    subtotal: Math.round(subtotal * 100) / 100,
    tax,
    shippingCost,
    totalCost: Math.round((subtotal + tax + shippingCost) * 100) / 100,
    notes: options?.notes,
  };

  // Attempt to submit to Cardinal Health
  try {
    const cardinalResult = await cardinalCreateOrder({
      lineItems: items.map((item) => ({
        ndc: item.ndc,
        quantity: item.quantity,
        unit: item.unit,
      })),
      poNumber,
      notes: options?.notes,
      rushDelivery: options?.rushDelivery,
    });

    order.cardinalOrderId = cardinalResult.orderId;
    order.status = "submitted";
    order.submittedAt = new Date().toISOString();

    // Update pricing from Cardinal response if available
    if (cardinalResult.totalCost) {
      order.totalCost = cardinalResult.totalCost;
      order.subtotal = cardinalResult.subtotal || order.subtotal;
      order.tax = cardinalResult.tax || 0;
      order.shippingCost = cardinalResult.shippingCost || 0;
    }
  } catch (error) {
    console.error("Failed to submit order to Cardinal Health:", error);
    order.status = "error";
    order.errorMessage =
      error instanceof Error ? error.message : "Failed to submit to Cardinal Health";
  }

  store.orders.push(order);
  await saveOrders(store);
  revalidatePath("/inventory/orders");

  return order;
}

/**
 * Search the Cardinal Health catalog by NDC or product name.
 */
export async function searchCardinalCatalog(
  query: string
): Promise<CatalogItem[]> {
  if (!query || query.trim().length < 2) return [];

  const result = await cardinalSearchCatalog(query.trim(), { limit: 20 });
  return result.items;
}

/**
 * Check availability and pricing for specific NDCs.
 */
export async function checkItemAvailability(ndcs: string[]) {
  return cardinalCheckAvailability(ndcs);
}

/**
 * Retry a failed order submission.
 */
export async function retryOrder(orderId: string): Promise<PurchaseOrder> {
  const store = await loadOrders();
  const idx = store.orders.findIndex((o) => o.id === orderId);

  if (idx < 0) throw new Error("Order not found");

  const order = store.orders[idx];
  if (order.status !== "error") throw new Error("Only failed orders can be retried");

  try {
    const cardinalResult = await cardinalCreateOrder({
      lineItems: order.lineItems.map((li) => ({
        ndc: li.ndc,
        quantity: li.quantity,
        unit: li.unit,
      })),
      poNumber: order.poNumber,
      notes: order.notes,
    });

    order.cardinalOrderId = cardinalResult.orderId;
    order.status = "submitted";
    order.submittedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    order.errorMessage = undefined;
  } catch (error) {
    order.errorMessage =
      error instanceof Error ? error.message : "Retry failed";
    order.updatedAt = new Date().toISOString();
  }

  store.orders[idx] = order;
  await saveOrders(store);
  revalidatePath("/inventory/orders");

  return order;
}

/**
 * Cancel a draft or submitted order.
 */
export async function cancelOrder(orderId: string): Promise<PurchaseOrder> {
  const store = await loadOrders();
  const idx = store.orders.findIndex((o) => o.id === orderId);

  if (idx < 0) throw new Error("Order not found");

  const order = store.orders[idx];
  if (!["draft", "submitted", "error"].includes(order.status)) {
    throw new Error("Order cannot be cancelled in its current state");
  }

  order.status = "cancelled";
  order.updatedAt = new Date().toISOString();

  store.orders[idx] = order;
  await saveOrders(store);
  revalidatePath("/inventory/orders");

  return order;
}
