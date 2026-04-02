/**
 * Cardinal Health Order Express API Integration
 * Handles catalog search, purchase order creation, order status, and delivery tracking
 * Uses native fetch - no external packages
 */

import { logger } from "@/lib/logger";

// ─── Environment Variables ────────────────────────────────
const CARDINAL_API_KEY = process.env.CARDINAL_API_KEY;
const CARDINAL_ACCOUNT_NUMBER = process.env.CARDINAL_ACCOUNT_NUMBER;
const CARDINAL_API_URL =
  process.env.CARDINAL_API_URL || "https://api.cardinalhealth.com/orderexpress/v1";

// ─── Type Definitions ─────────────────────────────────────

export interface CardinalLineItem {
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
  available: boolean;
  estimatedDelivery?: string;
}

export interface CardinalOrder {
  orderId: string;
  poNumber: string;
  accountNumber: string;
  status: "draft" | "submitted" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  lineItems: CardinalLineItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  totalCost: number;
  tracking?: TrackingInfo;
  notes?: string;
}

export interface CatalogItem {
  ndc: string;
  productName: string;
  genericName: string;
  brandName?: string;
  manufacturer: string;
  strength: string;
  dosageForm: string;
  packageSize: string;
  unitPrice: number;
  contractPrice?: number;
  available: boolean;
  quantityAvailable: number;
  unit: string;
  deaSchedule?: string;
  awp?: number;
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: "in-transit" | "out-for-delivery" | "delivered" | "pending" | "exception";
  estimatedDelivery?: string;
  lastUpdate: string;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  timestamp: string;
  location: string;
  description: string;
  status: string;
}

export interface AvailabilityResult {
  ndc: string;
  productName: string;
  available: boolean;
  quantityAvailable: number;
  unitPrice: number;
  contractPrice?: number;
  estimatedDelivery?: string;
  alternatives?: CatalogItem[];
}

