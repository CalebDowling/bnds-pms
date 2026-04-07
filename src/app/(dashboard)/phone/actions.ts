"use server";

import type {
  ActiveCall,
  CallRecord,
  CallReason,
  CallStats,
  HoldQueueEntry,
  TransferTarget,
} from "@/lib/communications/call-manager";

// ---------------------------------------------------------------------------
// Types re-exported for the UI
// ---------------------------------------------------------------------------

export type {
  ActiveCall,
  CallRecord,
  CallReason,
  CallStats,
  HoldQueueEntry,
  TransferTarget,
};

export interface PhoneDashboard {
  activeCalls: ActiveCall[];
  holdQueue: HoldQueueEntry[];
  stats: CallStats;
}

export interface CallHistoryResult {
  records: CallRecord[];
  total: number;
}

export interface PatientMatch {
  patientId: string;
  patientName: string;
  patientMrn: string;
}

// ---------------------------------------------------------------------------
// Dashboard -- aggregate active calls, hold queue, and stats
// ---------------------------------------------------------------------------

export async function getPhoneDashboard(): Promise<PhoneDashboard> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const {
    getActiveCalls,
    getHoldQueue,
    getCallStats,
  } = await import("@/lib/communications/call-manager");

  const [activeCalls, holdQueue, stats] = await Promise.all([
    Promise.resolve(getActiveCalls()),
    Promise.resolve(getHoldQueue()),
    getCallStats(),
  ]);

  return { activeCalls, holdQueue, stats };
}

// ---------------------------------------------------------------------------
// Hold call
// ---------------------------------------------------------------------------

export async function holdCallAction(
  callSid: string
): Promise<{ success: boolean; error?: string }> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { holdCall } = await import("@/lib/communications/call-manager");
  return holdCall(callSid);
}

// ---------------------------------------------------------------------------
// Retrieve call from hold
// ---------------------------------------------------------------------------

export async function retrieveCallAction(
  callSid: string
): Promise<{ success: boolean; error?: string }> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { retrieveCall } = await import("@/lib/communications/call-manager");
  return retrieveCall(callSid);
}

// ---------------------------------------------------------------------------
// Transfer call
// ---------------------------------------------------------------------------

export async function transferCallAction(
  callSid: string,
  target: TransferTarget
): Promise<{ success: boolean; error?: string }> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { transferCall } = await import("@/lib/communications/call-manager");
  return transferCall(callSid, target);
}

// ---------------------------------------------------------------------------
// End call
// ---------------------------------------------------------------------------

export async function endCallAction(
  callSid: string
): Promise<{ success: boolean; error?: string }> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { endCall } = await import("@/lib/communications/call-manager");
  return endCall(callSid);
}

// ---------------------------------------------------------------------------
// Call history with filters
// ---------------------------------------------------------------------------

export async function getCallHistoryAction(options?: {
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<CallHistoryResult> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { getCallHistory } = await import("@/lib/communications/call-manager");
  return getCallHistory(options ?? {});
}

// ---------------------------------------------------------------------------
// Patient lookup by phone number
// ---------------------------------------------------------------------------

export async function lookupCallerPatient(
  phone: string
): Promise<PatientMatch | null> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { lookupPatientByPhone } = await import("@/lib/communications/call-manager");
  return lookupPatientByPhone(phone);
}
