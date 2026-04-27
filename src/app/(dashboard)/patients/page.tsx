/**
 * /patients — Patients list (real data).
 *
 * Replaces the mock-data redesign with a server-rendered page that pulls
 * patients via getPatients() and routes each row to /patients/[id].
 * Tabs (all / recent / flagged / birthdays) drive the server filter via
 * ?tab=, and pagination via ?page=. Search is debounced through the
 * client child.
 */
import { getPatients, getPatientCounts, type PatientFilter } from "./actions";
import PatientsClient, { type PatientRow } from "./PatientsClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<{ tab?: string; page?: string; search?: string }>;
}

export default async function PatientsListPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const tab = (sp.tab as PatientFilter) || "all";
  const page = Number(sp.page ?? 1);
  const search = sp.search ?? "";

  const [{ patients, total, pages }, counts] = await Promise.all([
    getPatients({ filter: tab, page, search, limit: 25 }),
    getPatientCounts(),
  ]);

  // Flatten Patient → PatientRow. The flag detection mirrors the mock UI's
  // visual semantics: severe/critical allergies surface as "Allergy"; any
  // active allergy surfaces as "DUR" so techs reviewing the list can spot
  // patients who need extra screening before fill.
  const rows: PatientRow[] = (patients as any[]).map((p) => {
    const phone =
      p.phoneNumbers?.find((ph: any) => ph.isPrimary)?.number ??
      p.phoneNumbers?.[0]?.number ??
      null;
    const insurance =
      p.insurance?.[0]?.thirdPartyPlan?.planName ??
      (p.insurance?.length ? "On file" : "Cash");
    const hasSevereAllergy = (p.allergies ?? []).some(
      (a: any) => a.severity === "severe" || a.severity === "critical"
    );
    const hasAnyAllergy = (p.allergies ?? []).length > 0;
    const lastFill = p.prescriptions?.[0]?.dateFilled ?? null;
    const lastFillLabel = lastFill ? relativeAge(new Date(lastFill)) : "Never";

    return {
      id: p.id as string,
      mrn: p.mrn as string,
      name: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Unknown",
      dob: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().slice(0, 10) : "—",
      phone,
      insurance,
      hasAllergy: hasSevereAllergy,
      hasDur: hasAnyAllergy && !hasSevereAllergy,
      activeRx: p._count?.prescriptions ?? 0,
      lastFill: lastFillLabel,
      status: (p.status as string) ?? "active",
    };
  });

  return (
    <PatientsClient
      rows={rows}
      counts={counts}
      activeTab={tab}
      currentPage={page}
      totalPages={pages}
      total={total}
      search={search}
    />
  );
}

// Lightweight relative-time helper so the row reads "2 days ago" instead of
// "2026-04-25". Doesn't require date-fns since we already use it elsewhere
// for narrower time windows (this is a list view — coarse-grained is fine).
function relativeAge(when: Date): string {
  const ms = Date.now() - when.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 31) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
