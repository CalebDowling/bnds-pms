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
import {
  formatPatientName,
  formatPrescriberName,
  formatItemDisplayName,
  formatDrugWithStrength,
} from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";

interface PageProps {
  // Support both `?q=...` (the conventional short form most users type) and
  // `?search=...` (what the in-page input would emit if it ever syncs to
  // the URL). When both are present, `q` wins because it's the form
  // copy-pasted from external links.
  searchParams?: Promise<{ tab?: string; page?: string; search?: string; q?: string }>;
}

export default async function PrescriptionsListPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const tab = (sp.tab as any) || "active";
  const page = Number(sp.page ?? 1);
  const search = (sp.q ?? sp.search ?? "").trim();

  const [{ prescriptions, total, pages }, counts] = await Promise.all([
    getPrescriptions({ filter: tab, page, search, limit: 25 }),
    getPrescriptionCounts(),
  ]);

  // Map the Prisma result into a flat shape so the client component doesn't
  // need to know about the relational structure.
  const rows: PrescriptionRow[] = (prescriptions as any[]).map((p) => {
    const filled = p.fills?.find?.((f: any) => f.status === "sold")?.fillNumber ?? 0;

    // Drug name: use the same display resolver as /pickup so the queue,
    // pickup card, and prescriptions list render the same label. Falls
    // through item → formula → genericName/brandName → NDC → "Unknown
    // drug" only when literally nothing usable is on file.
    const itemForDisplay = p.item ?? p.formula
      ? {
          name: p.item?.name ?? p.formula?.name ?? null,
          genericName: p.item?.genericName ?? null,
          brandName: p.item?.brandName ?? null,
          ndc: p.item?.ndc ?? null,
        }
      : null;
    const drugLabel = itemForDisplay
      ? formatDrugWithStrength(formatItemDisplayName(itemForDisplay), p.item?.strength)
      : "Unknown drug";

    return {
      id: p.id as string,
      rxNumber: p.rxNumber as string,
      drug: drugLabel,
      // formatPatientName cleans DRX artifacts (e.g. "- white" suffix)
      // before composing first + last.
      patient: formatPatientName(p.patient) || "Unknown",
      patientId: p.patient?.id ?? null,
      // formatPrescriberName cleans DRX artifacts ("*SP**GROUP*" markers)
      // and emits "Dr. First Last" by default.
      prescriber: formatPrescriberName(p.prescriber) || "—",
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
