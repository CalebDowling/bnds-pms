// @ts-nocheck
/**
 * BNDS PMS — Telepharmacy Session Manager
 * Video consultation sessions for remote RPh verification, counseling,
 * and general pharmacy consultations. WebRTC-compatible via Twilio Video / Daily.co.
 */

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SessionType = "verification" | "counseling" | "consultation";

export type SessionStatus =
  | "scheduled"
  | "waiting"
  | "active"
  | "completed"
  | "cancelled"
  | "no_show";

export interface TelepharmacySession {
  id: string;
  roomUrl: string;
  roomToken?: string;
  type: SessionType;
  status: SessionStatus;

  // Participants
  pharmacistId: string;
  pharmacistName: string;
  participantId: string;   // patient or tech ID
  participantName: string;
  participantRole: "patient" | "technician";
  remoteLocationId?: string;
  remoteLocationName?: string;

  // If verification — linked fill details
  fillId?: string;
  rxNumber?: string;

  // Timing
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number; // seconds

  // Outcomes
  notes?: string;
  outcome?: SessionOutcome;
  counselingChecklist?: CounselingChecklistItem[];

  createdAt: string;
  updatedAt: string;
}

export interface SessionOutcome {
  result: "approved" | "rejected" | "follow_up" | "referred" | "completed";
  summary: string;
  clinicalNotes?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
}

export interface CounselingChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface TelepharmacyStats {
  sessionsToday: number;
  avgDurationMinutes: number;
  remoteVerifications: number;
  activeSessions: number;
  pendingVerifications: number;
  sessionsByType: Record<SessionType, number>;
  sessionsByStatus: Record<SessionStatus, number>;
}

export interface PendingVerification {
  id: string;
  fillId: string;
  rxNumber: string;
  patientName: string;
  medication: string;
  remoteSiteName: string;
  requestedAt: string;
  priority: "normal" | "urgent";
}

// ---------------------------------------------------------------------------
// Storage — StoreSetting JSON via Prisma
// ---------------------------------------------------------------------------

const SESSIONS_KEY = "telepharmacy_sessions";
const VERIFICATIONS_KEY = "telepharmacy_pending_verifications";

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await prisma.storeSetting.findUnique({ where: { key } });
    if (row?.value) return JSON.parse(row.value as string) as T;
  } catch {
    /* key may not exist yet */
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

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Video room helpers (Twilio Video / Daily.co)
// ---------------------------------------------------------------------------

const VIDEO_PROVIDER = process.env.TELEPHARMACY_VIDEO_PROVIDER ?? "daily"; // "twilio" | "daily"
const DAILY_API_KEY = process.env.DAILY_API_KEY ?? "";
const TWILIO_API_KEY_SID = process.env.TWILIO_VIDEO_API_KEY_SID ?? "";
const TWILIO_API_KEY_SECRET = process.env.TWILIO_VIDEO_API_KEY_SECRET ?? "";
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function createVideoRoom(sessionId: string): Promise<{ roomUrl: string; token?: string }> {
  if (VIDEO_PROVIDER === "daily" && DAILY_API_KEY) {
    try {
      const res = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `bnds-${sessionId}`,
          privacy: "private",
          properties: {
            enable_chat: true,
            enable_screenshare: true,
            max_participants: 4,
            exp: Math.floor(Date.now() / 1000) + 7200, // 2-hour expiry
          },
        }),
      });
      const data = await res.json();
      return { roomUrl: data.url, token: data.token };
    } catch {
      /* fall through to demo */
    }
  }

  // Demo mode — generate a placeholder room URL
  return {
    roomUrl: `${APP_BASE_URL}/telepharmacy/session/${sessionId}`,
    token: `demo_token_${sessionId}`,
  };
}

// ---------------------------------------------------------------------------
// Default counseling checklist
// ---------------------------------------------------------------------------

