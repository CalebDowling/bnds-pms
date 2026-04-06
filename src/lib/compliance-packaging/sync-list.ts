// @ts-nocheck -- TODO: add proper types to replace this flag
/**
 * Compliance Packaging — Sync List Engine
 *
 * Manages patient enrollment in the compliance (blister-pack / multi-dose)
 * packaging program. Calculates pack due dates, determines contents from
 * active prescriptions, tracks medication changes between packs, and
 * generates pack manifests.
 *
 * Persistence: StoreSetting JSON rows keyed by
 *   "cp-enrolled-patients"   → EnrolledPatient[]
 *   "cp-pack-history"        → PackRecord[]
 */

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrolledPatient {
  patientId: string;
  patientName: string;
  mrn: string;
  syncDate: number;            // day-of-month (1-28) the patient syncs
  daysSupply: number;          // typically 28 or 30
  enrolledAt: string;          // ISO date
  enrolledBy: string;
  active: boolean;
  notes: string;
}

export interface PackMedication {
  rxNumber: string;
  drugName: string;
  strength: string;
  directions: string;
  prescriber: string;
  quantityPerPack: number;
  ndc: string;
  isNew: boolean;
  isDoseChange: boolean;
  isDiscontinued: boolean;
  previousStrength?: string;
}

export interface PackManifest {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  generatedAt: string;
  packStartDate: string;
  packEndDate: string;
  daysSupply: number;
  medications: PackMedication[];
  totalMedications: number;
  cellLayout: CellEntry[];
  changesFromLastPack: MedicationChange[];
  status: "generated" | "in-progress" | "completed" | "voided";
}

export interface CellEntry {
  cellNumber: number;
  dayLabel: string;
  timeOfDay: "morning" | "noon" | "evening" | "bedtime";
  medications: { drugName: string; strength: string; qty: number }[];
}

export interface MedicationChange {
  type: "new" | "discontinued" | "dose-change" | "direction-change";
  drugName: string;
  details: string;
  rxNumber: string;
}

export interface PackRecord {
  id: string;
  patientId: string;
  manifestId: string;
  packedAt: string;
  packedBy: string;
  verifiedBy: string;
  medicationCount: number;
  daysSupply: number;
  status: "completed" | "voided";
  notes: string;
}

export interface PackDueItem {
  patientId: string;
  patientName: string;
  mrn: string;
  syncDate: number;
  nextPackDue: string;         // ISO date
  daysTilDue: number;
  status: "overdue" | "due-today" | "due-this-week" | "upcoming" | "completed" | "review-needed";
  medicationCount: number;
  lastPackedDate: string | null;
  hasChanges: boolean;
  changeCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await prisma.storeSetting.findUnique({ where: { key } });
    if (row?.value) return JSON.parse(row.value as string) as T;
  } catch {
    // first run — table might not have the key yet
  }
  return fallback;
}

