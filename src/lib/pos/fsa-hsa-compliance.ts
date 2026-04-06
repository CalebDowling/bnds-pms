/**
 * FSA / HSA IIAS Compliance Engine
 *
 * Handles:
 * - Item eligibility categorization per IRS rules
 * - IIAS (Inventory Information Approval System) split-tender logic
 * - Split receipt generation for qualified vs non-qualified amounts
 * - FSA/HSA card transaction flagging at POS
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface FSACategory {
  id: string;
  name: string;
  description: string;
  alwaysEligible: boolean;
  /** If true, requires a prescription for eligibility (OTC exception) */
  requiresRx: boolean;
  /** Whether CARES Act makes this eligible without Rx */
  caresActEligible: boolean;
}

export interface LineItem {
  id: string;
  description: string;
  itemType: "rx" | "otc" | "device" | "supply" | "general";
  quantity: number;
  unitPrice: number;
  total: number;
  /** Optional: item category override from store config */
  categoryOverride?: string;
  /** Optional: specific item-level override */
  eligibilityOverride?: boolean | null;
  /** For OTC items: does the patient have an Rx for this? */
  hasRx?: boolean;
  barcode?: string;
}

export interface EligibilityResult {
  itemId: string;
  eligible: boolean;
  category: string;
  reason: string;
}

export interface SplitReceipt {
  qualifiedItems: Array<LineItem & { eligibilityReason: string }>;
  nonQualifiedItems: Array<LineItem & { eligibilityReason: string }>;
  qualifiedTotal: number;
  nonQualifiedTotal: number;
  grandTotal: number;
  transactionDate: string;
  isFSAHSACard: boolean;
  mccCode: string;
}

export interface TransactionSummary {
  totalTransactions: number;
  fsaHsaTransactions: number;
  qualifiedAmount: number;
  nonQualifiedAmount: number;
  byCategory: Record<string, { count: number; amount: number }>;
}

// ── Default FSA/HSA Eligible Categories ─────────────────────────────────────

const DEFAULT_CATEGORIES: FSACategory[] = [
  {
    id: "rx_drugs",
    name: "Prescription Drugs",
    description: "All prescription medications dispensed by a licensed pharmacy",
    alwaysEligible: true,
    requiresRx: false,
    caresActEligible: true,
  },
  {
    id: "otc_medications",
    name: "OTC Medications",
    description: "Over-the-counter drugs and medicines (CARES Act eligible without Rx)",
    alwaysEligible: false,
    requiresRx: false,
    caresActEligible: true,
  },
  {
    id: "menstrual_products",
    name: "Menstrual Care Products",
    description: "Tampons, pads, liners, cups, and menstrual discs (CARES Act)",
    alwaysEligible: false,
    requiresRx: false,
    caresActEligible: true,
  },
  {
    id: "first_aid",
    name: "First Aid Supplies",
    description: "Bandages, antiseptics, first aid kits, wound care",
    alwaysEligible: true,
    requiresRx: false,
    caresActEligible: true,
  },
  {
    id: "medical_devices",
    name: "Medical Devices",
    description: "Blood pressure monitors, thermometers, TENS units, braces",
    alwaysEligible: true,
    requiresRx: false,
    caresActEligible: true,
  },
  {
    id: "diabetic_supplies",
    name: "Diabetic Supplies",
    description: "Test strips, lancets, glucose monitors, insulin syringes",
    alwaysEligible: true,
    requiresRx: false,
    caresActEligible: true,
  },
  {
    id: "vision_care",
    name: "Vision Care",
    description: "Contact lens solution, reading glasses, eye drops",
    alwaysEligible: true,
    requiresRx: false,
    caresActEligible: true,
  },
  {
    id: "sun_protection",
    name: "Sun Protection (SPF 15+)",
    description: "Sunscreen with SPF 15 or higher (CARES Act)",
    alwaysEligible: false,
    requiresRx: false,
    caresActEligible: true,
  },
  {
    id: "hearing_aids",
    name: "Hearing Aids & Batteries",
    description: "Hearing devices and associated batteries",
    alwaysEligible: true,
    requiresRx: false,
    caresActEligible: true,
  },
  {
    id: "dme",
    name: "Durable Medical Equipment",
    description: "Crutches, wheelchairs, hospital beds, nebulizers",
    alwaysEligible: true,
    requiresRx: false,
    caresActEligible: true,
  },
];

// ── Map item types to default categories ────────────────────────────────────

function defaultCategoryForItemType(itemType: LineItem["itemType"]): string {
  switch (itemType) {
    case "rx":
      return "rx_drugs";
    case "otc":
      return "otc_medications";
    case "device":
      return "medical_devices";
    case "supply":
      return "first_aid";
    default:
      return "general";
  }
}

// ── Core Functions ──────────────────────────────────────────────────────────

/**
 * Get the full list of eligible categories (defaults + any store overrides).
 */
export function getEligibleCategories(
  storeOverrides?: FSACategory[]
): FSACategory[] {
  if (storeOverrides && storeOverrides.length > 0) {
    return storeOverrides;
  }
  return DEFAULT_CATEGORIES;
}

/**
 * Determine whether a single line item is FSA/HSA eligible.
 */