function defaultCounselingChecklist(): CounselingChecklistItem[] {
  return [
    { id: "cc_1", label: "Name and description of the medication", checked: false },
    { id: "cc_2", label: "Dosage form, dose, route of administration", checked: false },
    { id: "cc_3", label: "Duration of therapy", checked: false },
    { id: "cc_4", label: "Special directions for preparation and administration", checked: false },
    { id: "cc_5", label: "Common severe side effects and adverse reactions", checked: false },
    { id: "cc_6", label: "Interactions and contraindications", checked: false },
    { id: "cc_7", label: "Self-monitoring techniques", checked: false },
    { id: "cc_8", label: "Proper storage", checked: false },
    { id: "cc_9", label: "Refill information", checked: false },
    { id: "cc_10", label: "Action to take in case of a missed dose", checked: false },
    { id: "cc_11", label: "Patient questions answered", checked: false },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createSession(params: {
  type: SessionType;
  pharmacistId: string;
  pharmacistName: string;
  participantId: string;
  participantName: string;
  participantRole: "patient" | "technician";
  remoteLocationId?: string;
  remoteLocationName?: string;
  fillId?: string;
  rxNumber?: string;
  scheduledAt?: string;
}): Promise<TelepharmacySession> {
  const id = generateId("tps");
  const room = await createVideoRoom(id);
  const now = new Date().toISOString();

  const session: TelepharmacySession = {
    id,
    roomUrl: room.roomUrl,
    roomToken: room.token,
    type: params.type,
    status: "waiting",
    pharmacistId: params.pharmacistId,
    pharmacistName: params.pharmacistName,
    participantId: params.participantId,
    participantName: params.participantName,
    participantRole: params.participantRole,
    remoteLocationId: params.remoteLocationId,
    remoteLocationName: params.remoteLocationName,
    fillId: params.fillId,
    rxNumber: params.rxNumber,
    scheduledAt: params.scheduledAt,
    counselingChecklist:
      params.type === "counseling" ? defaultCounselingChecklist() : undefined,
    createdAt: now,
    updatedAt: now,
  };

  const sessions = await loadJson<TelepharmacySession[]>(SESSIONS_KEY, []);
  sessions.push(session);
  await saveJson(SESSIONS_KEY, sessions);

  return session;
}

export async function joinSession(sessionId: string): Promise<TelepharmacySession | null> {
  const sessions = await loadJson<TelepharmacySession[]>(SESSIONS_KEY, []);
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return null;

  const session = sessions[idx];
  if (session.status === "waiting") {
    session.status = "active";
    session.startedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();
    sessions[idx] = session;
    await saveJson(SESSIONS_KEY, sessions);
  }

  return session;
}

export async function endSession(
  sessionId: string,
  notes?: string,
  outcome?: SessionOutcome,
  counselingChecklist?: CounselingChecklistItem[],
): Promise<TelepharmacySession | null> {
  const sessions = await loadJson<TelepharmacySession[]>(SESSIONS_KEY, []);
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return null;

  const session = sessions[idx];
  const now = new Date().toISOString();

  session.status = "completed";
  session.endedAt = now;
  session.updatedAt = now;

  if (session.startedAt) {
    session.duration = Math.round(
      (new Date(now).getTime() - new Date(session.startedAt).getTime()) / 1000,
    );
  }

  if (notes) session.notes = notes;
  if (outcome) session.outcome = outcome;
  if (counselingChecklist) session.counselingChecklist = counselingChecklist;

  sessions[idx] = session;
  await saveJson(SESSIONS_KEY, sessions);

  return session;
}

export async function getSessionHistory(limit = 50): Promise<TelepharmacySession[]> {
  const sessions = await loadJson<TelepharmacySession[]>(SESSIONS_KEY, []);
  return sessions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function getSessionById(sessionId: string): Promise<TelepharmacySession | null> {
  const sessions = await loadJson<TelepharmacySession[]>(SESSIONS_KEY, []);
  return sessions.find((s) => s.id === sessionId) ?? null;
}

export async function getActiveSessions(): Promise<TelepharmacySession[]> {
  const sessions = await loadJson<TelepharmacySession[]>(SESSIONS_KEY, []);
  return sessions.filter((s) => s.status === "active" || s.status === "waiting");
}

export async function getTelepharmacyStats(): Promise<TelepharmacyStats> {
  const sessions = await loadJson<TelepharmacySession[]>(SESSIONS_KEY, []);
  const today = new Date().toISOString().slice(0, 10);

  const todaySessions = sessions.filter((s) => s.createdAt?.startsWith(today));
  const completedToday = todaySessions.filter((s) => s.status === "completed" && s.duration);
  const avgDuration =
    completedToday.length > 0
      ? Math.round(
          completedToday.reduce((sum, s) => sum + (s.duration ?? 0), 0) /
            completedToday.length /
            60,
        )
      : 0;

  const remoteVerifications = todaySessions.filter((s) => s.type === "verification").length;
  const activeSessions = sessions.filter(
    (s) => s.status === "active" || s.status === "waiting",
  ).length;

  const verifications = await loadJson<PendingVerification[]>(VERIFICATIONS_KEY, []);

  const sessionsByType: Record<SessionType, number> = {
    verification: 0,
    counseling: 0,
    consultation: 0,
  };
  const sessionsByStatus: Record<SessionStatus, number> = {
    scheduled: 0,
    waiting: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  };

  for (const s of sessions) {
    sessionsByType[s.type] = (sessionsByType[s.type] || 0) + 1;
    sessionsByStatus[s.status] = (sessionsByStatus[s.status] || 0) + 1;
  }

  return {
    sessionsToday: todaySessions.length,
    avgDurationMinutes: avgDuration,
    remoteVerifications,
    activeSessions,
    pendingVerifications: verifications.length,
    sessionsByType,
    sessionsByStatus,
  };
}

export async function getPendingVerifications(): Promise<PendingVerification[]> {
  const verifications = await loadJson<PendingVerification[]>(VERIFICATIONS_KEY, []);
  return verifications.sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
}

export async function addPendingVerification(v: Omit<PendingVerification, "id">): Promise<PendingVerification> {
  const verification: PendingVerification = { ...v, id: generateId("pv") };
  const list = await loadJson<PendingVerification[]>(VERIFICATIONS_KEY, []);
  list.push(verification);
  await saveJson(VERIFICATIONS_KEY, list);
  return verification;
}

export async function removePendingVerification(verificationId: string): Promise<void> {
  const list = await loadJson<PendingVerification[]>(VERIFICATIONS_KEY, []);
  const filtered = list.filter((v) => v.id !== verificationId);
  await saveJson(VERIFICATIONS_KEY, filtered);
}
