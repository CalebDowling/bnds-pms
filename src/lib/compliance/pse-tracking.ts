// @ts-nocheck
/**
 * PSE (Pseudoephedrine) Tracking Module
 * Combat Methamphetamine Epidemic Act (CMEA) Compliance
 *
 * Tracks all pseudoephedrine purchases, enforces federal purchase limits,
 * manages NPLEx block list checks, and generates submission data.
 */

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IdType = 'driver_license' | 'passport' | 'state_id' | 'military_id';

export interface PsePurchaseRecord {
  id: string;
  buyerName: string;
  buyerDob: string; // ISO date string YYYY-MM-DD
  buyerAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  idType: IdType;
  idNumber: string;
  idState: string;
  productName: string;
  quantityGrams: number;
  packageCount: number;
  dateTime: string; // ISO datetime
  sellerId: string;
  sellerName: string;
  blocked: boolean;
  blockReason?: string;
  nplexSubmitted: boolean;
  nplexSubmittedAt?: string;
}

export interface PseBuyerBlock {
  buyerName: string;
  buyerDob: string;
  idNumber: string;
  reason: string;
  blockedAt: string;
  blockedBy: string;
}

export interface PseLimitCheck {
  allowed: boolean;
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  dailyPercent: number;
  monthlyUsed: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  monthlyPercent: number;
  isBlocked: boolean;
  blockReason?: string;
  warnings: string[];
}

export interface PseReport {
  totalSales: number;
  totalGrams: number;
  blockedAttempts: number;
  thirtyDayGrams: number;
  records: PsePurchaseRecord[];
}

export interface NplexSubmission {
  transactionId: string;
  pharmacyDea: string;
  pharmacyNpi: string;
  buyerName: string;
  buyerDob: string;
  buyerAddress: string;
  idType: string;
  idNumber: string;
  idState: string;
  productName: string;
  quantityGrams: number;
  transactionDate: string;
  sellerName: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PSE_DAILY_LIMIT_GRAMS = 3.6;
const PSE_30DAY_LIMIT_GRAMS = 9.0;
const PSE_30DAY_MAIL_ORDER_LIMIT_GRAMS = 7.5;

/** Common PSE products with gram equivalents per package unit */
const PSE_PRODUCT_EQUIVALENTS: Record<string, number> = {
  'Sudafed 12-Hour 120mg': 1.44,
  'Sudafed 24-Hour 240mg': 2.88,
  'Sudafed PE 10mg': 0.12,
  'Claritin-D 12-Hour': 1.44,
  'Claritin-D 24-Hour': 2.88,
  'Zyrtec-D 12-Hour': 1.44,
  'Allegra-D 12-Hour': 1.44,
  'Allegra-D 24-Hour': 2.88,
  'Mucinex D 600/60mg': 0.72,
  'Bronkaid 25mg': 0.30,
  'Primatene 12.5mg': 0.15,
  'Generic PSE 30mg': 0.36,
  'Generic PSE 60mg': 0.72,
  'Generic PSE 120mg': 1.44,
  'Generic PSE 240mg': 2.88,
};

// ---------------------------------------------------------------------------
// Storage helpers — uses StoreSetting model with JSON storage
// ---------------------------------------------------------------------------

function getLogKey(year: number): string {
  return `pse_log_${year}`;
}

function getBlockListKey(): string {
  return 'pse_block_list';
}

async function readPseLog(year: number): Promise<PsePurchaseRecord[]> {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: getLogKey(year) },
  });
  if (!setting || !setting.value) return [];
  try {
    const parsed = JSON.parse(setting.value as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePseLog(year: number, records: PsePurchaseRecord[]): Promise<void> {
  const key = getLogKey(year);
  await prisma.storeSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(records) },
    create: { key, value: JSON.stringify(records) },
  });
}

