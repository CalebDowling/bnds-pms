// @ts-nocheck
/**
 * Controlled Substance Perpetual Inventory Ledger
 *
 * CS Manager-style perpetual inventory engine for DEA-controlled substances.
 * Tracks every unit of every Schedule II-V drug from receipt through dispensing,
 * destruction, loss, and adjustment.  Provides balance computation, discrepancy
 * detection, DEA Form 222 data generation, and biennial inventory reporting.
 */

import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Transaction types stored in InventoryTransaction.transactionType */
export type CSTransactionType =
  | 'cs_receipt'
  | 'cs_dispense'
  | 'cs_return_to_stock'
  | 'cs_destruction'
  | 'cs_loss'
  | 'cs_adjustment'
  | 'cs_physical_count';

/** A single controlled-substance ledger entry */
export interface CSTransaction {
  id: string;
  itemId: string;
  itemName: string;
  ndc: string;
  deaSchedule: number;
  transactionType: CSTransactionType;
  /** Positive for additions (receipt, return-to-stock, positive adjustment), negative for removals */
  quantity: number;
  runningBalance: number;
  referenceType: string | null;
  referenceId: string | null;
  performedBy: string | null;
  performedByName: string | null;
  notes: string | null;
  createdAt: Date;
}

/** Current balance snapshot for a controlled substance item */
export interface CSBalance {
  itemId: string;
  itemName: string;
  ndc: string;
  deaSchedule: number;
  strength: string | null;
  dosageForm: string | null;
  /** Calculated balance = sum(receipts + returns + positive adj) - sum(dispenses + destructions + losses + negative adj) */
  calculatedBalance: number;
  /** Most recent physical count, if any */
  lastPhysicalCount: number | null;
  lastPhysicalCountDate: Date | null;
  lastPhysicalCountBy: string | null;
  /** calculatedBalance - lastPhysicalCount; null if no physical count on record */
  discrepancy: number | null;
  lastTransactionDate: Date | null;
  totalReceipts: number;
  totalDispenses: number;
  totalDestructions: number;
  totalLosses: number;
  totalAdjustments: number;
  totalReturns: number;
}

/** Biennial inventory line item */
export interface BiennialLineItem {
  itemId: string;
  itemName: string;
  ndc: string;
  deaSchedule: number;
  dosageForm: string | null;
  strength: string | null;
  unit: string | null;
  quantityOnHand: number;
  dateCounted: Date | null;
  countedBy: string | null;
}

/** DEA Form 222 line item (Schedule II ordering) */
export interface DEA222LineItem {
  itemName: string;
  ndc: string;
  strength: string | null;
  dosageForm: string | null;
  quantityOrdered: number;
  currentBalance: number;
  parLevel: number | null;
}

// ---------------------------------------------------------------------------
// Helpers — signed quantity by transaction type
// ---------------------------------------------------------------------------

const ADDITIVE_TYPES: CSTransactionType[] = [
  'cs_receipt',
  'cs_return_to_stock',
];

const SUBTRACTIVE_TYPES: CSTransactionType[] = [
  'cs_dispense',
  'cs_destruction',
  'cs_loss',
];

/**
 * Returns the signed quantity for a transaction.
 * Receipts/returns are positive, dispenses/destructions/losses are negative.
 * Adjustments and physical counts carry their own sign (positive = add, negative = subtract).
 */
