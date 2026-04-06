// @ts-nocheck -- TODO: add proper types to replace this flag
'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  getBalanceForAllControlled,
  getTransactionHistory,
  getRunningBalance,
  detectDiscrepancies,
  generateBiennialReport,
  recordTransaction as ledgerRecordTransaction,
  type CSBalance,
  type CSTransaction,
  type CSTransactionType,
  type BiennialLineItem,
} from '@/lib/compliance/controlled-substance-ledger';

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface CSDashboardData {
  items: CSBalance[];
  totalControlledItems: number;
  itemsWithDiscrepancies: number;
  scheduleIICount: number;
  transactionsToday: number;
}

/**
 * Fetch the full controlled-substances dashboard: all items with balances,
 * summary counts, and today's transaction count.
 */
export async function getControlledSubstancesDashboard(): Promise<CSDashboardData> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const items = await getBalanceForAllControlled();

  const discrepancies = items.filter(
    (b) => b.discrepancy !== null && b.discrepancy !== 0
  );

  const scheduleII = items.filter((b) => b.deaSchedule === 2);

  // Count today's CS transactions
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const transactionsToday = await prisma.inventoryTransaction.count({
    where: {
      transactionType: { startsWith: 'cs_' },
      createdAt: { gte: todayStart, lte: todayEnd },
    },
  });

  return {
    items,
    totalControlledItems: items.length,
    itemsWithDiscrepancies: discrepancies.length,
    scheduleIICount: scheduleII.length,
    transactionsToday,
  };
}

// ---------------------------------------------------------------------------
// Item Ledger
// ---------------------------------------------------------------------------

export interface ItemLedgerData {
  balance: CSBalance;
  transactions: CSTransaction[];
}

/**
 * Fetch the full transaction ledger for a single controlled substance item.
 */
export async function getItemLedger(
  itemId: string,
  dateRange?: { from: string; to: string }
): Promise<ItemLedgerData> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const balance = await getRunningBalance(itemId);

  const range = dateRange
    ? { from: new Date(dateRange.from), to: new Date(dateRange.to) }
    : undefined;

  const transactions = await getTransactionHistory(itemId, range);

  return { balance, transactions };
}

// ---------------------------------------------------------------------------
// Physical Count
// ---------------------------------------------------------------------------

/**
 * Record a physical inventory count for a controlled substance.
 * This creates a cs_physical_count transaction and flags any discrepancy.
 */
export async function recordPhysicalCount(
  itemId: string,
  count: number,
  notes?: string
): Promise<{ success: boolean; discrepancy: number | null }> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Record the physical count as a transaction (does not change running balance)
  await ledgerRecordTransaction({
    itemId,
    transactionType: 'cs_physical_count',
    quantity: count,
    referenceType: 'physical_count',
    performedBy: user.id,
    notes: notes ?? `Physical count: ${count} units`,
  });

  // Get current calculated balance to determine discrepancy
  const balance = await getRunningBalance(itemId);
  const discrepancy = balance.calculatedBalance - count;

  // If there is a discrepancy, log it as an audit event
  if (discrepancy !== 0) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CS_COUNT_DISCREPANCY',
        resource: 'ControlledSubstance',
        resourceId: itemId,
        details: JSON.stringify({
          calculatedBalance: balance.calculatedBalance,
          physicalCount: count,
          discrepancy,
          itemName: balance.itemName,
          ndc: balance.ndc,
          deaSchedule: balance.deaSchedule,
        }),
        ipAddress: '',
      },
    });
  }

  return { success: true, discrepancy: discrepancy !== 0 ? discrepancy : null };
}

// ---------------------------------------------------------------------------
// Manual Transaction Entry
// ---------------------------------------------------------------------------

/**
 * Record a manual controlled-substance transaction (receipt, destruction, loss, adjustment, etc.).
 */
export async function recordManualTransaction(
  itemId: string,
  type: CSTransactionType,
  quantity: number,
  reference?: string,
  notes?: string
): Promise<{ success: boolean; newBalance: number }> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const result = await ledgerRecordTransaction({
    itemId,
    transactionType: type,
    quantity,
    referenceType: type.replace('cs_', ''),
    referenceId: reference ?? undefined,
    performedBy: user.id,
    notes,
  });

  // Audit log for all manual CS transactions
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: `CS_TRANSACTION_${type.toUpperCase()}`,
      resource: 'ControlledSubstance',
      resourceId: itemId,
      details: JSON.stringify({
        transactionType: type,
        quantity,
        reference,
        notes,
        newBalance: result.newBalance,
      }),
      ipAddress: '',
    },
  });

  return { success: true, newBalance: result.newBalance };
}

// ---------------------------------------------------------------------------
// Biennial Report
// ---------------------------------------------------------------------------

/**
 * Generate a DEA biennial inventory report as of a given date.
 */
export async function getBiennialReport(
  asOfDate: string
): Promise<BiennialLineItem[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  return generateBiennialReport(new Date(asOfDate));
}

// ---------------------------------------------------------------------------
// Discrepancies
// ---------------------------------------------------------------------------

/**
 * Get all controlled substance items with balance discrepancies.
 */
export async function getDiscrepancies(): Promise<CSBalance[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  return detectDiscrepancies();
}
