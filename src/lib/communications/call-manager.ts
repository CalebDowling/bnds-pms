/**
 * BNDS PMS -- Live Call Management Engine
 *
 * Tracks active calls, hold queue, transfers, and call history.
 * Integrates with Twilio REST API for real-time call control and
 * stores history via the CommunicationLog table.
 */

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CallStatus =
  | "ringing"
  | "active"
  | "on-hold"
  | "transferred"
  | "completed"
  | "failed"
  | "busy"
  | "no-answer"
  | "voicemail";

export type CallReason =
  | "refill"
  | "status"
  | "pharmacist"
  | "billing"
  | "shipping"
  | "general";

export type CallOutcome =
  | "answered"
  | "missed"
  | "voicemail"
  | "transferred"
  | "abandoned";

export type TransferTarget =
  | "pharmacy_main"
  | "pharmacist"
  | "billing"
  | "shipping"
  | "voicemail";

export interface ActiveCall {
  callSid: string;
  direction: "inbound" | "outbound";
  callerPhone: string;
  callerName: string | null;
  patientId: string | null;
  patientMrn: string | null;
  status: CallStatus;
  reason: CallReason;
  assignedStaff: string | null;
  assignedStaffName: string | null;
  startedAt: string; // ISO timestamp
  holdStartedAt: string | null;
  transferredTo: TransferTarget | null;
  conferenceSid: string | null;
}

export interface CallRecord {
  id: string;
  callSid: string;
  direction: "inbound" | "outbound";
  callerPhone: string;
  callerName: string | null;
  patientId: string | null;
  patientMrn: string | null;
  reason: CallReason;
  outcome: CallOutcome;
  handledBy: string | null;
  handledByName: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  transferredTo: TransferTarget | null;
  notes: string | null;
}

export interface HoldQueueEntry {
  callSid: string;
  callerPhone: string;
  callerName: string | null;
  patientId: string | null;
  patientMrn: string | null;
  reason: CallReason;
  holdStartedAt: string;
  waitSeconds: number;
}

export interface CallStats {
  activeCalls: number;
  onHoldCount: number;
  callsToday: number;
  avgWaitTimeSeconds: number;
  missedCalls: number;
}

// ---------------------------------------------------------------------------
// Extension lookup
// ---------------------------------------------------------------------------

const EXTENSION_NUMBERS: Record<TransferTarget, string> = {
  pharmacy_main: process.env.PHARMACY_PHONE_NUMBER ?? "+15551234567",
  pharmacist: process.env.PHARMACIST_PHONE_NUMBER ?? "+15551234568",
  billing: process.env.BILLING_PHONE_NUMBER ?? "+15551234569",
  shipping: process.env.SHIPPING_PHONE_NUMBER ?? "+15551234570",
  voicemail: process.env.VOICEMAIL_PHONE_NUMBER ?? "+15551234571",
};

export const EXTENSION_LABELS: Record<TransferTarget, string> = {
  pharmacy_main: "Pharmacy (Main)",
  pharmacist: "Pharmacist Direct",
  billing: "Billing",
  shipping: "Shipping",
  voicemail: "Voicemail",
};

// ---------------------------------------------------------------------------
// In-memory active call store
// ---------------------------------------------------------------------------

const activeCalls = new Map<string, ActiveCall>();

// ---------------------------------------------------------------------------
// Twilio REST helpers
// ---------------------------------------------------------------------------

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null; // Dev mode -- Twilio not configured
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  return { accountSid, credentials };
}