async function readBlockList(): Promise<PseBuyerBlock[]> {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: getBlockListKey() },
  });
  if (!setting || !setting.value) return [];
  try {
    const parsed = JSON.parse(setting.value as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeBlockList(blocks: PseBuyerBlock[]): Promise<void> {
  const key = getBlockListKey();
  await prisma.storeSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(blocks) },
    create: { key, value: JSON.stringify(blocks) },
  });
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `pse_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate the PSE gram equivalent for a product / package configuration.
 */
export function calculateGramEquivalent(
  productName: string,
  packageCount: number
): number {
  const perPackage = PSE_PRODUCT_EQUIVALENTS[productName];
  if (perPackage !== undefined) {
    return Math.round(perPackage * packageCount * 1000) / 1000;
  }
  // Fallback: caller should provide manual gram amount
  return 0;
}

/**
 * Get the list of known PSE products and their per-package gram equivalents.
 */
export function getPseProductList(): { name: string; gramsPerPackage: number }[] {
  return Object.entries(PSE_PRODUCT_EQUIVALENTS).map(([name, gramsPerPackage]) => ({
    name,
    gramsPerPackage,
  }));
}

/**
 * Check PSE purchase limits for a buyer WITHOUT recording a purchase.
 * Returns limit status, remaining allowances, and any warnings.
 */
export async function checkPseLimits(
  buyerName: string,
  buyerDob: string,
  idNumber: string,
  requestedGrams: number,
  isMailOrder: boolean = false
): Promise<PseLimitCheck> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const thirtyDaysAgo = daysAgo(30, now);
  const normalizedName = normalizeName(buyerName);

  // Gather records from this year and possibly last year (for 30-day window)
  const currentYear = now.getFullYear();
  let allRecords = await readPseLog(currentYear);
  if (now.getMonth() === 0) {
    // January — also check December of last year
    const lastYearRecords = await readPseLog(currentYear - 1);
    allRecords = [...lastYearRecords, ...allRecords];
  }

  // Filter to this buyer (match by normalized name + DOB, or ID number)
  const buyerRecords = allRecords.filter((r) => {
    const nameMatch = normalizeName(r.buyerName) === normalizedName && r.buyerDob === buyerDob;
    const idMatch = r.idNumber === idNumber;
    return (nameMatch || idMatch) && !r.blocked;
  });

  // Daily total
  const dailyRecords = buyerRecords.filter(
    (r) => new Date(r.dateTime) >= todayStart
  );
  const dailyUsed = dailyRecords.reduce((sum, r) => sum + r.quantityGrams, 0);

  // 30-day total
  const monthlyRecords = buyerRecords.filter(
    (r) => new Date(r.dateTime) >= thirtyDaysAgo
  );
  const monthlyUsed = monthlyRecords.reduce((sum, r) => sum + r.quantityGrams, 0);

  const monthlyLimit = isMailOrder ? PSE_30DAY_MAIL_ORDER_LIMIT_GRAMS : PSE_30DAY_LIMIT_GRAMS;

  // Block list check
  const blockList = await readBlockList();
  const isBlocked = blockList.some(
    (b) => b.idNumber === idNumber || (normalizeName(b.buyerName) === normalizedName && b.buyerDob === buyerDob)
  );
  const blockEntry = isBlocked
    ? blockList.find(
        (b) => b.idNumber === idNumber || (normalizeName(b.buyerName) === normalizedName && b.buyerDob === buyerDob)
      )
    : undefined;

  // Build warnings
  const warnings: string[] = [];
  const dailyAfter = dailyUsed + requestedGrams;
  const monthlyAfter = monthlyUsed + requestedGrams;

  if (isBlocked) {
    warnings.push(`Buyer is on the block list: ${blockEntry?.reason ?? 'Unknown reason'}`);
  }
  if (dailyAfter > PSE_DAILY_LIMIT_GRAMS) {
    warnings.push(
      `Daily limit exceeded: ${dailyAfter.toFixed(2)}g would exceed ${PSE_DAILY_LIMIT_GRAMS}g limit`
    );
  } else if (dailyAfter / PSE_DAILY_LIMIT_GRAMS > 0.9) {
    warnings.push(
      `Approaching daily limit: ${dailyAfter.toFixed(2)}g of ${PSE_DAILY_LIMIT_GRAMS}g (${Math.round((dailyAfter / PSE_DAILY_LIMIT_GRAMS) * 100)}%)`
    );
  } else if (dailyAfter / PSE_DAILY_LIMIT_GRAMS > 0.75) {
    warnings.push(
      `Daily usage elevated: ${dailyAfter.toFixed(2)}g of ${PSE_DAILY_LIMIT_GRAMS}g (${Math.round((dailyAfter / PSE_DAILY_LIMIT_GRAMS) * 100)}%)`
    );
  }

  if (monthlyAfter > monthlyLimit) {
    warnings.push(
      `30-day limit exceeded: ${monthlyAfter.toFixed(2)}g would exceed ${monthlyLimit}g limit`
    );
  } else if (monthlyAfter / monthlyLimit > 0.9) {
    warnings.push(
      `Approaching 30-day limit: ${monthlyAfter.toFixed(2)}g of ${monthlyLimit}g (${Math.round((monthlyAfter / monthlyLimit) * 100)}%)`
    );
  } else if (monthlyAfter / monthlyLimit > 0.75) {
    warnings.push(
      `30-day usage elevated: ${monthlyAfter.toFixed(2)}g of ${monthlyLimit}g (${Math.round((monthlyAfter / monthlyLimit) * 100)}%)`
    );
  }

  const allowed =
    !isBlocked &&
    dailyAfter <= PSE_DAILY_LIMIT_GRAMS &&
    monthlyAfter <= monthlyLimit;

  return {
    allowed,
    dailyUsed: Math.round(dailyUsed * 1000) / 1000,
    dailyLimit: PSE_DAILY_LIMIT_GRAMS,
    dailyRemaining: Math.round(Math.max(0, PSE_DAILY_LIMIT_GRAMS - dailyUsed) * 1000) / 1000,
    dailyPercent: Math.round((dailyUsed / PSE_DAILY_LIMIT_GRAMS) * 100),
    monthlyUsed: Math.round(monthlyUsed * 1000) / 1000,
    monthlyLimit,
    monthlyRemaining: Math.round(Math.max(0, monthlyLimit - monthlyUsed) * 1000) / 1000,
    monthlyPercent: Math.round((monthlyUsed / monthlyLimit) * 100),
    isBlocked,
    blockReason: blockEntry?.reason,
    warnings,
  };
}

/**
 * Record a PSE purchase after validation.
 * Returns the new record or throws if limits are exceeded.
 */
export async function recordPsePurchase(input: {
  buyerName: string;
  buyerDob: string;
  buyerAddress: { street: string; city: string; state: string; zip: string };
  idType: IdType;
  idNumber: string;
  idState: string;
  productName: string;
  packageCount: number;
  quantityGrams: number;
}): Promise<PsePurchaseRecord> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Authentication required');

  // Check limits first
  const limits = await checkPseLimits(
    input.buyerName,
    input.buyerDob,
    input.idNumber,
    input.quantityGrams
  );

  if (!limits.allowed) {
    const reasons = limits.warnings.join('; ');
    throw new Error(`PSE purchase denied: ${reasons}`);
  }

  const now = new Date();
  const record: PsePurchaseRecord = {
    id: generateId(),
    buyerName: input.buyerName.trim(),
    buyerDob: input.buyerDob,
    buyerAddress: input.buyerAddress,
    idType: input.idType,
    idNumber: input.idNumber.trim(),
    idState: input.idState,
    productName: input.productName,
    quantityGrams: input.quantityGrams,
    packageCount: input.packageCount,
    dateTime: now.toISOString(),
    sellerId: user.id,
    sellerName: user.name ?? user.email ?? 'Unknown',
    blocked: false,
    nplexSubmitted: false,
  };

  const year = now.getFullYear();
  const records = await readPseLog(year);
  records.push(record);
  await writePseLog(year, records);

  return record;
}

/**
 * Get PSE purchase history filtered by date range and optional buyer search.
 */
export async function getPseHistory(options: {
  startDate: string;
  endDate: string;
  buyerSearch?: string;
  idSearch?: string;
}): Promise<PsePurchaseRecord[]> {
  const start = new Date(options.startDate);
  const end = new Date(options.endDate);
  end.setHours(23, 59, 59, 999);

  // Collect records from relevant years
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  let allRecords: PsePurchaseRecord[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const yearRecords = await readPseLog(y);
    allRecords = [...allRecords, ...yearRecords];
  }

  // Filter by date range
  let filtered = allRecords.filter((r) => {
    const dt = new Date(r.dateTime);
    return dt >= start && dt <= end;
  });

  // Filter by buyer name
  if (options.buyerSearch) {
    const search = normalizeName(options.buyerSearch);
    filtered = filtered.filter(
      (r) =>
        normalizeName(r.buyerName).includes(search) ||
        r.idNumber.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Filter by ID number
  if (options.idSearch) {
    const idSearch = options.idSearch.trim().toLowerCase();
    filtered = filtered.filter((r) => r.idNumber.toLowerCase().includes(idSearch));
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  return filtered;
}

/**
 * Generate a PSE report for a date range with summary statistics.
 */
export async function getPseReport(startDate: string, endDate: string): Promise<PseReport> {
  const records = await getPseHistory({ startDate, endDate });
  const now = new Date();
  const thirtyDaysAgo = daysAgo(30, now);

  // 30-day total across all buyers
  const currentYear = now.getFullYear();
  let allRecent = await readPseLog(currentYear);
  if (now.getMonth() === 0) {
    const lastYearRecords = await readPseLog(currentYear - 1);
    allRecent = [...lastYearRecords, ...allRecent];
  }
  const thirtyDayRecords = allRecent.filter(
    (r) => new Date(r.dateTime) >= thirtyDaysAgo && !r.blocked
  );

  return {
    totalSales: records.filter((r) => !r.blocked).length,
    totalGrams: Math.round(
      records.filter((r) => !r.blocked).reduce((sum, r) => sum + r.quantityGrams, 0) * 1000
    ) / 1000,
    blockedAttempts: records.filter((r) => r.blocked).length,
    thirtyDayGrams: Math.round(
      thirtyDayRecords.reduce((sum, r) => sum + r.quantityGrams, 0) * 1000
    ) / 1000,
    records,
  };
}

/**
 * Add a buyer to the PSE block list.
 */
export async function blockBuyer(
  buyerInfo: { buyerName: string; buyerDob: string; idNumber: string },
  reason: string
): Promise<PseBuyerBlock> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Authentication required');

  const blockList = await readBlockList();

  // Check if already blocked
  const existing = blockList.find(
    (b) => b.idNumber === buyerInfo.idNumber
  );
  if (existing) {
    throw new Error('Buyer is already on the block list');
  }

  const block: PseBuyerBlock = {
    buyerName: buyerInfo.buyerName.trim(),
    buyerDob: buyerInfo.buyerDob,
    idNumber: buyerInfo.idNumber.trim(),
    reason: reason.trim(),
    blockedAt: new Date().toISOString(),
    blockedBy: user.name ?? user.email ?? 'Unknown',
  };

  blockList.push(block);
  await writeBlockList(blockList);

  return block;
}

/**
 * Generate NPLEx-format submission data for a date range.
 */
export function generateNplexSubmissionData(
  records: PsePurchaseRecord[],
  pharmacyDea: string = 'BNDS-DEA-001',
  pharmacyNpi: string = 'BNDS-NPI-001'
): NplexSubmission[] {
  return records
    .filter((r) => !r.blocked)
    .map((r) => ({
      transactionId: r.id,
      pharmacyDea,
      pharmacyNpi,
      buyerName: r.buyerName,
      buyerDob: r.buyerDob,
      buyerAddress: `${r.buyerAddress.street}, ${r.buyerAddress.city}, ${r.buyerAddress.state} ${r.buyerAddress.zip}`,
      idType: r.idType,
      idNumber: r.idNumber,
      idState: r.idState,
      productName: r.productName,
      quantityGrams: r.quantityGrams,
      transactionDate: r.dateTime,
      sellerName: r.sellerName,
    }));
}
