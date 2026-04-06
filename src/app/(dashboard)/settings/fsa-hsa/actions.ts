"use server";

/**
 * FSA/HSA Configuration Server Actions
 *
 * Store-level settings for FSA/HSA eligibility categories,
 * item overrides, MCC code, and IIAS auto-substantiation.
 * Persisted in StoreSetting with JSON values.
 */

import type { FSACategory } from "@/lib/pos/fsa-hsa-compliance";

// ── Setting keys ────────────────────────────────────────────────────────────

const SETTING_KEYS = {
  categories: "fsa_hsa_categories",
  itemOverrides: "fsa_hsa_item_overrides",
  mccCode: "fsa_hsa_mcc_code",
  iiasEnabled: "fsa_hsa_iias_enabled",
} as const;

// ── Default categories (matches the engine defaults) ────────────────────────

const DEFAULT_CATEGORIES: FSACategory[] = [
  { id: "rx_drugs", name: "Prescription Drugs", description: "All prescription medications", alwaysEligible: true, requiresRx: false, caresActEligible: true },
  { id: "otc_medications", name: "OTC Medications", description: "Over-the-counter drugs (CARES Act eligible)", alwaysEligible: false, requiresRx: false, caresActEligible: true },
  { id: "menstrual_products", name: "Menstrual Care Products", description: "Tampons, pads, cups (CARES Act)", alwaysEligible: false, requiresRx: false, caresActEligible: true },
  { id: "first_aid", name: "First Aid Supplies", description: "Bandages, antiseptics, wound care", alwaysEligible: true, requiresRx: false, caresActEligible: true },
  { id: "medical_devices", name: "Medical Devices", description: "BP monitors, thermometers, braces", alwaysEligible: true, requiresRx: false, caresActEligible: true },
  { id: "diabetic_supplies", name: "Diabetic Supplies", description: "Test strips, lancets, glucose monitors", alwaysEligible: true, requiresRx: false, caresActEligible: true },
  { id: "vision_care", name: "Vision Care", description: "Contact solution, reading glasses", alwaysEligible: true, requiresRx: false, caresActEligible: true },
  { id: "sun_protection", name: "Sun Protection (SPF 15+)", description: "Sunscreen SPF 15+ (CARES Act)", alwaysEligible: false, requiresRx: false, caresActEligible: true },
  { id: "hearing_aids", name: "Hearing Aids & Batteries", description: "Hearing devices and batteries", alwaysEligible: true, requiresRx: false, caresActEligible: true },
  { id: "dme", name: "Durable Medical Equipment", description: "Crutches, wheelchairs, nebulizers", alwaysEligible: true, requiresRx: false, caresActEligible: true },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getStoreId(): Promise<string> {
  const { prisma } = await import("@/lib/prisma");
  const store = await prisma.store.findFirst();
  if (!store) throw new Error("No store found");
  return store.id;
}

async function getSetting(storeId: string, key: string): Promise<string | null> {
  const { prisma } = await import("@/lib/prisma");
  const setting = await prisma.storeSetting.findUnique({
    where: { storeId_settingKey: { storeId, settingKey: key } },
  });
  return setting?.settingValue ?? null;
}

async function upsertSetting(storeId: string, key: string, value: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const { requireUser } = await import("@/lib/auth");
  const user = await requireUser();

  await prisma.storeSetting.upsert({
    where: { storeId_settingKey: { storeId, settingKey: key } },
    update: {
      settingValue: value,
      settingType: "json",
      updatedBy: user.id,
      updatedAt: new Date(),
    },
    create: {
      storeId,
      settingKey: key,
      settingValue: value,
      settingType: "json",
      updatedBy: user.id,
    },
  });
}

// ── Exported actions ────────────────────────────────────────────────────────

export interface EligibilityConfig {
  categories: FSACategory[];
  itemOverrides: Record<string, boolean>;
  mccCode: string;
  iiasEnabled: boolean;
}

/**
 * Get the full FSA/HSA eligibility configuration.
 */
export async function getEligibilityConfig(): Promise<EligibilityConfig> {
  const { requireUser } = await import("@/lib/auth");
  await requireUser();

  const storeId = await getStoreId();

  const [categoriesRaw, overridesRaw, mccRaw, iiasRaw] = await Promise.all([
    getSetting(storeId, SETTING_KEYS.categories),
    getSetting(storeId, SETTING_KEYS.itemOverrides),
    getSetting(storeId, SETTING_KEYS.mccCode),
    getSetting(storeId, SETTING_KEYS.iiasEnabled),
  ]);

  return {
    categories: categoriesRaw ? JSON.parse(categoriesRaw) : DEFAULT_CATEGORIES,
    itemOverrides: overridesRaw ? JSON.parse(overridesRaw) : {},
    mccCode: mccRaw ?? "5912",
    iiasEnabled: iiasRaw === "true",
  };
}

/**
 * Update the eligible categories list.
 */
export async function updateCategories(
  categories: FSACategory[]
): Promise<{ success: boolean }> {
  const { requireUser } = await import("@/lib/auth");
  const { requirePermission } = await import("@/lib/permissions");
  await requireUser();
  await requirePermission("settings", "write");

  const storeId = await getStoreId();
  await upsertSetting(storeId, SETTING_KEYS.categories, JSON.stringify(categories));
  return { success: true };
}

/**
 * Override eligibility for a specific item (by barcode or ID).
 */
export async function overrideItem(
  itemId: string,
  eligible: boolean
): Promise<{ success: boolean }> {
  const { requireUser } = await import("@/lib/auth");
  const { requirePermission } = await import("@/lib/permissions");
  await requireUser();
  await requirePermission("settings", "write");

  const storeId = await getStoreId();
  const raw = await getSetting(storeId, SETTING_KEYS.itemOverrides);
  const overrides: Record<string, boolean> = raw ? JSON.parse(raw) : {};
  overrides[itemId] = eligible;
  await upsertSetting(storeId, SETTING_KEYS.itemOverrides, JSON.stringify(overrides));
  return { success: true };
}

/**
 * Remove an item override.
 */
export async function removeItemOverride(
  itemId: string
): Promise<{ success: boolean }> {
  const { requireUser } = await import("@/lib/auth");
  const { requirePermission } = await import("@/lib/permissions");
  await requireUser();
  await requirePermission("settings", "write");

  const storeId = await getStoreId();
  const raw = await getSetting(storeId, SETTING_KEYS.itemOverrides);
  const overrides: Record<string, boolean> = raw ? JSON.parse(raw) : {};
  delete overrides[itemId];
  await upsertSetting(storeId, SETTING_KEYS.itemOverrides, JSON.stringify(overrides));
  return { success: true };
}

/**
 * Update MCC code and IIAS toggle.
 */
export async function updateIIASConfig(
  mccCode: string,
  iiasEnabled: boolean
): Promise<{ success: boolean }> {
  const { requireUser } = await import("@/lib/auth");
  const { requirePermission } = await import("@/lib/permissions");
  await requireUser();
  await requirePermission("settings", "write");

  const storeId = await getStoreId();
  await Promise.all([
    upsertSetting(storeId, SETTING_KEYS.mccCode, mccCode),
    upsertSetting(storeId, SETTING_KEYS.iiasEnabled, String(iiasEnabled)),
  ]);
  return { success: true };
}

/**
 * Get FSA/HSA transaction summary for a date range.
 */
export async function getTransactionReport(
  dateRange: { start: string; end: string }
): Promise<{
  totalTransactions: number;
  qualifiedAmount: number;
  nonQualifiedAmount: number;
  byPaymentMethod: Record<string, number>;
}> {
  const { requireUser } = await import("@/lib/auth");
  const { requirePermission } = await import("@/lib/permissions");
  await requireUser();
  await requirePermission("reports", "read");

  const { prisma } = await import("@/lib/prisma");

  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);

  // Get POS transactions in range
  const transactions = await prisma.posTransaction.findMany({
    where: {
      processedAt: { gte: startDate, lte: endDate },
    },
    include: {
      lineItems: true,
    },
  });

  let qualifiedAmount = 0;
  let nonQualifiedAmount = 0;
  const byPaymentMethod: Record<string, number> = {};

  for (const tx of transactions) {
    const method = tx.paymentMethod;
    byPaymentMethod[method] = (byPaymentMethod[method] ?? 0) + 1;

    for (const item of tx.lineItems) {
      // Rx line items (fillId present) are always qualified
      if (item.fillId || item.itemType === "rx") {
        qualifiedAmount += Number(item.total);
      } else {
        nonQualifiedAmount += Number(item.total);
      }
    }
  }

  return {
    totalTransactions: transactions.length,
    qualifiedAmount: Math.round(qualifiedAmount * 100) / 100,
    nonQualifiedAmount: Math.round(nonQualifiedAmount * 100) / 100,
    byPaymentMethod,
  };
}
