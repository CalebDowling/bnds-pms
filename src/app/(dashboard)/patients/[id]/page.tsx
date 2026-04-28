/**
 * /patients/[id] — Patient profile (real data).
 *
 * Replaces the previous mock-data shell that hardcoded "James L. Hebert"
 * regardless of which row was clicked from the patients list. Now
 * server-fetches the patient via getPatient() and shapes the data for
 * a thin client component (PatientProfileClient) that owns tab state
 * and rendering.
 *
 * All display formatting (patient name, DRX-artifact stripping, drug
 * fallback, dates) happens here so the client stays presentation-only
 * and we get a single canonical formatting boundary.
 */
import { notFound } from "next/navigation";
import { getPatient } from "../actions";
import {
  formatPatientName,
  formatItemDisplayName,
  formatDrugWithStrength,
  formatDate,
  formatDateTime,
} from "@/lib/utils/formatters";
import PatientProfileClient, { type PatientProfileData } from "./PatientProfileClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function computeAge(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age >= 0 ? age : null;
}

function makeInitials(first: string | null | undefined, last: string | null | undefined): string {
  const f = (first ?? "").trim().charAt(0).toUpperCase();
  const l = (last ?? "").trim().charAt(0).toUpperCase();
  return (f + l) || "?";
}

export default async function PatientProfilePage({ params }: PageProps) {
  const { id } = await params;
  const patient = await getPatient(id);

  if (!patient) {
    notFound();
  }

  const primaryPhone =
    patient.phoneNumbers?.find((p: any) => p.isPrimary)?.number ??
    patient.phoneNumbers?.[0]?.number ??
    null;

  const insurancePlans: string[] = (patient.insurance ?? [])
    .filter((ins: any) => ins.isActive !== false)
    .map((ins: any) => ins.thirdPartyPlan?.planName ?? null)
    .filter((n: string | null): n is string => !!n);

  const rxPcn: string | null =
    (patient.insurance ?? [])
      .map((ins: any) => ins.thirdPartyPlan?.pcn)
      .find((p: any) => !!p) ?? null;

  // Allergies → "Drug (severity)" strings, severe/critical first.
  const severityRank: Record<string, number> = {
    critical: 0,
    severe: 1,
    moderate: 2,
    mild: 3,
  };
  const allergyStrings = (patient.allergies ?? [])
    .filter((a: any) => (a.status ?? "active") === "active")
    .sort(
      (a: any, b: any) =>
        (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99)
    )
    .map((a: any) => {
      const name: string = a.allergen ?? "Unknown allergen";
      return a.reaction ? `${name} (${a.reaction})` : name;
    });

  // Map prescriptions → med rows. Status "active" = refills remaining and
  // not expired/cancelled. Anything else falls into "completed" so the
  // history tab still shows them.
  const meds: PatientProfileData["meds"] = (patient.prescriptions ?? []).map((rx: any) => {
    const drugLabel = rx.item
      ? formatDrugWithStrength(formatItemDisplayName(rx.item), rx.item.strength ?? null)
      : "Unknown drug";
    const isActive =
      (rx.status === "active" || rx.status === "filled" || rx.status === "ready") &&
      (rx.refillsRemaining ?? 0) >= 0;
    const dateWritten = rx.dateWritten ? new Date(rx.dateWritten) : null;
    return {
      id: rx.id,
      drug: drugLabel,
      sig: rx.directions ?? null,
      since: dateWritten ? String(dateWritten.getUTCFullYear()) : null,
      status: (isActive ? "active" : "completed") as "active" | "completed",
      lastFill: rx.dateFilled ? formatDate(rx.dateFilled) : null,
      refillsRemaining: rx.refillsRemaining ?? 0,
      refillsAuthorized: rx.refillsAuthorized ?? 0,
    };
  });

  // Recent activity from the most recent prescriptions (we already
  // have them). Could later pivot to FillEvent for finer-grain activity
  // (waiting_bin → sold transitions etc.) but the prescription dates
  // give a useful first cut.
  const recentActivity: PatientProfileData["recentActivity"] = (patient.prescriptions ?? [])
    .slice(0, 6)
    .map((rx: any) => {
      const drugLabel = rx.item
        ? formatDrugWithStrength(formatItemDisplayName(rx.item), rx.item.strength ?? null)
        : "Unknown drug";
      const at = rx.dateFilled ?? rx.dateReceived ?? rx.createdAt;
      return {
        when: formatDateTime(at),
        what: `${rx.rxNumber ?? "Rx"} — ${drugLabel}`,
      };
    });

  const data: PatientProfileData = {
    id: patient.id,
    initials: makeInitials(patient.firstName, patient.lastName),
    name: formatPatientName(patient) || "Unknown patient",
    dob: patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null,
    age: computeAge(patient.dateOfBirth),
    mrn: patient.mrn ?? "—",
    phone: primaryPhone,
    email: patient.email ?? null,
    status: (patient.status ?? "active").toString().replace(/^./, (c: string) => c.toUpperCase()),
    allergies: allergyStrings,
    insurance: insurancePlans,
    rxPcn,
    meds,
    recentActivity,
  };

  return <PatientProfileClient patient={data} />;
}
