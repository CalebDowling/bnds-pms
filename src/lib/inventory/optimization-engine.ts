/**
 * Datarithm-style Inventory Optimization Engine
 *
 * Analyzes dispensing patterns and recommends reorder quantities using:
 * - Multi-window dispensing velocity (30/60/90 day)
 * - Economic Order Quantity (EOQ) formula
 * - Safety stock buffers based on demand variability
 * - Dead stock and fast mover detection
 * - Seasonal pattern analysis
 * - Priority-scored reorder recommendations
 */

import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DispensingVelocity {
  days30: number; // units per day, last 30 days
  days60: number;
  days90: number;
  totalDispensed30: number;
  totalDispensed60: number;
  totalDispensed90: number;
}

export interface SeasonalPattern {
  currentMonthThisYear: number;
  sameMonthLastYear: number;
  changePercent: number | null; // null when no last-year data
  trend: "increasing" | "decreasing" | "stable" | "no_data";
}

export type Priority = "critical" | "urgent" | "standard";

export interface ReorderRecommendation {
  itemId: string;
  itemName: string;
  ndc: string | null;
  genericName: string | null;
  currentStock: number;
  currentReorderPoint: number | null;
  currentReorderQty: number | null;
  calculatedReorderPoint: number;
  calculatedReorderQty: number;
  eoq: number;
  averageDailyUsage: number;
  leadTimeDays: number;
  safetyStock: number;
  daysOfStockRemaining: number | null;
  priority: Priority;
  priorityScore: number; // 0-100, higher = more urgent
  estimatedCost: number;
  acquisitionCost: number | null;
}

export interface DeadStockItem {
  itemId: string;
  itemName: string;
  ndc: string | null;
  genericName: string | null;
  quantityOnHand: number;
  lastDispensedDate: Date | null;
  daysSinceLastDispensed: number | null;
  acquisitionCost: number | null;
  carryingCost: number; // estimated monthly carrying cost
}

export interface FastMoverItem {
  itemId: string;
  itemName: string;
  ndc: string | null;
  genericName: string | null;
  dailyVelocity: number;
  totalDispensed90: number;
  currentStock: number;
  daysOfStockRemaining: number | null;
  reorderPoint: number | null;
}

export interface CostSavingsEstimate {
  carryingCostReduction: number;
  stockoutPreventionSavings: number;
  deadStockCarryingCost: number;
  totalEstimatedMonthlySavings: number;
}

export interface OptimizationResult {
  analysisDate: Date;
  analysisWindowDays: number;
  totalItemsAnalyzed: number;
  itemsBelowReorderPoint: number;
  deadStockCount: number;
  fastMoverCount: number;
  recommendations: ReorderRecommendation[];
  deadStock: DeadStockItem[];
  fastMovers: FastMoverItem[];
  costSavings: CostSavingsEstimate;
}