async function writeSetting<T>(key: string, data: T): Promise<void> {
  const value = JSON.stringify(data);
  await prisma.storeSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

function calcNextPackDue(syncDate: number, daysSupply: number, lastPacked: string | null): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (lastPacked) {
    const lp = new Date(lastPacked);
    const due = new Date(lp);
    due.setDate(due.getDate() + daysSupply);
    return due.toISOString().slice(0, 10);
  }

  // No pack history — next sync date this month or next
  let due = new Date(year, month, Math.min(syncDate, 28));
  if (due < today) {
    due = new Date(year, month + 1, Math.min(syncDate, 28));
  }
  return due.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

function parseTimeOfDay(directions: string): ("morning" | "noon" | "evening" | "bedtime")[] {
  const lower = directions.toLowerCase();
  const times: ("morning" | "noon" | "evening" | "bedtime")[] = [];

  if (/\b(morning|breakfast|am|qam)\b/.test(lower)) times.push("morning");
  if (/\b(noon|midday|lunch)\b/.test(lower)) times.push("noon");
  if (/\b(evening|dinner|supper|qpm|pm)\b/.test(lower)) times.push("evening");
  if (/\b(bedtime|night|hs|qhs)\b/.test(lower)) times.push("bedtime");

  // Frequency-based fallback
  if (times.length === 0) {
    if (/\b(bid|twice|2\s*times)\b/.test(lower)) {
      times.push("morning", "evening");
    } else if (/\b(tid|three|3\s*times)\b/.test(lower)) {
      times.push("morning", "noon", "evening");
    } else if (/\b(qid|four|4\s*times)\b/.test(lower)) {
      times.push("morning", "noon", "evening", "bedtime");
    } else {
      times.push("morning"); // default once daily → morning
    }
  }

  return times;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Return all patients enrolled in the compliance packaging program.
 */
export async function getEnrolledPatients(): Promise<EnrolledPatient[]> {
  return readSetting<EnrolledPatient[]>("cp-enrolled-patients", []);
}

/**
 * Enroll a patient in the compliance packaging program.
 */
export async function enrollPatient(params: {
  patientId: string;
  patientName: string;
  mrn: string;
  syncDate: number;
  daysSupply?: number;
  enrolledBy: string;
  notes?: string;
}): Promise<EnrolledPatient> {
  const patients = await getEnrolledPatients();

  // Prevent duplicate enrollment
  const existing = patients.find((p) => p.patientId === params.patientId && p.active);
  if (existing) {
    throw new Error(`Patient ${params.patientName} is already enrolled.`);
  }

  const record: EnrolledPatient = {
    patientId: params.patientId,
    patientName: params.patientName,
    mrn: params.mrn,
    syncDate: Math.min(Math.max(params.syncDate, 1), 28),
    daysSupply: params.daysSupply ?? 28,
    enrolledAt: new Date().toISOString(),
    enrolledBy: params.enrolledBy,
    active: true,
    notes: params.notes ?? "",
  };

  patients.push(record);
  await writeSetting("cp-enrolled-patients", patients);
  return record;
}

/**
 * Disenroll (deactivate) a patient.
 */
export async function disenrollPatient(patientId: string): Promise<void> {
  const patients = await getEnrolledPatients();
  const idx = patients.findIndex((p) => p.patientId === patientId && p.active);
  if (idx === -1) throw new Error("Patient not found in enrollment list.");
  patients[idx].active = false;
  await writeSetting("cp-enrolled-patients", patients);
}

/**
 * Build a due-list of packs that need to be created, sorted by urgency.
 */
export async function getPackDueList(): Promise<PackDueItem[]> {
  const patients = (await getEnrolledPatients()).filter((p) => p.active);
  const history = await readSetting<PackRecord[]>("cp-pack-history", []);
  const today = new Date().toISOString().slice(0, 10);

  const items: PackDueItem[] = [];

  for (const pt of patients) {
    const ptHistory = history
      .filter((h) => h.patientId === pt.patientId && h.status === "completed")
      .sort((a, b) => b.packedAt.localeCompare(a.packedAt));

    const lastPacked = ptHistory[0]?.packedAt?.slice(0, 10) ?? null;
    const nextDue = calcNextPackDue(pt.syncDate, pt.daysSupply, lastPacked);
    const daysTilDue = daysBetween(today, nextDue);

    // Detect medication changes
    const changes = await detectChanges(pt.patientId, ptHistory[0]?.manifestId ?? null);

    let status: PackDueItem["status"];
    if (changes.length > 0) {
      status = "review-needed";
    } else if (daysTilDue < 0) {
      status = "overdue";
    } else if (daysTilDue === 0) {
      status = "due-today";
    } else if (daysTilDue <= 7) {
      status = "due-this-week";
    } else {
      status = "upcoming";
    }

    // Count active meds
    const activeMeds = await getActiveRxCount(pt.patientId);

    items.push({
      patientId: pt.patientId,
      patientName: pt.patientName,
      mrn: pt.mrn,
      syncDate: pt.syncDate,
      nextPackDue: nextDue,
      daysTilDue,
      status,
      medicationCount: activeMeds,
      lastPackedDate: lastPacked,
      hasChanges: changes.length > 0,
      changeCount: changes.length,
    });
  }

  // Sort: overdue first, then due-today, review-needed, due-this-week, upcoming
  const priority: Record<string, number> = {
    overdue: 0,
    "due-today": 1,
    "review-needed": 2,
    "due-this-week": 3,
    upcoming: 4,
    completed: 5,
  };
  items.sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9));
  return items;
}

/**
 * Generate a pack manifest for a patient — determines what goes in each
 * cell / pouch for each day and time-of-day slot.
 */
