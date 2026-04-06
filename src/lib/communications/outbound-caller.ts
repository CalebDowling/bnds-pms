// @ts-nocheck -- TODO: add proper types to replace this flag
/**
 * BNDS PMS — Outbound Calling Engine
 * Automated call campaigns for prescription ready, refill reminders,
 * med sync, appointment reminders, and custom outbound calls via Twilio.
 */

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CampaignType =
  | "rx_ready"
  | "refill_reminder"
  | "med_sync_reminder"
  | "appointment_reminder"
  | "custom";

export type CallStatus =
  | "pending"
  | "in_progress"
  | "answered"
  | "voicemail"
  | "no_answer"
  | "busy"
  | "failed";

export type CampaignStatus =
  | "draft"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

export interface CallResult {
  id: string;
  campaignId: string;
  patientId: string;
  patientName: string;
  phone: string;
  status: CallStatus;
  twilioCallSid?: string;
  attemptNumber: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  duration?: number; // seconds
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  createdBy: string;
  callList: CallResult[];
  totalCalls: number;
  completedCalls: number;
  successRate: number;
  retryCount: number;        // max retries per call (default 2)
  retryIntervalHours: number; // hours between retries (default 4)
  filters?: CampaignFilters;
  message?: string;           // custom TwiML message override
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignFilters {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  patientIds?: string[];
  rxStatus?: string;
  daysUntilRefill?: number;
  medSyncGroup?: string;
}

export interface CampaignStats {
  callsToday: number;
  successRate: number;
  pendingRetries: number;
  activeCampaigns: number;
  totalCampaigns: number;
  callsByStatus: Record<CallStatus, number>;
}

// ---------------------------------------------------------------------------
// Storage helpers — uses StoreSetting JSON via Prisma
// ---------------------------------------------------------------------------

const CAMPAIGNS_KEY = "outbound_campaigns";
const CALL_RESULTS_KEY = "outbound_call_results";

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await prisma.storeSetting.findUnique({ where: { key } });
    if (row?.value) return JSON.parse(row.value as string) as T;
  } catch {
    /* first run — table may not have the key yet */
  }
  return fallback;
}

async function saveJson<T>(key: string, data: T): Promise<void> {
  const value = JSON.stringify(data);
  await prisma.storeSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// ---------------------------------------------------------------------------
// Campaign CRUD
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Build a call list for a campaign type by querying the database.
 * Returns stub patient records — real implementation would join Rx/Patient tables.
 */
async function buildCallList(
  type: CampaignType,
  filters?: CampaignFilters,
  retryCount = 2,
): Promise<CallResult[]> {
  // In production, each type queries different tables:
  //   rx_ready          → fills WHERE status = 'ready' AND notified = false
  //   refill_reminder   → prescriptions WHERE refill_due <= NOW() + 7 days
  //   med_sync_reminder → patients WHERE med_sync_date <= NOW() + 3 days
  //   appointment_reminder → appointments WHERE date = tomorrow
  //   custom            → uses filters.patientIds directly

  // Simulated patient list for the campaign type
  const samplePatients = await loadSamplePatients(type, filters);

  const now = new Date().toISOString();
  return samplePatients.map((p) => ({
    id: generateId("call"),
    campaignId: "", // set after campaign creation
    patientId: p.id,
    patientName: p.name,
    phone: p.phone,
    status: "pending" as CallStatus,
    attemptNumber: 0,
    maxAttempts: retryCount + 1, // initial + retries
    createdAt: now,
    updatedAt: now,
  }));
}

async function loadSamplePatients(
  _type: CampaignType,
  _filters?: CampaignFilters,
): Promise<{ id: string; name: string; phone: string }[]> {
  // Query the Patient table for matching records.
  // Stub: returns representative data so the UI is functional.
  try {
    const patients = await prisma.patient.findMany({
      take: 50,
      select: { id: true, firstName: true, lastName: true, phone: true },
      where: { phone: { not: null } },
    });
    if (patients.length > 0) {
      return patients.map((p: any) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        phone: p.phone ?? "",
      }));
    }
  } catch {
    /* Patient model may not exist yet */
  }
  // Fallback demo data
  return [
    { id: "pt_001", name: "Mary Johnson", phone: "+13185551001" },
    { id: "pt_002", name: "Robert Williams", phone: "+13185551002" },
    { id: "pt_003", name: "Patricia Davis", phone: "+13185551003" },
    { id: "pt_004", name: "James Brown", phone: "+13185551004" },
    { id: "pt_005", name: "Linda Miller", phone: "+13185551005" },
  ];
}

