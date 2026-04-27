/**
 * /prescriptions — All prescriptions (real data).
 *
 * Replaces the redesigned mock-data list with a server-rendered page that
 * pulls every Rx via getPrescriptions() and routes each row to
 * /prescriptions/[id]. Server-side pagination is supported via searchParams
 * (?page=2). The active queue (intake → waiting_bin) lives at /queue;
 * this page is the master record for filled / dispensed / expired Rxs.
 */
import { getPrescriptions, getPrescriptionCounts } from "./actions";
import PrescriptionsClient, { type PrescriptionRow } from "./PrescriptionsClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<{ tab?: string; page?: string; search?: string }>;
}

export default async function PrescriptionsListPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const tab = (sp.tab as any) || "active";
  const page = Number(sp.page ?? 1);
  const search = sp.search ?? "";

  const [{ prescriptions, total, pages }, counts] = await Promise.all([
    getPrescriptions({ filter: tab, page, search, limit: 25 }),
    getPrescriptionCounts(),
  ]);

  // Map the Prisma result into a flat shape so the client component doesn't
  // need to know about the relational structure.
  const rows: PrescriptionRow[] = (prescriptions as any[]).map((p) => {
    const filled = p.fills?.find?.((f: any) => f.status === "sold")?.fillNumber ?? 0;
    const drugName =
      p.item?.name ?? p.formula?.name ?? "Unknown drug";
    const strength = p.item?.strength ?? "";
    const fullDrug = strength ? `${drugName} ${strength}` : drugName;

    return {
      id: p.id as string,
      rxNumber: p.rxNumber as string,
      drug: fullDrug,
      patient: p.patient
        ? `${p.patient.firstName ?? ""} ${p.patient.lastName ?? ""}`.trim()
        : "Unknown",
      patientId: p.patient?.id ?? null,
      prescriber: p.prescriber
        ? `Dr. ${p.prescriber.lastName}${p.prescriber.suffix ? `, ${p.prescriber.suffix}` : ""}`
        : "—",
      quantity: Number(p.quantityPrescribed ?? 0),
      daysSupply: p.daysSupply ?? null,
      refillsAuthorized: p.refillsAuthorized ?? 0,
      refillsRemaining: p.refillsRemaining ?? 0,
      filled,
      lastFilled: p.dateFilled ? new Date(p.dateFilled).toISOString().slice(0, 10) : null,
      status: p.status as string,
    };
  });

  return (
    <PrescriptionsClient
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