export async function generatePackManifest(patientId: string): Promise<PackManifest> {
  const patients = await getEnrolledPatients();
  const enrolled = patients.find((p) => p.patientId === patientId && p.active);
  if (!enrolled) throw new Error("Patient not enrolled in compliance packaging.");

  const history = await readSetting<PackRecord[]>("cp-pack-history", []);
  const lastManifests = await readSetting<PackManifest[]>("cp-pack-manifests", []);
  const lastManifest = lastManifests
    .filter((m) => m.patientId === patientId)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null;

  // Get active prescriptions for the patient
  const activeRxs = await getActiveRx(patientId);
  const changes = await detectChanges(patientId, lastManifest?.id ?? null);

  // Build medication list
  const meds: PackMedication[] = activeRxs.map((rx) => {
    const change = changes.find((c) => c.rxNumber === rx.rxNumber);
    const timesPerDay = parseTimeOfDay(rx.directions).length;
    return {
      rxNumber: rx.rxNumber,
      drugName: rx.drugName,
      strength: rx.strength,
      directions: rx.directions,
      prescriber: rx.prescriber,
      quantityPerPack: timesPerDay * enrolled.daysSupply,
      ndc: rx.ndc,
      isNew: change?.type === "new",
      isDoseChange: change?.type === "dose-change",
      isDiscontinued: false,
      previousStrength: change?.type === "dose-change" ? change.details.split(" → ")[0] : undefined,
    };
  });

  // Add discontinued meds from changes
  for (const ch of changes.filter((c) => c.type === "discontinued")) {
    meds.push({
      rxNumber: ch.rxNumber,
      drugName: ch.drugName,
      strength: "",
      directions: "",
      prescriber: "",
      quantityPerPack: 0,
      ndc: "",
      isNew: false,
      isDoseChange: false,
      isDiscontinued: true,
    });
  }

  // Build cell layout (day x time-of-day grid)
  const startDate = new Date();
  const cellLayout: CellEntry[] = [];
  let cellNum = 1;

  for (let d = 0; d < enrolled.daysSupply; d++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(cellDate.getDate() + d);
    const dayLabel = cellDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    const timesOfDay: ("morning" | "noon" | "evening" | "bedtime")[] = ["morning", "noon", "evening", "bedtime"];
    for (const tod of timesOfDay) {
      const cellMeds = activeRxs
        .filter((rx) => parseTimeOfDay(rx.directions).includes(tod))
        .map((rx) => ({
          drugName: rx.drugName,
          strength: rx.strength,
          qty: 1,
        }));

      if (cellMeds.length > 0) {
        cellLayout.push({ cellNumber: cellNum++, dayLabel, timeOfDay: tod, medications: cellMeds });
      }
    }
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + enrolled.daysSupply - 1);

  const manifest: PackManifest = {
    id: generateId(),
    patientId,
    patientName: enrolled.patientName,
    mrn: enrolled.mrn,
    generatedAt: new Date().toISOString(),
    packStartDate: startDate.toISOString().slice(0, 10),
    packEndDate: endDate.toISOString().slice(0, 10),
    daysSupply: enrolled.daysSupply,
    medications: meds.filter((m) => !m.isDiscontinued),
    totalMedications: meds.filter((m) => !m.isDiscontinued).length,
    cellLayout,
    changesFromLastPack: changes,
    status: "generated",
  };

  // Persist manifest
  lastManifests.push(manifest);
  await writeSetting("cp-pack-manifests", lastManifests);

  return manifest;
}

/**
 * Return pack history for a patient.
 */
export async function getPackHistory(patientId: string): Promise<PackRecord[]> {
  const history = await readSetting<PackRecord[]>("cp-pack-history", []);
  return history
    .filter((h) => h.patientId === patientId)
    .sort((a, b) => b.packedAt.localeCompare(a.packedAt));
}

/**
 * Mark a pack as completed.
 */
export async function completePackRecord(params: {
  patientId: string;
  manifestId: string;
  packedBy: string;
  verifiedBy: string;
  notes?: string;
}): Promise<PackRecord> {
  const history = await readSetting<PackRecord[]>("cp-pack-history", []);
  const manifests = await readSetting<PackManifest[]>("cp-pack-manifests", []);
  const manifest = manifests.find((m) => m.id === params.manifestId);

  const record: PackRecord = {
    id: generateId(),
    patientId: params.patientId,
    manifestId: params.manifestId,
    packedAt: new Date().toISOString(),
    packedBy: params.packedBy,
    verifiedBy: params.verifiedBy,
    medicationCount: manifest?.totalMedications ?? 0,
    daysSupply: manifest?.daysSupply ?? 28,
    status: "completed",
    notes: params.notes ?? "",
  };

  history.push(record);
  await writeSetting("cp-pack-history", history);

  // Update manifest status
  if (manifest) {
    manifest.status = "completed";
    await writeSetting("cp-pack-manifests", manifests);
  }

  return record;
}

// ---------------------------------------------------------------------------
// Internal helpers — prescription lookups
// ---------------------------------------------------------------------------

interface ActiveRx {
  rxNumber: string;
  drugName: string;
  strength: string;
  directions: string;
  prescriber: string;
  ndc: string;
  writtenDate: string;
  lastFilledDate: string;
}