export interface ItemAnalysis {
  itemId: string;
  itemName: string;
  ndc: string | null;
  velocity: DispensingVelocity;
  seasonal: SeasonalPattern;
  currentStock: number;
  calculatedReorderPoint: number;
  calculatedReorderQty: number;
  eoq: number;
  safetyStock: number;
  leadTimeDays: number;
  daysOfStockRemaining: number | null;
  recommendation: ReorderRecommendation | null;
  isDeadStock: boolean;
  isFastMover: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LEAD_TIME_DAYS = 3;
const DEFAULT_ANNUAL_CARRYING_RATE = 0.25; // 25% of item cost per year
const ORDERING_COST_PER_ORDER = 15; // estimated cost to place/receive one order
const SERVICE_LEVEL_Z = 1.65; // z-score for ~95% service level
const DEAD_STOCK_THRESHOLD_DAYS = 90;
const FAST_MOVER_PERCENTILE = 0.8; // top 20%
const STOCKOUT_COST_MULTIPLIER = 5; // estimated lost revenue per unit stocked out

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(val: Decimal | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  return Number(val);
}

function roundTo(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Core Analysis Functions
// ---------------------------------------------------------------------------

/**
 * Compute dispensing velocity for a single item across 30/60/90-day windows.
 */
async function computeVelocity(itemId: string): Promise<DispensingVelocity> {
  const now = new Date();
  const d30 = daysAgo(30);
  const d60 = daysAgo(60);
  const d90 = daysAgo(90);

  const [agg30, agg60, agg90] = await Promise.all([
    prisma.prescriptionFill.aggregate({
      where: {
        itemId,
        status: { in: ["dispensed", "completed", "verified", "filled"] },
        createdAt: { gte: d30, lte: now },
      },
      _sum: { quantity: true },
    }),
    prisma.prescriptionFill.aggregate({
      where: {
        itemId,
        status: { in: ["dispensed", "completed", "verified", "filled"] },
        createdAt: { gte: d60, lte: now },
      },
      _sum: { quantity: true },
    }),
    prisma.prescriptionFill.aggregate({
      where: {
        itemId,
        status: { in: ["dispensed", "completed", "verified", "filled"] },
        createdAt: { gte: d90, lte: now },
      },
      _sum: { quantity: true },
    }),
  ]);

  const total30 = toNumber(agg30._sum.quantity);
  const total60 = toNumber(agg60._sum.quantity);
  const total90 = toNumber(agg90._sum.quantity);

  return {
    days30: total30 / 30,
    days60: total60 / 60,
    days90: total90 / 90,
    totalDispensed30: total30,
    totalDispensed60: total60,
    totalDispensed90: total90,
  };
}

/**
 * Compute seasonal pattern by comparing current month vs same month last year.
 */
async function computeSeasonalPattern(
  itemId: string,
): Promise<SeasonalPattern> {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const lastYearMonthStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const lastYearMonthEnd = new Date(
    now.getFullYear() - 1,
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

  const [thisYearAgg, lastYearAgg] = await Promise.all([
    prisma.prescriptionFill.aggregate({
      where: {
        itemId,
        status: { in: ["dispensed", "completed", "verified", "filled"] },
        createdAt: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      _sum: { quantity: true },
    }),
    prisma.prescriptionFill.aggregate({
      where: {
        itemId,
        status: { in: ["dispensed", "completed", "verified", "filled"] },
        createdAt: { gte: lastYearMonthStart, lte: lastYearMonthEnd },
      },
      _sum: { quantity: true },
    }),
  ]);

  const current = toNumber(thisYearAgg._sum.quantity);
  const lastYear = toNumber(lastYearAgg._sum.quantity);

  let changePercent: number | null = null;
  let trend: SeasonalPattern["trend"] = "no_data";

  if (lastYear > 0) {
    changePercent = ((current - lastYear) / lastYear) * 100;
    if (changePercent > 10) trend = "increasing";
    else if (changePercent < -10) trend = "decreasing";
    else trend = "stable";
  } else if (current > 0) {
    trend = "increasing";
  }

  return {
    currentMonthThisYear: current,
    sameMonthLastYear: lastYear,
    changePercent: changePercent !== null ? roundTo(changePercent, 1) : null,
    trend,
  };
}

/**
 * Get current total quantity on hand for an item across all active lots.
 */
async function getCurrentStock(itemId: string): Promise<number> {
  const result = await prisma.itemLot.aggregate({
    where: {
      itemId,
      status: { in: ["available", "active"] },
    },
    _sum: { quantityOnHand: true },
  });
  return toNumber(result._sum.quantityOnHand);
}

/**
 * Get the date an item was last dispensed.
 */
async function getLastDispensedDate(itemId: string): Promise<Date | null> {
  const lastFill = await prisma.prescriptionFill.findFirst({
    where: {
      itemId,
      status: { in: ["dispensed", "completed", "verified", "filled"] },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return lastFill?.createdAt ?? null;
}

/**
 * Get lead time for an item from its supplier, or use the default.
 */
async function getLeadTimeDays(itemId: string): Promise<number> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      supplier: {
        select: { leadTimeDays: true },
      },
    },
  });
  return item?.supplier?.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
}

/**
 * Calculate demand standard deviation from daily dispensing data over a window.
 */
async function computeDemandStdDev(
  itemId: string,
  windowDays: number,
): Promise<number> {
  const since = daysAgo(windowDays);

  const fills = await prisma.prescriptionFill.findMany({
    where: {
      itemId,
      status: { in: ["dispensed", "completed", "verified", "filled"] },
      createdAt: { gte: since },
    },
    select: { quantity: true, createdAt: true },
  });

  if (fills.length === 0) return 0;

  // Aggregate fills into daily buckets
  const dailyMap = new Map<string, number>();
  for (const f of fills) {
    const dayKey = f.createdAt.toISOString().slice(0, 10);
    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + toNumber(f.quantity));
  }

  // Fill in zero-days
  const dailyValues: number[] = [];
  for (let i = 0; i < windowDays; i++) {
    const d = daysAgo(i);
    const key = d.toISOString().slice(0, 10);
    dailyValues.push(dailyMap.get(key) ?? 0);
  }

  const mean = dailyValues.reduce((s, v) => s + v, 0) / dailyValues.length;
  const variance =
    dailyValues.reduce((s, v) => s + (v - mean) ** 2, 0) / dailyValues.length;
  return Math.sqrt(variance);
}

/**
 * Calculate safety stock: z * sigma_demand * sqrt(lead_time)
 */
function calculateSafetyStock(
  demandStdDev: number,
  leadTimeDays: number,
): number {
  return SERVICE_LEVEL_Z * demandStdDev * Math.sqrt(leadTimeDays);
}

/**
 * Calculate reorder point: (avg daily usage * lead time) + safety stock
 */
function calculateReorderPoint(
  avgDailyUsage: number,
  leadTimeDays: number,
  safetyStock: number,
): number {
  return Math.ceil(avgDailyUsage * leadTimeDays + safetyStock);
}

/**
 * Calculate Economic Order Quantity (EOQ):
 * EOQ = sqrt((2 * D * S) / H)
 * D = annual demand, S = ordering cost, H = annual holding cost per unit
 */
function calculateEOQ(
  annualDemand: number,
  orderingCost: number,
  unitCost: number,
): number {
  const holdingCostPerUnit = unitCost * DEFAULT_ANNUAL_CARRYING_RATE;
  if (holdingCostPerUnit <= 0 || annualDemand <= 0) {
    // Fallback: order 30-day supply
    return Math.ceil(annualDemand / 12);
  }
  return Math.ceil(
    Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit),
  );
}

/**
 * Determine priority based on days of stock remaining and reorder point.
 */
function determinePriority(
  currentStock: number,
  reorderPoint: number,
  avgDailyUsage: number,
): { priority: Priority; score: number } {
  if (avgDailyUsage <= 0) {
    return { priority: "standard", score: 10 };
  }

  const daysRemaining = currentStock / avgDailyUsage;
  const ratio = currentStock / Math.max(reorderPoint, 1);

  // Critical: stock out or less than 1 day of supply
  if (currentStock <= 0 || daysRemaining < 1) {
    return { priority: "critical", score: 100 };
  }
  // Critical: below 50% of reorder point
  if (ratio < 0.5) {
    return { priority: "critical", score: 90 };
  }
  // Urgent: below reorder point
  if (currentStock <= reorderPoint) {
    return { priority: "urgent", score: 70 + (1 - ratio) * 20 };
  }
  // Urgent: less than 5 days of supply
  if (daysRemaining < 5) {
    return { priority: "urgent", score: 60 };
  }
  // Standard
  return { priority: "standard", score: Math.max(5, 50 - daysRemaining) };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Full analysis for a single item.
 */
export async function analyzeItem(itemId: string): Promise<ItemAnalysis> {
  const item = await prisma.item.findUniqueOrThrow({
    where: { id: itemId },
    select: {
      id: true,
      name: true,
      ndc: true,
      genericName: true,
      acquisitionCost: true,
      reorderPoint: true,
      reorderQuantity: true,
    },
  });

  const [velocity, seasonal, currentStock, lastDispensed, leadTimeDays, demandStdDev] =
    await Promise.all([
      computeVelocity(itemId),
      computeSeasonalPattern(itemId),
      getCurrentStock(itemId),
      getLastDispensedDate(itemId),
      getLeadTimeDays(itemId),
      computeDemandStdDev(itemId, 90),
    ]);

  // Use weighted average: more recent data weighted higher
  const avgDailyUsage =
    velocity.days30 * 0.5 + velocity.days60 * 0.3 + velocity.days90 * 0.2;
  const unitCost = toNumber(item.acquisitionCost) || 1;
  const annualDemand = avgDailyUsage * 365;

  const safetyStock = calculateSafetyStock(demandStdDev, leadTimeDays);
  const reorderPoint = calculateReorderPoint(avgDailyUsage, leadTimeDays, safetyStock);
  const eoq = calculateEOQ(annualDemand, ORDERING_COST_PER_ORDER, unitCost);
  const daysOfStockRemaining =
    avgDailyUsage > 0 ? roundTo(currentStock / avgDailyUsage, 1) : null;

  const daysSinceDispensed = lastDispensed
    ? Math.floor((Date.now() - lastDispensed.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isDeadStock =
    currentStock > 0 &&
    (daysSinceDispensed === null || daysSinceDispensed >= DEAD_STOCK_THRESHOLD_DAYS);

  // isFastMover will be determined at the batch level in analyzeAllItems
  const isFastMover = false;

  const needsReorder = currentStock <= reorderPoint && avgDailyUsage > 0;
  const { priority, score } = determinePriority(
    currentStock,
    reorderPoint,
    avgDailyUsage,
  );

  const recommendation: ReorderRecommendation | null = needsReorder
    ? {
        itemId: item.id,
        itemName: item.name,
        ndc: item.ndc,
        genericName: item.genericName,
        currentStock,
        currentReorderPoint: toNumber(item.reorderPoint) || null,
        currentReorderQty: toNumber(item.reorderQuantity) || null,
        calculatedReorderPoint: reorderPoint,
        calculatedReorderQty: eoq,
        eoq,
        averageDailyUsage: roundTo(avgDailyUsage, 2),
        leadTimeDays,
        safetyStock: roundTo(safetyStock, 1),
        daysOfStockRemaining,
        priority,
        priorityScore: roundTo(score, 0),
        estimatedCost: roundTo(eoq * unitCost, 2),
        acquisitionCost: toNumber(item.acquisitionCost) || null,
      }
    : null;

  return {
    itemId: item.id,
    itemName: item.name,
    ndc: item.ndc,
    velocity,
    seasonal,
    currentStock,
    calculatedReorderPoint: reorderPoint,
    calculatedReorderQty: eoq,
    eoq,
    safetyStock: roundTo(safetyStock, 1),
    leadTimeDays,
    daysOfStockRemaining,
    recommendation,
    isDeadStock,
    isFastMover,
  };
}

/**
 * Analyze all active items and return the full optimization result.
 */
export async function analyzeAllItems(
  windowDays: number = 90,
  includeDeadStock: boolean = true,
): Promise<OptimizationResult> {
  // Fetch all active items with their lots aggregated
  const items = await prisma.item.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      ndc: true,
      genericName: true,
      acquisitionCost: true,
      reorderPoint: true,
      reorderQuantity: true,
      supplierId: true,
      supplier: {
        select: { leadTimeDays: true },
      },
    },
  });

  const since = daysAgo(windowDays);

  // Batch-fetch dispensing aggregates for all items in the window
  const fillAggregates = await prisma.prescriptionFill.groupBy({
    by: ["itemId"],
    where: {
      status: { in: ["dispensed", "completed", "verified", "filled"] },
      createdAt: { gte: since },
      itemId: { not: null },
    },
    _sum: { quantity: true },
  });

  const fillMap = new Map<string, number>();
  for (const agg of fillAggregates) {
    if (agg.itemId) {
      fillMap.set(agg.itemId, toNumber(agg._sum.quantity));
    }
  }

  // Batch-fetch 30-day aggregates for velocity
  const since30 = daysAgo(30);
  const fillAgg30 = await prisma.prescriptionFill.groupBy({
    by: ["itemId"],
    where: {
      status: { in: ["dispensed", "completed", "verified", "filled"] },
      createdAt: { gte: since30 },
      itemId: { not: null },
    },
    _sum: { quantity: true },
  });
  const fillMap30 = new Map<string, number>();
  for (const agg of fillAgg30) {
    if (agg.itemId) fillMap30.set(agg.itemId, toNumber(agg._sum.quantity));
  }

  // Batch-fetch 60-day aggregates
  const since60 = daysAgo(60);
  const fillAgg60 = await prisma.prescriptionFill.groupBy({
    by: ["itemId"],
    where: {
      status: { in: ["dispensed", "completed", "verified", "filled"] },
      createdAt: { gte: since60 },
      itemId: { not: null },
    },
    _sum: { quantity: true },
  });
  const fillMap60 = new Map<string, number>();
  for (const agg of fillAgg60) {
    if (agg.itemId) fillMap60.set(agg.itemId, toNumber(agg._sum.quantity));
  }

  // Batch-fetch stock on hand per item
  const stockAggregates = await prisma.itemLot.groupBy({
    by: ["itemId"],
    where: {
      status: { in: ["available", "active"] },
    },
    _sum: { quantityOnHand: true },
  });
  const stockMap = new Map<string, number>();
  for (const agg of stockAggregates) {
    stockMap.set(agg.itemId, toNumber(agg._sum.quantityOnHand));
  }

  // Batch-fetch last dispensed date per item
  const lastFills = await prisma.$queryRawUnsafe<
    Array<{ item_id: string; last_dispensed: Date }>
  >(
    `SELECT item_id, MAX(created_at) as last_dispensed
     FROM prescription_fills
     WHERE status IN ('dispensed', 'completed', 'verified', 'filled')
       AND item_id IS NOT NULL
     GROUP BY item_id`,
  );
  const lastDispensedMap = new Map<string, Date>();
  for (const row of lastFills) {
    lastDispensedMap.set(row.item_id, new Date(row.last_dispensed));
  }

  // Process each item
  const recommendations: ReorderRecommendation[] = [];
  const deadStock: DeadStockItem[] = [];
  const allVelocities: Array<{ itemId: string; velocity90: number }> = [];

  for (const item of items) {
    const total30 = fillMap30.get(item.id) ?? 0;
    const total60 = fillMap60.get(item.id) ?? 0;
    const total90 = fillMap.get(item.id) ?? 0;

    const v30 = total30 / 30;
    const v60 = total60 / 60;
    const v90 = total90 / 90;

    // Weighted average daily usage
    const avgDailyUsage = v30 * 0.5 + v60 * 0.3 + v90 * 0.2;
    const currentStock = stockMap.get(item.id) ?? 0;
    const unitCost = toNumber(item.acquisitionCost) || 1;
    const leadTimeDays = item.supplier?.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;

    // Simple std dev estimate from 30 vs 90 day velocity
    const demandVariation = Math.abs(v30 - v90);
    const safetyStock = SERVICE_LEVEL_Z * demandVariation * Math.sqrt(leadTimeDays);
    const reorderPoint = calculateReorderPoint(avgDailyUsage, leadTimeDays, safetyStock);
    const annualDemand = avgDailyUsage * 365;
    const eoq = calculateEOQ(annualDemand, ORDERING_COST_PER_ORDER, unitCost);

    const daysOfStockRemaining =
      avgDailyUsage > 0 ? roundTo(currentStock / avgDailyUsage, 1) : null;

    // Track velocity for fast mover calculation
    allVelocities.push({ itemId: item.id, velocity90: total90 });

    // Check if needs reorder
    if (currentStock <= reorderPoint && avgDailyUsage > 0) {
      const { priority, score } = determinePriority(
        currentStock,
        reorderPoint,
        avgDailyUsage,
      );
      recommendations.push({
        itemId: item.id,
        itemName: item.name,
        ndc: item.ndc,
        genericName: item.genericName,
        currentStock,
        currentReorderPoint: toNumber(item.reorderPoint) || null,
        currentReorderQty: toNumber(item.reorderQuantity) || null,
        calculatedReorderPoint: reorderPoint,
        calculatedReorderQty: eoq,
        eoq,
        averageDailyUsage: roundTo(avgDailyUsage, 2),
        leadTimeDays,
        safetyStock: roundTo(safetyStock, 1),
        daysOfStockRemaining,
        priority,
        priorityScore: roundTo(score, 0),
        estimatedCost: roundTo(eoq * unitCost, 2),
        acquisitionCost: toNumber(item.acquisitionCost) || null,
      });
    }

    // Check dead stock
    if (includeDeadStock && currentStock > 0) {
      const lastDate = lastDispensedMap.get(item.id) ?? null;
      const daysSince = lastDate
        ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      if (daysSince === null || daysSince >= DEAD_STOCK_THRESHOLD_DAYS) {
        const monthlyCarryingCost = roundTo(
          currentStock * unitCost * (DEFAULT_ANNUAL_CARRYING_RATE / 12),
          2,
        );
        deadStock.push({
          itemId: item.id,
          itemName: item.name,
          ndc: item.ndc,
          genericName: item.genericName,
          quantityOnHand: currentStock,
          lastDispensedDate: lastDate,
          daysSinceLastDispensed: daysSince,
          acquisitionCost: toNumber(item.acquisitionCost) || null,
          carryingCost: monthlyCarryingCost,
        });
      }
    }
  }

  // Sort recommendations by priority score descending
  recommendations.sort((a, b) => b.priorityScore - a.priorityScore);

  // Dead stock sorted by carrying cost descending
  deadStock.sort((a, b) => b.carryingCost - a.carryingCost);

  // Determine fast movers (top 20% by 90-day dispensing volume)
  const sortedVelocities = [...allVelocities]
    .filter((v) => v.velocity90 > 0)
    .sort((a, b) => b.velocity90 - a.velocity90);

  const fastMoverThresholdIndex = Math.ceil(
    sortedVelocities.length * (1 - FAST_MOVER_PERCENTILE),
  );
  const fastMoverIds = new Set(
    sortedVelocities.slice(0, fastMoverThresholdIndex).map((v) => v.itemId),
  );

  const fastMovers: FastMoverItem[] = [];
  for (const v of sortedVelocities.slice(0, fastMoverThresholdIndex)) {
    const item = items.find((i) => i.id === v.itemId)!;
    const currentStock = stockMap.get(v.itemId) ?? 0;
    const avgDailyUsage = v.velocity90 / 90;
    fastMovers.push({
      itemId: item.id,
      itemName: item.name,
      ndc: item.ndc,
      genericName: item.genericName,
      dailyVelocity: roundTo(avgDailyUsage, 2),
      totalDispensed90: v.velocity90,
      currentStock,
      daysOfStockRemaining:
        avgDailyUsage > 0 ? roundTo(currentStock / avgDailyUsage, 1) : null,
      reorderPoint: toNumber(item.reorderPoint) || null,
    });
  }

  // Cost savings estimates
  const totalDeadStockCarrying = deadStock.reduce(
    (sum, d) => sum + d.carryingCost,
    0,
  );
  const stockoutItems = recommendations.filter(
    (r) => r.priority === "critical",
  );
  const stockoutPreventionSavings =
    stockoutItems.reduce(
      (sum, r) => sum + r.averageDailyUsage * (r.acquisitionCost ?? 1) * STOCKOUT_COST_MULTIPLIER,
      0,
    ) * 30; // monthly estimate

  // Carrying cost reduction from EOQ optimization
  const carryingCostReduction = recommendations.reduce((sum, r) => {
    const currentAvgInventory = ((r.currentReorderQty ?? r.calculatedReorderQty) / 2);
    const optimalAvgInventory = r.calculatedReorderQty / 2;
    const savings =
      (currentAvgInventory - optimalAvgInventory) *
      (r.acquisitionCost ?? 1) *
      (DEFAULT_ANNUAL_CARRYING_RATE / 12);
    return sum + Math.max(0, savings);
  }, 0);

  const costSavings: CostSavingsEstimate = {
    carryingCostReduction: roundTo(carryingCostReduction, 2),
    stockoutPreventionSavings: roundTo(stockoutPreventionSavings, 2),
    deadStockCarryingCost: roundTo(totalDeadStockCarrying, 2),
    totalEstimatedMonthlySavings: roundTo(
      carryingCostReduction + stockoutPreventionSavings,
      2,
    ),
  };

  return {
    analysisDate: new Date(),
    analysisWindowDays: windowDays,
    totalItemsAnalyzed: items.length,
    itemsBelowReorderPoint: recommendations.length,
    deadStockCount: deadStock.length,
    fastMoverCount: fastMovers.length,
    recommendations,
    deadStock,
    fastMovers,
    costSavings,
  };
}

/**
 * Convenience: get just the reorder recommendations.
 */
export async function getReorderRecommendations(
  windowDays: number = 90,
): Promise<ReorderRecommendation[]> {
  const result = await analyzeAllItems(windowDays, false);
  return result.recommendations;
}

/**
 * Convenience: get just the dead stock items.
 */
export async function getDeadStock(): Promise<DeadStockItem[]> {
  const result = await analyzeAllItems(90, true);
  return result.deadStock;
}

/**
 * Convenience: get just the fast movers.
 */
export async function getFastMovers(): Promise<FastMoverItem[]> {
  const result = await analyzeAllItems(90, false);
  return result.fastMovers;
}
