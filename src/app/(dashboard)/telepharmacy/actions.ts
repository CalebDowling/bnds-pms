"use server";

/**
 * BNDS PMS — Telepharmacy Server Actions
 */

import {
  createSession,
  endSession,
  joinSession,
  getSessionById,
  getSessionHistory,
  getActiveSessions,
  getTelepharmacyStats,
  getPendingVerifications as getPendingVerificationsEngine,
  type TelepharmacySession,
  type TelepharmacyStats,
  type SessionType,
  type SessionOutcome,
  type CounselingChecklistItem,
  type PendingVerification,
} from "@/lib/telepharmacy/video-session";

export interface TelepharmacyDashboardData {
  activeSessions: TelepharmacySession[];
  recentSessions: TelepharmacySession[];
  pendingVerifications: PendingVerification[];
  stats: TelepharmacyStats;
}

export interface SessionDetailData {
  session: TelepharmacySession;
  patientInfo?: {
    name: string;
    dob: string;
    allergies: string[];
    activeMeds: string[];
  };
  fillInfo?: {
    rxNumber: string;
    medication: string;
    directions: string;
    quantity: string;
    durAlerts: string[];
  };
}

// ---------------------------------------------------------------------------
// Dashboard — sessions + stats
// ---------------------------------------------------------------------------

export async function getTelepharmacyDashboard(): Promise<TelepharmacyDashboardData> {
  const [activeSessions, recentSessions, pendingVerifications, stats] = await Promise.all([
    getActiveSessions(),
    getSessionHistory(20),
    getPendingVerificationsEngine(),
    getTelepharmacyStats(),
  ]);

  return { activeSessions, recentSessions, pendingVerifications, stats };
}

// ---------------------------------------------------------------------------
// Create consultation session
// ---------------------------------------------------------------------------

export async function createConsultation(
  type: SessionType,
  participantId: string,
  participantName: string,
  options?: {
    participantRole?: "patient" | "technician";
    pharmacistId?: string;
    pharmacistName?: string;
    remoteLocationId?: string;
    remoteLocationName?: string;
    fillId?: string;
    rxNumber?: string;
  },
): Promise<TelepharmacySession> {
  return createSession({
    type,
    pharmacistId: options?.pharmacistId ?? "rph_001",
    pharmacistName: options?.pharmacistName ?? "Dr. Pharmacist",
    participantId,
    participantName,
    participantRole: options?.participantRole ?? "patient",
    remoteLocationId: options?.remoteLocationId,
    remoteLocationName: options?.remoteLocationName,
    fillId: options?.fillId,
    rxNumber: options?.rxNumber,
  });
}

// ---------------------------------------------------------------------------
// Complete session — record notes and outcome
// ---------------------------------------------------------------------------

export async function completeSession(
  sessionId: string,
  notes: string,
  outcome: SessionOutcome,
  counselingChecklist?: CounselingChecklistItem[],
): Promise<TelepharmacySession | null> {
  return endSession(sessionId, notes, outcome, counselingChecklist);
}

// ---------------------------------------------------------------------------
// Join session — mark active
// ---------------------------------------------------------------------------

export async function joinSessionAction(
  sessionId: string,
): Promise<TelepharmacySession | null> {
  return joinSession(sessionId);
}

// ---------------------------------------------------------------------------
// Get session detail with patient/fill context
// ---------------------------------------------------------------------------

export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetailData | null> {
  const session = await getSessionById(sessionId);
  if (!session) return null;

  // In production, look up patient and fill details from Prisma.
  // Providing representative data so the UI is functional.
  const patientInfo = {
    name: session.participantName,
    dob: "05/12/1955",
    allergies: ["Penicillin", "Sulfa"],
    activeMeds: [
      "Lisinopril 10mg — 1 daily",
      "Metformin 500mg — 2 daily",
      "Atorvastatin 20mg — 1 at bedtime",
      "Amlodipine 5mg — 1 daily",
    ],
  };

  const fillInfo = session.fillId
    ? {
        rxNumber: session.rxNumber ?? "RX-2024-00142",
        medication: "Metformin 500mg Tablets #60",
        directions: "Take 1 tablet by mouth twice daily with meals",
        quantity: "60 tablets",
        durAlerts: ["Duplicate therapy check — review", "Renal function monitoring recommended"],
      }
    : undefined;

  return { session, patientInfo, fillInfo };
}

// ---------------------------------------------------------------------------
// Pending verifications
// ---------------------------------------------------------------------------

export async function getPendingVerificationsAction(): Promise<PendingVerification[]> {
  return getPendingVerificationsEngine();
}