interface CardinalApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ─── Auth Token Cache ─────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAuthToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  if (!CARDINAL_API_KEY || !CARDINAL_ACCOUNT_NUMBER) {
    throw new Error(
      "Cardinal Health API credentials not configured. Set CARDINAL_API_KEY and CARDINAL_ACCOUNT_NUMBER."
    );
  }

  try {
    const response = await fetch(`${CARDINAL_API_URL}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": CARDINAL_API_KEY,
      },
      body: JSON.stringify({
        accountNumber: CARDINAL_ACCOUNT_NUMBER,
        apiKey: CARDINAL_API_KEY,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Cardinal Health auth failed", {
        status: response.status,
        body: errorText,
      });
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const result = await response.json();
    cachedToken = {
      token: result.accessToken || result.token,
      expiresAt: Date.now() + (result.expiresIn || 3600) * 1000,
    };

    return cachedToken.token;
  } catch (error) {
    logger.error("Cardinal Health auth error", { error });
    throw error;
  }
}

async function cardinalFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<CardinalApiResponse<T>> {
  const token = await getAuthToken();

  const url = `${CARDINAL_API_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-Account-Number": CARDINAL_ACCOUNT_NUMBER || "",
    ...(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Cardinal Health API error", {
        endpoint,
        status: response.status,
        body: errorBody,
      });

      return {
        success: false,
        error: `API error: ${response.status} - ${errorBody}`,
        code: String(response.status),
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Cardinal Health request failed", { endpoint, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

// ─── Catalog Search ───────────────────────────────────────

/**
 * Search the Cardinal Health catalog by NDC or product name.
 * Returns matching products with pricing and availability.
 */
export async function searchCatalog(query: string, options?: {
  limit?: number;
  offset?: number;
  sortBy?: "name" | "price" | "ndc";
}): Promise<{ items: CatalogItem[]; total: number }> {
  const params = new URLSearchParams();

  // Detect if query is an NDC (numeric with dashes)
  const isNdc = /^[\d-]+$/.test(query.trim());
  if (isNdc) {
    params.set("ndc", query.replace(/-/g, ""));
  } else {
    params.set("search", query);
  }

  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));
  if (options?.sortBy) params.set("sortBy", options.sortBy);

  const result = await cardinalFetch<{
    products: CatalogItem[];
    totalCount: number;
  }>(`/catalog/search?${params.toString()}`);

  if (!result.success || !result.data) {
    logger.warn("Cardinal catalog search failed", { query, error: result.error });
    return { items: [], total: 0 };
  }

  return {
    items: result.data.products.map((p) => ({
      ndc: p.ndc,
      productName: p.productName,
      genericName: p.genericName,
      brandName: p.brandName,
      manufacturer: p.manufacturer,
      strength: p.strength,
      dosageForm: p.dosageForm,
      packageSize: p.packageSize,
      unitPrice: p.unitPrice,
      contractPrice: p.contractPrice,
      available: p.available,
      quantityAvailable: p.quantityAvailable,
      unit: p.unit || "EA",
      deaSchedule: p.deaSchedule,
      awp: p.awp,
    })),
    total: result.data.totalCount,
  };
}

// ─── Create Purchase Order ────────────────────────────────

/**
 * Create and submit a purchase order to Cardinal Health.
 * Returns the created order with confirmation details.
 */
export async function createOrder(params: {
  lineItems: Array<{
    ndc: string;
    quantity: number;
    unit?: string;
  }>;
  poNumber?: string;
  notes?: string;
  rushDelivery?: boolean;
}): Promise<CardinalOrder> {
  const poNumber =
    params.poNumber || `PO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const payload = {
    accountNumber: CARDINAL_ACCOUNT_NUMBER,
    purchaseOrderNumber: poNumber,
    lineItems: params.lineItems.map((item, idx) => ({
      lineNumber: idx + 1,
      ndc: item.ndc.replace(/-/g, ""),
      quantity: item.quantity,
      unitOfMeasure: item.unit || "EA",
    })),
    notes: params.notes,
    rushDelivery: params.rushDelivery || false,
  };

  const result = await cardinalFetch<CardinalOrder>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to create Cardinal Health order");
  }

  logger.info("Cardinal Health order created", {
    orderId: result.data.orderId,
    poNumber,
    lineItemCount: params.lineItems.length,
  });

  return {
    ...result.data,
    poNumber,
  };
}

// ─── Order Status ─────────────────────────────────────────

/**
 * Check the current status of a Cardinal Health order.
 */
export async function getOrderStatus(orderId: string): Promise<{
  orderId: string;
  status: CardinalOrder["status"];
  updatedAt: string;
  lineItems: CardinalLineItem[];
  tracking?: TrackingInfo;
}> {
  const result = await cardinalFetch<{
    orderId: string;
    status: CardinalOrder["status"];
    updatedAt: string;
    lineItems: CardinalLineItem[];
    tracking?: TrackingInfo;
  }>(`/orders/${encodeURIComponent(orderId)}`);

  if (!result.success || !result.data) {
    throw new Error(result.error || `Order ${orderId} not found`);
  }

  return result.data;
}

// ─── Delivery Tracking ────────────────────────────────────

/**
 * Get delivery tracking information for a shipped order.
 */
export async function getDeliveryTracking(orderId: string): Promise<TrackingInfo> {
  const result = await cardinalFetch<TrackingInfo>(
    `/orders/${encodeURIComponent(orderId)}/tracking`
  );

  if (!result.success || !result.data) {
    throw new Error(result.error || `Tracking not available for order ${orderId}`);
  }

  return result.data;
}

// ─── Availability / Pricing ───────────────────────────────

/**
 * Check availability and pricing for specific items by NDC.
 */
export async function checkAvailability(
  ndcs: string[]
): Promise<AvailabilityResult[]> {
  const result = await cardinalFetch<{ items: AvailabilityResult[] }>(
    "/catalog/availability",
    {
      method: "POST",
      body: JSON.stringify({
        accountNumber: CARDINAL_ACCOUNT_NUMBER,
        ndcs: ndcs.map((ndc) => ndc.replace(/-/g, "")),
      }),
    }
  );

  if (!result.success || !result.data) {
    logger.warn("Cardinal availability check failed", { ndcs, error: result.error });
    return ndcs.map((ndc) => ({
      ndc,
      productName: "Unknown",
      available: false,
      quantityAvailable: 0,
      unitPrice: 0,
    }));
  }

  return result.data.items;
}