export function isItemEligible(
  item: LineItem,
  categories: FSACategory[] = DEFAULT_CATEGORIES,
  itemOverrides: Record<string, boolean> = {}
): EligibilityResult {
  // 1. Check item-level override first
  if (item.eligibilityOverride != null) {
    return {
      itemId: item.id,
      eligible: item.eligibilityOverride,
      category: item.categoryOverride ?? defaultCategoryForItemType(item.itemType),
      reason: item.eligibilityOverride
        ? "Manual override: marked eligible"
        : "Manual override: marked ineligible",
    };
  }

  // 2. Check store-level item overrides (by barcode or id)
  const overrideKey = item.barcode ?? item.id;
  if (overrideKey in itemOverrides) {
    return {
      itemId: item.id,
      eligible: itemOverrides[overrideKey],
      category: defaultCategoryForItemType(item.itemType),
      reason: itemOverrides[overrideKey]
        ? "Store override: marked eligible"
        : "Store override: marked ineligible",
    };
  }

  // 3. Prescription drugs are always eligible
  if (item.itemType === "rx") {
    return {
      itemId: item.id,
      eligible: true,
      category: "rx_drugs",
      reason: "Prescription drugs are always FSA/HSA eligible",
    };
  }

  // 4. Match against eligible categories
  const categoryId = item.categoryOverride ?? defaultCategoryForItemType(item.itemType);
  const category = categories.find((c) => c.id === categoryId);

  if (!category) {
    return {
      itemId: item.id,
      eligible: false,
      category: categoryId,
      reason: "Item category is not in the eligible categories list",
    };
  }

  // Always-eligible categories
  if (category.alwaysEligible) {
    return {
      itemId: item.id,
      eligible: true,
      category: category.id,
      reason: `${category.name}: always eligible`,
    };
  }

  // CARES Act eligible (OTC drugs, menstrual products, sunscreen)
  if (category.caresActEligible) {
    return {
      itemId: item.id,
      eligible: true,
      category: category.id,
      reason: `${category.name}: eligible under CARES Act`,
    };
  }

  // Requires Rx but doesn't have one
  if (category.requiresRx && !item.hasRx) {
    return {
      itemId: item.id,
      eligible: false,
      category: category.id,
      reason: `${category.name}: requires a prescription for FSA/HSA eligibility`,
    };
  }

  return {
    itemId: item.id,
    eligible: false,
    category: categoryId,
    reason: "Item does not meet FSA/HSA eligibility criteria",
  };
}

/**
 * Categorize an entire transaction into eligible / non-eligible line items.
 */
export function categorizeTransaction(
  items: LineItem[],
  categories: FSACategory[] = DEFAULT_CATEGORIES,
  itemOverrides: Record<string, boolean> = {}
): {
  eligible: Array<LineItem & { eligibilityReason: string }>;
  nonEligible: Array<LineItem & { eligibilityReason: string }>;
} {
  const eligible: Array<LineItem & { eligibilityReason: string }> = [];
  const nonEligible: Array<LineItem & { eligibilityReason: string }> = [];

  for (const item of items) {
    const result = isItemEligible(item, categories, itemOverrides);
    const annotated = { ...item, eligibilityReason: result.reason };

    if (result.eligible) {
      eligible.push(annotated);
    } else {
      nonEligible.push(annotated);
    }
  }

  return { eligible, nonEligible };
}

/**
 * Generate a split receipt showing qualified vs non-qualified amounts.
 * Required for IIAS compliance when an FSA/HSA card is used.
 */
export function generateSplitReceipt(
  items: LineItem[],
  options: {
    categories?: FSACategory[];
    itemOverrides?: Record<string, boolean>;
    isFSAHSACard?: boolean;
    mccCode?: string;
  } = {}
): SplitReceipt {
  const {
    categories = DEFAULT_CATEGORIES,
    itemOverrides = {},
    isFSAHSACard = false,
    mccCode = "5912",
  } = options;

  const { eligible, nonEligible } = categorizeTransaction(
    items,
    categories,
    itemOverrides
  );

  const qualifiedTotal = eligible.reduce((sum, i) => sum + i.total, 0);
  const nonQualifiedTotal = nonEligible.reduce((sum, i) => sum + i.total, 0);

  return {
    qualifiedItems: eligible,
    nonQualifiedItems: nonEligible,
    qualifiedTotal: Math.round(qualifiedTotal * 100) / 100,
    nonQualifiedTotal: Math.round(nonQualifiedTotal * 100) / 100,
    grandTotal: Math.round((qualifiedTotal + nonQualifiedTotal) * 100) / 100,
    transactionDate: new Date().toISOString(),
    isFSAHSACard,
    mccCode,
  };
}

/**
 * Detect whether a payment card is likely an FSA/HSA card based on BIN range.
 * Common FSA/HSA BIN prefixes (this is a heuristic; real implementations
 * rely on the card network's response codes).
 */
export function isFSAHSACard(cardBin: string): boolean {
  const fsaBinPrefixes = [
    "600649", // Conduent
    "627597", // WageWorks
    "628028", // HealthEquity
    "601018", // PayFlex
    "524913", // Further (SelectAccount)
    "626498", // ConnectYourCare
    "622476", // BenefitFocus
  ];

  return fsaBinPrefixes.some((prefix) => cardBin.startsWith(prefix));
}
