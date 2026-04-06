'use server';

import {
  recordPsePurchase,
  checkPseLimits,
  getPseHistory,
  getPseReport,
  blockBuyer as blockBuyerCore,
  generateNplexSubmissionData,
  calculateGramEquivalent,
  getPseProductList,
  type PsePurchaseRecord,
  type PseLimitCheck,
  type PseReport,
  type NplexSubmission,
  type IdType,
} from '@/lib/compliance/pse-tracking';

// ---------------------------------------------------------------------------
// Dashboard data
// ---------------------------------------------------------------------------

export interface PseDashboardData {
  report: PseReport;
  productList: { name: string; gramsPerPackage: number }[];
}

export async function getPseDashboard(
  startDate: string,
  endDate: string
): Promise<PseDashboardData> {
  const report = await getPseReport(startDate, endDate);
  const productList = getPseProductList();
  return { report, productList };
}

// ---------------------------------------------------------------------------
// Record a sale
// ---------------------------------------------------------------------------

export interface RecordSaleInput {
  buyerName: string;
  buyerDob: string;
  buyerAddress: { street: string; city: string; state: string; zip: string };
  idType: IdType;
  idNumber: string;
  idState: string;
  productName: string;
  packageCount: number;
  quantityGrams: number;
}

export interface RecordSaleResult {
  success: boolean;
  record?: PsePurchaseRecord;
  error?: string;
}

export async function recordSale(data: RecordSaleInput): Promise<RecordSaleResult> {
  try {
    // Validate required fields
    if (!data.buyerName?.trim()) return { success: false, error: 'Buyer name is required' };
    if (!data.buyerDob) return { success: false, error: 'Date of birth is required' };
    if (!data.idNumber?.trim()) return { success: false, error: 'ID number is required' };
    if (!data.productName?.trim()) return { success: false, error: 'Product name is required' };
    if (data.quantityGrams <= 0) return { success: false, error: 'Quantity must be greater than zero' };
    if (!data.buyerAddress?.street?.trim()) return { success: false, error: 'Street address is required' };
    if (!data.buyerAddress?.city?.trim()) return { success: false, error: 'City is required' };
    if (!data.buyerAddress?.state?.trim()) return { success: false, error: 'State is required' };
    if (!data.buyerAddress?.zip?.trim()) return { success: false, error: 'ZIP code is required' };

    const record = await recordPsePurchase(data);
    return { success: true, record };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to record PSE sale';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Search buyer
// ---------------------------------------------------------------------------

export interface BuyerSearchResult {
  records: PsePurchaseRecord[];
  limits: PseLimitCheck | null;
}

export async function searchBuyer(query: string): Promise<BuyerSearchResult> {
  if (!query?.trim()) return { records: [], limits: null };

  // Search last 365 days
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const records = await getPseHistory({
    startDate: yearAgo.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
    buyerSearch: query,
  });

  // If we found records, compute limits for the first matching buyer
  let limits: PseLimitCheck | null = null;
  if (records.length > 0) {
    const buyer = records[0];
    limits = await checkPseLimits(buyer.buyerName, buyer.buyerDob, buyer.idNumber, 0);
  }

  return { records, limits };
}

// ---------------------------------------------------------------------------
// Limit check (pre-sale)
// ---------------------------------------------------------------------------

export async function checkBuyerLimits(
  buyerName: string,
  buyerDob: string,
  idNumber: string,
  requestedGrams: number
): Promise<PseLimitCheck> {
  return checkPseLimits(buyerName, buyerDob, idNumber, requestedGrams);
}

// ---------------------------------------------------------------------------
// Gram equivalent calculation
// ---------------------------------------------------------------------------

export async function calcGramEquivalent(
  productName: string,
  packageCount: number
): Promise<number> {
  return calculateGramEquivalent(productName, packageCount);
}

// ---------------------------------------------------------------------------
// NPLEx report
// ---------------------------------------------------------------------------

export async function generateNplexReport(
  startDate: string,
  endDate: string
): Promise<NplexSubmission[]> {
  const records = await getPseHistory({ startDate, endDate });
  return generateNplexSubmissionData(records);
}

// ---------------------------------------------------------------------------
// Block buyer
// ---------------------------------------------------------------------------

export interface BlockBuyerResult {
  success: boolean;
  error?: string;
}

export async function blockBuyerAction(
  buyerInfo: { buyerName: string; buyerDob: string; idNumber: string },
  reason: string
): Promise<BlockBuyerResult> {
  try {
    if (!reason?.trim()) return { success: false, error: 'Block reason is required' };
    await blockBuyerCore(buyerInfo, reason);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to block buyer';
    return { success: false, error: message };
  }
}
