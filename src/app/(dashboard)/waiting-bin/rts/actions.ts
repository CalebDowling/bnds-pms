"use server";

import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  getRtsCandidates,
  processRts,
  processBatchRts,
  getRtsHistory,
  type RtsCandidate,
  type RtsProcessResult,
  type RtsBatchResult,
  type RtsHistoryEntry,
} from "@/lib/workflow/return-to-stock";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface RtsDashboardData {
  candidates: RtsCandidate[];
  stats: {
    candidateCount: number;
    processedToday: number;
    claimsToReverse: number;
    totalCopayValue: number;
  };
}

// ═══════════════════════════════════════════════
// GET RTS DASHBOARD
// ═══════════════════════════════════════════════

export async function getRtsDashboard(
  daysThreshold: number = 14
): Promise<RtsDashboardData> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const candidates = await getRtsCandidates(daysThreshold);

  // Get today's processed returns
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const history = await getRtsHistory({ from: today, to: tomorrow });

  const claimsToReverse = candidates.filter((c) => c.claimId !== null).length;
  const totalCopayValue = candidates.reduce((sum, c) => sum + c.copayAmount, 0);

  return {
    candidates,
    stats: {
      candidateCount: candidates.length,
      processedToday: history.length,
      claimsToReverse,
      totalCopayValue: Math.round(totalCopayValue * 100) / 100,
    },
  };
}

// ═══════════════════════════════════════════════
// PROCESS SINGLE RETURN
// ═══════════════════════════════════════════════

export async function processReturn(
  fillId: string
): Promise<RtsProcessResult> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const result = await processRts(fillId, user.id);

  revalidatePath("/waiting-bin/rts");
  revalidatePath("/waiting-bin");

  return result;
}

// ═══════════════════════════════════════════════
// PROCESS BATCH RETURN
// ═══════════════════════════════════════════════

export async function processBatchReturn(
  fillIds: string[]
): Promise<RtsBatchResult> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  if (fillIds.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  const result = await processBatchRts(fillIds, user.id);

  revalidatePath("/waiting-bin/rts");
  revalidatePath("/waiting-bin");

  return result;
}

// ═══════════════════════════════════════════════
// GET RTS HISTORY
// ═══════════════════════════════════════════════

export async function getRtsHistoryAction(
  dateRange?: { from: string; to: string }
): Promise<RtsHistoryEntry[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const range = dateRange
    ? { from: new Date(dateRange.from), to: new Date(dateRange.to) }
    : undefined;

  return getRtsHistory(range);
}