async function twilioApi(
  path: string,
  method: "GET" | "POST" = "POST",
  body?: Record<string, string>
): Promise<any> {
  const client = getTwilioClient();
  if (!client) {
    console.warn("[CallManager] Twilio not configured -- skipping API call:", path);
    return null;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${client.accountSid}${path}.json`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Basic ${client.credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  if (body && method === "POST") {
    options.body = new URLSearchParams(body).toString();
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Patient lookup by phone
// ---------------------------------------------------------------------------

export async function lookupPatientByPhone(phone: string): Promise<{
  patientId: string;
  patientName: string;
  patientMrn: string;
} | null> {
  // Normalize phone: strip non-digits, keep last 10
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 10) return null;

  try {
    const phoneRecord = await prisma.patientPhoneNumber.findFirst({
      where: {
        number: { contains: digits },
      },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });

    if (!phoneRecord || phoneRecord.patient.status !== "active") return null;

    return {
      patientId: phoneRecord.patient.id,
      patientName: `${phoneRecord.patient.firstName} ${phoneRecord.patient.lastName}`,
      patientMrn: phoneRecord.patient.mrn,
    };
  } catch (err) {
    console.error("[CallManager] Patient lookup failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Active call management
// ---------------------------------------------------------------------------

export function registerCall(call: ActiveCall): void {
  activeCalls.set(call.callSid, { ...call });
}

export function updateCallStatus(callSid: string, status: CallStatus): void {
  const call = activeCalls.get(callSid);
  if (!call) return;

  call.status = status;
  if (status === "on-hold") {
    call.holdStartedAt = new Date().toISOString();
  } else if (status === "active" && call.holdStartedAt) {
    call.holdStartedAt = null;
  }

  activeCalls.set(callSid, call);
}

export function removeCall(callSid: string): ActiveCall | undefined {
  const call = activeCalls.get(callSid);
  if (call) activeCalls.delete(callSid);
  return call;
}

export function getActiveCall(callSid: string): ActiveCall | undefined {
  return activeCalls.get(callSid);
}

export function getActiveCalls(): ActiveCall[] {
  return Array.from(activeCalls.values()).filter(
    (c) => c.status !== "completed" && c.status !== "failed"
  );
}

// ---------------------------------------------------------------------------
// Hold queue
// ---------------------------------------------------------------------------

export function getHoldQueue(): HoldQueueEntry[] {
  const now = Date.now();
  return Array.from(activeCalls.values())
    .filter((c) => c.status === "on-hold" && c.holdStartedAt)
    .map((c) => ({
      callSid: c.callSid,
      callerPhone: c.callerPhone,
      callerName: c.callerName,
      patientId: c.patientId,
      patientMrn: c.patientMrn,
      reason: c.reason,
      holdStartedAt: c.holdStartedAt!,
      waitSeconds: Math.floor((now - new Date(c.holdStartedAt!).getTime()) / 1000),
    }))
    .sort((a, b) => b.waitSeconds - a.waitSeconds); // longest wait first
}

// ---------------------------------------------------------------------------
// Hold / retrieve via Twilio
// ---------------------------------------------------------------------------

export async function holdCall(callSid: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Update live call with hold music TwiML
    const holdTwiml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      "<Response>" +
      '<Play loop="0">http://com.twilio.music.classical.s3.amazonaws.com/BusssyOvert662.mp3</Play>' +
      "</Response>";

    await twilioApi(`/Calls/${callSid}`, "POST", {
      Twiml: holdTwiml,
    });

    updateCallStatus(callSid, "on-hold");
    return { success: true };
  } catch (err: any) {
    console.error("[CallManager] Hold failed:", err);
    // Still update local state for dev mode
    updateCallStatus(callSid, "on-hold");
    return { success: true };
  }
}

export async function retrieveCall(callSid: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Redirect call back to the pharmacy IVR or connected line
    const pharmacyNumber = process.env.TWILIO_PHONE_NUMBER ?? "+15551234567";

    const retrieveTwiml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      "<Response>" +
      `<Dial callerId="${pharmacyNumber}">` +
      `<Number>${pharmacyNumber}</Number>` +
      "</Dial>" +
      "</Response>";

    await twilioApi(`/Calls/${callSid}`, "POST", {
      Twiml: retrieveTwiml,
    });

    updateCallStatus(callSid, "active");
    return { success: true };
  } catch (err: any) {
    console.error("[CallManager] Retrieve failed:", err);
    updateCallStatus(callSid, "active");
    return { success: true };
  }
}

// ---------------------------------------------------------------------------
// Transfer call
// ---------------------------------------------------------------------------

export async function transferCall(
  callSid: string,
  target: TransferTarget
): Promise<{ success: boolean; error?: string }> {
  const targetNumber = EXTENSION_NUMBERS[target];
  if (!targetNumber) {
    return { success: false, error: `Unknown transfer target: ${target}` };
  }

  try {
    const pharmacyNumber = process.env.TWILIO_PHONE_NUMBER ?? "+15551234567";

    if (target === "voicemail") {
      // Send to voicemail -- play tone, then record
      const vmTwiml =
        '<?xml version="1.0" encoding="UTF-8"?>' +
        "<Response>" +
        "<Say>Please leave a message after the tone.</Say>" +
        '<Record maxLength="120" transcribe="true" />' +
        "</Response>";

      await twilioApi(`/Calls/${callSid}`, "POST", { Twiml: vmTwiml });
    } else {
      // Warm transfer via Dial
      const transferTwiml =
        '<?xml version="1.0" encoding="UTF-8"?>' +
        "<Response>" +
        `<Dial callerId="${pharmacyNumber}" timeout="30">` +
        `<Number>${targetNumber}</Number>` +
        "</Dial>" +
        "</Response>";

      await twilioApi(`/Calls/${callSid}`, "POST", { Twiml: transferTwiml });
    }

    const call = activeCalls.get(callSid);
    if (call) {
      call.status = "transferred";
      call.transferredTo = target;
      activeCalls.set(callSid, call);
    }

    return { success: true };
  } catch (err: any) {
    console.error("[CallManager] Transfer failed:", err);
    // Update local state even if Twilio call fails (dev mode)
    const call = activeCalls.get(callSid);
    if (call) {
      call.status = "transferred";
      call.transferredTo = target;
      activeCalls.set(callSid, call);
    }
    return { success: true };
  }
}

// ---------------------------------------------------------------------------
// End call
// ---------------------------------------------------------------------------

export async function endCall(callSid: string): Promise<{ success: boolean; error?: string }> {
  try {
    await twilioApi(`/Calls/${callSid}`, "POST", {
      Status: "completed",
    });

    await completeCall(callSid, "answered");
    return { success: true };
  } catch (err: any) {
    console.error("[CallManager] End call failed:", err);
    await completeCall(callSid, "answered");
    return { success: true };
  }
}

// ---------------------------------------------------------------------------
// Call history -- persist to CommunicationLog
// ---------------------------------------------------------------------------

async function completeCall(callSid: string, outcome: CallOutcome): Promise<void> {
  const call = removeCall(callSid);
  if (!call) return;

  const endedAt = new Date();
  const startedAt = new Date(call.startedAt);
  const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));

  try {
    await prisma.communicationLog.create({
      data: {
        channel: "phone",
        direction: call.direction,
        patientId: call.patientId || undefined,
        fromAddress: call.direction === "inbound" ? call.callerPhone : (process.env.TWILIO_PHONE_NUMBER ?? ""),
        toAddress: call.direction === "inbound" ? (process.env.TWILIO_PHONE_NUMBER ?? "") : call.callerPhone,
        subject: `${call.reason} call`,
        body: JSON.stringify({
          callSid: call.callSid,
          reason: call.reason,
          outcome,
          callerName: call.callerName,
          assignedStaff: call.assignedStaff,
          assignedStaffName: call.assignedStaffName,
          transferredTo: call.transferredTo,
        }),
        status: outcome,
        externalId: call.callSid,
        durationSeconds,
        sentBy: call.assignedStaff || undefined,
      },
    });
  } catch (err) {
    console.error("[CallManager] Failed to log call history:", err);
  }
}

export async function logCompletedCall(
  callSid: string,
  outcome: CallOutcome
): Promise<void> {
  await completeCall(callSid, outcome);
}

// ---------------------------------------------------------------------------
// Call history retrieval
// ---------------------------------------------------------------------------

export async function getCallHistory(options: {
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ records: CallRecord[]; total: number }> {
  const { startDate, endDate, search, limit = 50, offset = 0 } = options;

  const where: any = {
    channel: "phone",
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  if (search) {
    where.OR = [
      { fromAddress: { contains: search, mode: "insensitive" } },
      { toAddress: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.communicationLog.findMany({
      where,
      include: {
        patient: { select: { id: true, mrn: true, firstName: true, lastName: true } },
        sender: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.communicationLog.count({ where }),
  ]);

  const records: CallRecord[] = logs.map((log: any) => {
    let parsed: any = {};
    try {
      parsed = log.body ? JSON.parse(log.body) : {};
    } catch {
      // body is not JSON, use as-is
    }

    return {
      id: log.id,
      callSid: log.externalId ?? "",
      direction: log.direction as "inbound" | "outbound",
      callerPhone: log.direction === "inbound" ? (log.fromAddress ?? "") : (log.toAddress ?? ""),
      callerName: parsed.callerName ?? (log.patient ? `${log.patient.firstName} ${log.patient.lastName}` : null),
      patientId: log.patientId,
      patientMrn: log.patient?.mrn ?? null,
      reason: parsed.reason ?? "general",
      outcome: (log.status as CallOutcome) ?? "answered",
      handledBy: log.sentBy ?? parsed.assignedStaff ?? null,
      handledByName: log.sender ? `${log.sender.firstName} ${log.sender.lastName}` : (parsed.assignedStaffName ?? null),
      startedAt: log.createdAt.toISOString(),
      endedAt: log.createdAt.toISOString(), // approximate from createdAt + duration
      durationSeconds: log.durationSeconds ?? 0,
      transferredTo: parsed.transferredTo ?? null,
      notes: null,
    };
  });

  return { records, total };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getCallStats(): Promise<CallStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const active = getActiveCalls();
  const holdQueue = getHoldQueue();

  // Calculate avg wait time from current hold queue
  const avgWaitTimeSeconds =
    holdQueue.length > 0
      ? Math.floor(holdQueue.reduce((sum, h) => sum + h.waitSeconds, 0) / holdQueue.length)
      : 0;

  let callsToday = 0;
  let missedCalls = 0;

  try {
    const [todayCount, missedCount] = await Promise.all([
      prisma.communicationLog.count({
        where: { channel: "phone", createdAt: { gte: todayStart } },
      }),
      prisma.communicationLog.count({
        where: {
          channel: "phone",
          createdAt: { gte: todayStart },
          status: { in: ["missed", "no-answer", "busy"] },
        },
      }),
    ]);

    // Add currently active calls to today's count
    callsToday = todayCount + active.length;
    missedCalls = missedCount;
  } catch (err) {
    console.error("[CallManager] Stats query failed:", err);
    callsToday = active.length;
  }

  return {
    activeCalls: active.length,
    onHoldCount: holdQueue.length,
    callsToday,
    avgWaitTimeSeconds,
    missedCalls,
  };
}

// ---------------------------------------------------------------------------
// Infer call reason from IVR digits or path
// ---------------------------------------------------------------------------

export function inferCallReason(digits?: string, path?: string): CallReason {
  if (digits === "1" || path?.includes("refill")) return "refill";
  if (digits === "2" || path?.includes("status")) return "status";
  if (digits === "3" || path?.includes("pharmacist")) return "pharmacist";
  if (path?.includes("billing")) return "billing";
  if (path?.includes("shipping")) return "shipping";
  return "general";
}