function signedQuantity(type: CSTransactionType, qty: number): number {
  if (ADDITIVE_TYPES.includes(type)) return Math.abs(qty);
  if (SUBTRACTIVE_TYPES.includes(type)) return -Math.abs(qty);
  // cs_adjustment, cs_physical_count — preserve sign as entered
  return qty;
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Record a controlled-substance transaction and return the new running balance.
 */
export async function recordTransaction(params: {
  itemId: string;
  transactionType: CSTransactionType;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  performedBy?: string;
  notes?: string;
}): Promise<{ transactionId: string; newBalance: number }> {
  const {
    itemId,
    transactionType,
    quantity,
    referenceType,
    referenceId,
    performedBy,
    notes,
  } = params;

  const signed = signedQuantity(transactionType, quantity);

  // Find (or create) the primary ItemLot for this item to anchor the transaction
  let itemLot = await prisma.itemLot.findFirst({
    where: { itemId },
    orderBy: { createdAt: 'desc' },
  });

  if (!itemLot) {
    // Create a default lot for CS tracking purposes
    itemLot = await prisma.itemLot.create({
      data: {
        itemId,
        lotNumber: 'CS-DEFAULT',
        quantityOnHand: 0,
        expirationDate: new Date('2099-12-31'),
      },
    });
  }

  const tx = await prisma.inventoryTransaction.create({
    data: {
      itemLotId: itemLot.id,
      transactionType,
      quantity: signed,
      referenceType: referenceType ?? null,
      referenceId: referenceId ?? null,
      performedBy: performedBy ?? null,
      notes: notes ?? null,
    },
  });

  // Compute new running balance
  const balance = await computeBalance(itemId);

  return { transactionId: tx.id, newBalance: balance };
}

/**
 * Compute the current calculated balance for an item by summing all CS transactions.
 */
async function computeBalance(itemId: string): Promise<number> {
  const lots = await prisma.itemLot.findMany({
    where: { itemId },
    select: { id: true },
  });
  const lotIds = lots.map((l: any) => l.id);
  if (lotIds.length === 0) return 0;

  const result = await prisma.inventoryTransaction.aggregate({
    where: {
      itemLotId: { in: lotIds },
      transactionType: {
        in: [
          'cs_receipt',
          'cs_dispense',
          'cs_return_to_stock',
          'cs_destruction',
          'cs_loss',
          'cs_adjustment',
        ],
      },
    },
    _sum: { quantity: true },
  });

  return result._sum.quantity ?? 0;
}

/**
 * Get the current running balance for a single controlled-substance item.
 */
export async function getRunningBalance(itemId: string): Promise<CSBalance> {
  const item = await prisma.item.findUniqueOrThrow({
    where: { id: itemId },
  });

  const lots = await prisma.itemLot.findMany({
    where: { itemId },
    select: { id: true },
  });
  const lotIds = lots.map((l: any) => l.id);

  // Aggregate by type
  const aggregates = await prisma.inventoryTransaction.groupBy({
    by: ['transactionType'],
    where: {
      itemLotId: { in: lotIds },
      transactionType: { startsWith: 'cs_' },
    },
    _sum: { quantity: true },
  });

  let totalReceipts = 0;
  let totalDispenses = 0;
  let totalDestructions = 0;
  let totalLosses = 0;
  let totalAdjustments = 0;
  let totalReturns = 0;

  for (const agg of aggregates) {
    const sum = Math.abs(agg._sum.quantity ?? 0);
    switch (agg.transactionType) {
      case 'cs_receipt':
        totalReceipts = sum;
        break;
      case 'cs_dispense':
        totalDispenses = sum;
        break;
      case 'cs_destruction':
        totalDestructions = sum;
        break;
      case 'cs_loss':
        totalLosses = sum;
        break;
      case 'cs_adjustment':
        totalAdjustments = agg._sum.quantity ?? 0; // preserve sign for net
        break;
      case 'cs_return_to_stock':
        totalReturns = sum;
        break;
    }
  }

  const calculatedBalance =
    totalReceipts + totalReturns + totalAdjustments - totalDispenses - totalDestructions - totalLosses;

  // Last physical count
  const lastCount = await prisma.inventoryTransaction.findFirst({
    where: {
      itemLotId: { in: lotIds },
      transactionType: 'cs_physical_count',
    },
    orderBy: { createdAt: 'desc' },
  });

  // Last transaction (any CS type)
  const lastTx = await prisma.inventoryTransaction.findFirst({
    where: {
      itemLotId: { in: lotIds },
      transactionType: { startsWith: 'cs_' },
    },
    orderBy: { createdAt: 'desc' },
  });

  const lastPhysicalCount = lastCount ? lastCount.quantity : null;
  const lastPhysicalCountDate = lastCount ? lastCount.createdAt : null;
  const lastPhysicalCountBy = lastCount ? lastCount.performedBy : null;

  return {
    itemId: item.id,
    itemName: item.name,
    ndc: item.ndc ?? '',
    deaSchedule: item.deaSchedule ?? 0,
    strength: item.strength ?? null,
    dosageForm: item.dosageForm ?? null,
    calculatedBalance,
    lastPhysicalCount,
    lastPhysicalCountDate,
    lastPhysicalCountBy,
    discrepancy:
      lastPhysicalCount !== null
        ? calculatedBalance - lastPhysicalCount
        : null,
    lastTransactionDate: lastTx?.createdAt ?? null,
    totalReceipts,
    totalDispenses,
    totalDestructions,
    totalLosses,
    totalAdjustments,
    totalReturns,
  };
}

/**
 * Get balances for ALL controlled-substance items in the pharmacy.
 */
export async function getBalanceForAllControlled(): Promise<CSBalance[]> {
  const items = await prisma.item.findMany({
    where: { isControlled: true },
    orderBy: [{ deaSchedule: 'asc' }, { name: 'asc' }],
  });

  const balances: CSBalance[] = [];
  for (const item of items) {
    const balance = await getRunningBalance(item.id);
    balances.push(balance);
  }

  return balances;
}

/**
 * Get the full transaction history for an item within an optional date range.
 * Returns transactions with running balance computed at each step.
 */
export async function getTransactionHistory(
  itemId: string,
  dateRange?: { from: Date; to: Date }
): Promise<CSTransaction[]> {
  const item = await prisma.item.findUniqueOrThrow({
    where: { id: itemId },
  });

  const lots = await prisma.itemLot.findMany({
    where: { itemId },
    select: { id: true },
  });
  const lotIds = lots.map((l: any) => l.id);
  if (lotIds.length === 0) return [];

  const where: Record<string, unknown> = {
    itemLotId: { in: lotIds },
    transactionType: { startsWith: 'cs_' },
  };

  if (dateRange) {
    where.createdAt = {
      gte: dateRange.from,
      lte: dateRange.to,
    };
  }

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: {
      performer: {
        select: { name: true },
      },
    },
  });

  // Compute running balance at each step
  // If we have a date range, we need the balance BEFORE the range starts
  let runningBalance = 0;
  if (dateRange) {
    const priorResult = await prisma.inventoryTransaction.aggregate({
      where: {
        itemLotId: { in: lotIds },
        transactionType: {
          in: [
            'cs_receipt',
            'cs_dispense',
            'cs_return_to_stock',
            'cs_destruction',
            'cs_loss',
            'cs_adjustment',
          ],
        },
        createdAt: { lt: dateRange.from },
      },
      _sum: { quantity: true },
    });
    runningBalance = priorResult._sum.quantity ?? 0;
  }

  return transactions.map((tx: any) => {
    // Only non-physical-count types affect the running balance
    if (tx.transactionType !== 'cs_physical_count') {
      runningBalance += tx.quantity;
    }
    return {
      id: tx.id,
      itemId,
      itemName: item.name,
      ndc: item.ndc ?? '',
      deaSchedule: item.deaSchedule ?? 0,
      transactionType: tx.transactionType as CSTransactionType,
      quantity: tx.quantity,
      runningBalance,
      referenceType: tx.referenceType,
      referenceId: tx.referenceId,
      performedBy: tx.performedBy,
      performedByName: (tx as Record<string, unknown>).performer
        ? ((tx as Record<string, unknown>).performer as { name: string }).name
        : null,
      notes: tx.notes,
      createdAt: tx.createdAt,
    };
  });
}

