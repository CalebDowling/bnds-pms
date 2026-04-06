"use server";

/**
 * Compliance Packaging — Server Actions
 *
 * Thin action layer that delegates to the sync-list engine and returns
 * serialisable data for the React UI.
 */

import {
  getEnrolledPatients,
  getPackDueList,
  generatePackManifest,
  getPackHistory,
  enrollPatient as engineEnroll,
  completePackRecord,
  getChanges,
  type EnrolledPatient,
  type PackDueItem,
  type PackManifest,
  type PackRecord,
  type MedicationChange,
} from "@/lib/compliance-packaging/sync-list";

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface SyncListDashboard {
  enrolledCount: number;
  dueThisWeek: number;
  completedToday: number;
  changesPending: number;
  patients: PackDueItem[];
}

export async function getSyncListDashboard(): Promise<SyncListDashboard> {
  const patients = await getPackDueList();
  const today = new Date().toISOString().slice(0, 10);

  const history = await getPackHistory("__all__").catch(() => [] as PackRecord[]);
  // completedToday = completed packs across all patients today
  const allHistory: PackRecord[] = [];
  for (const pt of patients) {
    const h = await getPackHistory(pt.patientId);
    allHistory.push(...h);
  }
  const completedToday = allHistory.filter(
    (h) => h.status === "completed" && h.packedAt.slice(0, 10) === today
  ).length;

  return {
    enrolledCount: patients.length,
    dueThisWeek: patients.filter(
      (p) => p.status === "overdue" || p.status === "due-today" || p.status === "due-this-week"
    ).length,
    completedToday,
    changesPending: patients.filter((p) => p.hasChanges).length,
    patients,
  };
}

// ---------------------------------------------------------------------------
// Patient Detail
// ---------------------------------------------------------------------------

export interface PatientPackDetail {
  enrollment: EnrolledPatient | null;
  medications: Array<{
    rxNumber: string;
    drugName: string;
    strength: string;
    directions: string;
    quantityPerPack: number;
    prescriber: string;
    changeType: "new" | "dose-change" | "discontinued" | "direction-change" | null;
    changeDetails: string;
  }>;
  changes: MedicationChange[];
  history: PackRecord[];
  nextPackDue: string;
  latestManifest: PackManifest | null;
}

export async function getPatientPackDetail(patientId: string): Promise<PatientPackDetail> {
  const enrolled = (await getEnrolledPatients()).find(
    (p) => p.patientId === patientId && p.active
  ) ?? null;

  const dueList = await getPackDueList();
  const dueItem = dueList.find((d) => d.patientId === patientId);

  const changes = await getChanges(patientId, null);
  const history = await getPackHistory(patientId);

  // Build medication list from a fresh manifest preview
  let medications: PatientPackDetail["medications"] = [];
  let latestManifest: PackManifest | null = null;

  try {
    // Try generating a preview manifest
    latestManifest = await generatePackManifest(patientId);
    medications = latestManifest.medications.map((med) => {
      const change = latestManifest!.changesFromLastPack.find(
        (c) => c.rxNumber === med.rxNumber
      );
      return {
        rxNumber: med.rxNumber,
        drugName: med.drugName,
        strength: med.strength,
        directions: med.directions,
        quantityPerPack: med.quantityPerPack,
        prescriber: med.prescriber,
        changeType: change?.type ?? null,
        changeDetails: change?.details ?? "",
      };
    });

    // Add discontinued meds
    for (const ch of latestManifest.changesFromLastPack.filter((c) => c.type === "discontinued")) {
      medications.push({
        rxNumber: ch.rxNumber,
        drugName: ch.drugName,
        strength: "",
        directions: "DISCONTINUED",
        quantityPerPack: 0,
        prescriber: "",
        changeType: "discontinued",
        changeDetails: ch.details,
      });
    }
  } catch {
    // Patient may not be enrolled yet
  }

  return {
    enrollment: enrolled,
    medications,
    changes,
    history,
    nextPackDue: dueItem?.nextPackDue ?? "",
    latestManifest,
  };
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

export async function enrollPatientAction(data: {
  patientId: string;
  patientName: string;
  mrn: string;
  syncDate: number;
  daysSupply: number;
  notes: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await engineEnroll({
      patientId: data.patientId,
      patientName: data.patientName,
      mrn: data.mrn,
      syncDate: data.syncDate,
      daysSupply: data.daysSupply,
      enrolledBy: "Current User",
      notes: data.notes,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Enrollment failed" };
  }
}

// ---------------------------------------------------------------------------
// Pack Generation & Completion
// ---------------------------------------------------------------------------

export async function generatePackAction(
  patientId: string
): Promise<{ success: boolean; manifest?: PackManifest; error?: string }> {
  try {
    const manifest = await generatePackManifest(patientId);
    return { success: true, manifest };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Pack generation failed" };
  }
}

export async function completePackAction(data: {
  patientId: string;
  manifestId: string;
  packedBy: string;
  verifiedBy: string;
  notes: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await completePackRecord({
      patientId: data.patientId,
      manifestId: data.manifestId,
      packedBy: data.packedBy,
      verifiedBy: data.verifiedBy,
      notes: data.notes,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Completion failed" };
  }
}

// ---------------------------------------------------------------------------
// Changes
// ---------------------------------------------------------------------------

export async function getChangesAction(
  patientId: string
): Promise<MedicationChange[]> {
  return getChanges(patientId, null);
}