async function getActiveRx(patientId: string): Promise<ActiveRx[]> {
  try {
    const rxs = await prisma.prescription.findMany({
      where: {
        patientId,
        status: { in: ["active", "Active", "ACTIVE"] },
      },
      include: {
        prescriber: true,
        drug: true,
      },
      orderBy: { drugName: "asc" },
    });

    return rxs.map((rx: any) => ({
      rxNumber: rx.rxNumber ?? rx.id,
      drugName: rx.drugName ?? rx.drug?.name ?? "Unknown",
      strength: rx.strength ?? rx.drug?.strength ?? "",
      directions: rx.directions ?? rx.sig ?? "",
      prescriber: rx.prescriber
        ? `${rx.prescriber.lastName ?? ""}, ${rx.prescriber.firstName ?? ""}`.replace(/, $/, "")
        : rx.prescriberName ?? "Unknown",
      ndc: rx.ndc ?? rx.drug?.ndc ?? "",
      writtenDate: rx.writtenDate?.toISOString?.() ?? rx.writtenDate ?? "",
      lastFilledDate: rx.lastFilledDate?.toISOString?.() ?? rx.lastFilledDate ?? "",
    }));
  } catch {
    // Fallback if schema doesn't have expected fields — return demo data
    return getDemoRx(patientId);
  }
}

async function getActiveRxCount(patientId: string): Promise<number> {
  try {
    const count = await prisma.prescription.count({
      where: {
        patientId,
        status: { in: ["active", "Active", "ACTIVE"] },
      },
    });
    return count;
  } catch {
    return (await getDemoRx(patientId)).length;
  }
}

function getDemoRx(patientId: string): ActiveRx[] {
  // Demo / seed data for development
  const demoSets: Record<string, ActiveRx[]> = {
    default: [
      { rxNumber: "RX-100001", drugName: "Lisinopril", strength: "10mg", directions: "Take 1 tablet by mouth every morning", prescriber: "Smith, John", ndc: "00000-0001-01", writtenDate: "2026-01-15", lastFilledDate: "2026-03-10" },
      { rxNumber: "RX-100002", drugName: "Metformin", strength: "500mg", directions: "Take 1 tablet by mouth twice daily with meals", prescriber: "Smith, John", ndc: "00000-0002-01", writtenDate: "2026-01-15", lastFilledDate: "2026-03-10" },
      { rxNumber: "RX-100003", drugName: "Atorvastatin", strength: "20mg", directions: "Take 1 tablet by mouth at bedtime", prescriber: "Jones, Mary", ndc: "00000-0003-01", writtenDate: "2026-02-01", lastFilledDate: "2026-03-10" },
      { rxNumber: "RX-100004", drugName: "Amlodipine", strength: "5mg", directions: "Take 1 tablet by mouth every morning", prescriber: "Smith, John", ndc: "00000-0004-01", writtenDate: "2026-02-15", lastFilledDate: "2026-03-10" },
      { rxNumber: "RX-100005", drugName: "Omeprazole", strength: "20mg", directions: "Take 1 capsule by mouth every morning before breakfast", prescriber: "Jones, Mary", ndc: "00000-0005-01", writtenDate: "2026-03-01", lastFilledDate: "2026-03-10" },
    ],
  };
  return demoSets[patientId] ?? demoSets.default;
}

/**
 * Detect medication changes since the last pack manifest.
 */
async function detectChanges(patientId: string, lastManifestId: string | null): Promise<MedicationChange[]> {
  const changes: MedicationChange[] = [];
  if (!lastManifestId) return changes;

  const manifests = await readSetting<PackManifest[]>("cp-pack-manifests", []);
  const lastManifest = manifests.find((m) => m.id === lastManifestId);
  if (!lastManifest) return changes;

  const currentRxs = await getActiveRx(patientId);
  const lastMeds = lastManifest.medications;

  // New medications
  for (const rx of currentRxs) {
    const prev = lastMeds.find((m) => m.rxNumber === rx.rxNumber);
    if (!prev) {
      changes.push({
        type: "new",
        drugName: rx.drugName,
        details: `New: ${rx.drugName} ${rx.strength}`,
        rxNumber: rx.rxNumber,
      });
    } else if (prev.strength !== rx.strength) {
      changes.push({
        type: "dose-change",
        drugName: rx.drugName,
        details: `${prev.strength} → ${rx.strength}`,
        rxNumber: rx.rxNumber,
      });
    } else if (prev.directions !== rx.directions) {
      changes.push({
        type: "direction-change",
        drugName: rx.drugName,
        details: `Directions changed`,
        rxNumber: rx.rxNumber,
      });
    }
  }

  // Discontinued
  for (const med of lastMeds) {
    const still = currentRxs.find((r) => r.rxNumber === med.rxNumber);
    if (!still) {
      changes.push({
        type: "discontinued",
        drugName: med.drugName,
        details: `Discontinued: ${med.drugName}`,
        rxNumber: med.rxNumber,
      });
    }
  }

  return changes;
}

export { detectChanges as getChanges };