/**
 * Detect all items where calculated balance differs from last physical count.
 */
export async function detectDiscrepancies(): Promise<CSBalance[]> {
  const all = await getBalanceForAllControlled();
  return all.filter(
    (b) => b.discrepancy !== null && b.discrepancy !== 0
  );
}

/**
 * Generate biennial inventory report data as of a given date.
 * Per DEA requirements, biennial inventory must list every controlled substance,
 * its form, strength, and quantity on hand.
 */
export async function generateBiennialReport(
  asOfDate: Date
): Promise<BiennialLineItem[]> {
  const items = await prisma.item.findMany({
    where: { isControlled: true },
    orderBy: [{ deaSchedule: 'asc' }, { name: 'asc' }],
  });

  const report: BiennialLineItem[] = [];

  for (const item of items) {
    const lots = await prisma.itemLot.findMany({
      where: { itemId: item.id },
      select: { id: true },
    });
    const lotIds = lots.map((l: any) => l.id);

    // Calculate balance as of the given date
    let quantityOnHand = 0;
    if (lotIds.length > 0) {
      const result = await prisma.inventoryTransaction.aggregate({
        where: {
          itemLotId: { in: lotIds },
          transactionType: {
            in: [
              'cs_receipt',
              'cs_dispense',
              'cs_return_to_stock',
              'cs_destruction',
              'cs_loss',
              'cs_adjustment',
            ],
          },
          createdAt: { lte: asOfDate },
        },
        _sum: { quantity: true },
      });
      quantityOnHand = result._sum.quantity ?? 0;
    }

    // Last physical count before asOfDate
    const lastCount = lotIds.length > 0
      ? await prisma.inventoryTransaction.findFirst({
          where: {
            itemLotId: { in: lotIds },
            transactionType: 'cs_physical_count',
            createdAt: { lte: asOfDate },
          },
          orderBy: { createdAt: 'desc' },
        })
      : null;

    report.push({
      itemId: item.id,
      itemName: item.name,
      ndc: item.ndc ?? '',
      deaSchedule: item.deaSchedule ?? 0,
      dosageForm: item.dosageForm ?? null,
      strength: item.strength ?? null,
      unit: item.unitOfMeasure ?? null,
      quantityOnHand,
      dateCounted: lastCount?.createdAt ?? null,
      countedBy: lastCount?.performedBy ?? null,
    });
  }

  return report;
}