// ---------------------------------------------------------------------------
// Twilio integration helpers
// ---------------------------------------------------------------------------

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? "";
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function getTwimlUrl(campaignId: string, callId: string, type: CampaignType): string {
  return `${APP_BASE_URL}/api/communications/outbound-call?campaignId=${campaignId}&callId=${callId}&type=${type}`;
}

function getStatusCallbackUrl(campaignId: string, callId: string): string {
  return `${APP_BASE_URL}/api/communications/outbound-call?campaignId=${campaignId}&callId=${callId}&callback=status`;
}

async function placeCall(
  campaign: Campaign,
  call: CallResult,
): Promise<{ success: boolean; callSid?: string; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    // Demo mode — simulate the call
    return { success: true, callSid: `demo_${generateId("sid")}` };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const body = new URLSearchParams({
      To: call.phone,
      From: TWILIO_FROM_NUMBER,
      Url: getTwimlUrl(campaign.id, call.id, campaign.type),
      StatusCallback: getStatusCallbackUrl(campaign.id, call.id),
      StatusCallbackEvent: "initiated ringing answered completed",
      StatusCallbackMethod: "GET",
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: err };
    }

    const data = await response.json();
    return { success: true, callSid: data.sid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createCampaign(
  name: string,
  type: CampaignType,
  filters?: CampaignFilters,
  options?: { retryCount?: number; retryIntervalHours?: number; message?: string },
): Promise<Campaign> {
  const retryCount = options?.retryCount ?? 2;
  const retryIntervalHours = options?.retryIntervalHours ?? 4;

  const callList = await buildCallList(type, filters, retryCount);

  const now = new Date().toISOString();
  const campaign: Campaign = {
    id: generateId("camp"),
    name,
    type,
    status: "draft",
    createdBy: "system",
    callList: [],
    totalCalls: callList.length,
    completedCalls: 0,
    successRate: 0,
    retryCount,
    retryIntervalHours,
    filters,
    message: options?.message,
    createdAt: now,
    updatedAt: now,
  };

  // Assign campaign ID to calls
  const calls = callList.map((c) => ({ ...c, campaignId: campaign.id }));
  campaign.callList = calls;

  // Persist
  const campaigns = await loadJson<Campaign[]>(CAMPAIGNS_KEY, []);
  campaigns.push(campaign);
  await saveJson(CAMPAIGNS_KEY, campaigns);

  return campaign;
}

export async function executeCampaign(campaignId: string): Promise<Campaign> {
  const campaigns = await loadJson<Campaign[]>(CAMPAIGNS_KEY, []);
  const idx = campaigns.findIndex((c) => c.id === campaignId);
  if (idx === -1) throw new Error("Campaign not found");

  const campaign = campaigns[idx];
  campaign.status = "running";
  campaign.startedAt = new Date().toISOString();
  campaign.updatedAt = new Date().toISOString();

  // Place calls for all pending entries
  const pendingCalls = campaign.callList.filter((c) => c.status === "pending");

  for (const call of pendingCalls) {
    call.status = "in_progress";
    call.attemptNumber += 1;
    call.lastAttemptAt = new Date().toISOString();

    const result = await placeCall(campaign, call);

    if (result.success) {
      call.twilioCallSid = result.callSid;
      // In demo mode, simulate random outcomes
      if (!TWILIO_ACCOUNT_SID) {
        const outcomes: CallStatus[] = ["answered", "voicemail", "no_answer", "busy"];
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        call.status = outcome;
        call.duration = outcome === "answered" ? Math.floor(Math.random() * 60) + 15 : 0;

        if ((outcome === "no_answer" || outcome === "busy") && call.attemptNumber < call.maxAttempts) {
          call.nextRetryAt = new Date(
            Date.now() + campaign.retryIntervalHours * 60 * 60 * 1000,
          ).toISOString();
        }
      }
    } else {
      call.status = "failed";
      call.notes = result.error;
    }

    call.updatedAt = new Date().toISOString();
  }

  // Update aggregate stats
  const completed = campaign.callList.filter((c) =>
    ["answered", "voicemail", "failed"].includes(c.status),
  );
  const answered = campaign.callList.filter((c) => c.status === "answered");
  campaign.completedCalls = completed.length;
  campaign.successRate =
    completed.length > 0 ? Math.round((answered.length / completed.length) * 100) : 0;

  const allDone = campaign.callList.every(
    (c) => !["pending", "in_progress"].includes(c.status) && !c.nextRetryAt,
  );
  if (allDone) {
    campaign.status = "completed";
    campaign.completedAt = new Date().toISOString();
  }

  campaign.updatedAt = new Date().toISOString();
  campaigns[idx] = campaign;
  await saveJson(CAMPAIGNS_KEY, campaigns);

  return campaign;
}

export async function getCallResults(campaignId: string): Promise<CallResult[]> {
  const campaigns = await loadJson<Campaign[]>(CAMPAIGNS_KEY, []);
  const campaign = campaigns.find((c) => c.id === campaignId);
  return campaign?.callList ?? [];
}

export async function getCampaignStats(): Promise<CampaignStats> {
  const campaigns = await loadJson<Campaign[]>(CAMPAIGNS_KEY, []);
  const today = new Date().toISOString().slice(0, 10);

  const todayCampaigns = campaigns.filter((c) => c.createdAt?.startsWith(today));
  let callsToday = 0;
  let answeredToday = 0;
  let pendingRetries = 0;

  const callsByStatus: Record<CallStatus, number> = {
    pending: 0,
    in_progress: 0,
    answered: 0,
    voicemail: 0,
    no_answer: 0,
    busy: 0,
    failed: 0,
  };

  for (const c of campaigns) {
    for (const call of c.callList) {
      callsByStatus[call.status] = (callsByStatus[call.status] || 0) + 1;
      if (call.nextRetryAt) pendingRetries++;
    }
  }

  for (const c of todayCampaigns) {
    callsToday += c.callList.length;
    answeredToday += c.callList.filter((cl) => cl.status === "answered").length;
  }

  const activeCampaigns = campaigns.filter((c) => c.status === "running").length;
  const totalAttempted = callsToday || 1;

  return {
    callsToday,
    successRate: Math.round((answeredToday / totalAttempted) * 100),
    pendingRetries,
    activeCampaigns,
    totalCampaigns: campaigns.length,
    callsByStatus,
  };
}

export async function retryFailedCalls(campaignId: string): Promise<Campaign> {
  const campaigns = await loadJson<Campaign[]>(CAMPAIGNS_KEY, []);
  const idx = campaigns.findIndex((c) => c.id === campaignId);
  if (idx === -1) throw new Error("Campaign not found");

  const campaign = campaigns[idx];
  // Reset failed/no-answer calls that haven't exceeded max retries
  for (const call of campaign.callList) {
    if (
      (call.status === "no_answer" || call.status === "busy" || call.status === "failed") &&
      call.attemptNumber < call.maxAttempts
    ) {
      call.status = "pending";
      call.nextRetryAt = undefined;
    }
  }

  campaign.status = "running";
  campaign.updatedAt = new Date().toISOString();
  campaigns[idx] = campaign;
  await saveJson(CAMPAIGNS_KEY, campaigns);

  // Re-execute
  return executeCampaign(campaignId);
}

export async function getAllCampaigns(): Promise<Campaign[]> {
  return loadJson<Campaign[]>(CAMPAIGNS_KEY, []);
}

export async function getCampaignById(campaignId: string): Promise<Campaign | null> {
  const campaigns = await loadJson<Campaign[]>(CAMPAIGNS_KEY, []);
  return campaigns.find((c) => c.id === campaignId) ?? null;
}

export async function updateCallStatus(
  campaignId: string,
  callId: string,
  status: CallStatus,
  duration?: number,
): Promise<void> {
  const campaigns = await loadJson<Campaign[]>(CAMPAIGNS_KEY, []);
  const idx = campaigns.findIndex((c) => c.id === campaignId);
  if (idx === -1) return;

  const campaign = campaigns[idx];
  const call = campaign.callList.find((c) => c.id === callId);
  if (!call) return;

  call.status = status;
  if (duration) call.duration = duration;
  call.updatedAt = new Date().toISOString();

  // Recalculate aggregates
  const completed = campaign.callList.filter((c) =>
    ["answered", "voicemail", "failed"].includes(c.status),
  );
  const answered = campaign.callList.filter((c) => c.status === "answered");
  campaign.completedCalls = completed.length;
  campaign.successRate =
    completed.length > 0 ? Math.round((answered.length / completed.length) * 100) : 0;
  campaign.updatedAt = new Date().toISOString();

  campaigns[idx] = campaign;
  await saveJson(CAMPAIGNS_KEY, campaigns);
}