/**
 * Generate DEA Form 222 data for Schedule II items that need reordering.
 * Items are included if their balance is at or below 25% of par level,
 * or if they have zero balance.
 */
export async function generateDEA222Data(): Promise<DEA222LineItem[]> {
  const items = await prisma.item.findMany({
    where: {
      isControlled: true,
      deaSchedule: 2,
    },
    orderBy: { name: 'asc' },
  });

  const lines: DEA222LineItem[] = [];

  for (const item of items) {
    const lots = await prisma.itemLot.findMany({
      where: { itemId: item.id },
      select: { id: true },
    });
    const lotIds = lots.map((l: any) => l.id);

    let currentBalance = 0;
    if (lotIds.length > 0) {
      const result = await prisma.inventoryTransaction.aggregate({
        where: {
          itemLotId: { in: lotIds },
          transactionType: {
            in: [
              'cs_receipt',
              'cs_dispense',
              'cs_return_to_stock',
              'cs_destruction',
              'cs_loss',
              'cs_adjustment',
            ],
          },
        },
        _sum: { quantity: true },
      });
      currentBalance = result._sum.quantity ?? 0;
    }

    const parLevel = item.parLevel ?? 0;
    const reorderPoint = parLevel * 0.25;

    if (currentBalance <= reorderPoint) {
      lines.push({
        itemName: item.name,
        ndc: item.ndc ?? '',
        strength: item.strength ?? null,
        dosageForm: item.dosageForm ?? null,
        quantityOrdered: Math.max(parLevel - currentBalance, 0),
        currentBalance,
        parLevel,
      });
    }
  }

  return lines;
}
