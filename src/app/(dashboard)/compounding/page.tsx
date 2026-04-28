/**
 * /compounding — Compounding queue + formulas (real data).
 *
 * Replaces the previous mock-data page (CMP-0412 / Yvette Robichaux /
 * Progesterone capsules etc.) with real Batch + Formula queries.
 *
 * Server-fetches via existing getBatches() and getFormulas() actions.
 */
import { getBatches, getFormulas } from "./actions";
import { prisma } from "@/lib/prisma";
import { formatPatientName, formatDateRelative, formatDate } from "@/lib/utils/formatters";
import CompoundingClient, { type CompoundJob, type FormulaRow } from "./CompoundingClient";

export const dynamic = "force-dynamic";

export default async function CompoundingPage() {
  // Active queue = batches in non-terminal status. Terminal statuses
  // we exclude: dispensed, archived. Everything else (in_progress,
  // queued, qc_pending, verified) is "active" for the operator.
  const [{ batches }, { formulas, total: formulaTotal }] = await Promise.all([
    getBatches({ limit: 50 }),
    getFormulas({ limit: 25 }),
  ]);

  const activeBatches = batches.filter(
    (b: any) => !["dispensed", "archived", "cancelled"].includes(b.status)
  );

  const queueRows: CompoundJob[] = activeBatches.map((b: any) => {
    // Map DB status to UI bucket the design expects (in-progress / queued / qc).
    const uiStatus: CompoundJob["status"] =
      b.status === "qc_pending" || b.status === "qc_review" || b.status === "qc"
        ? "qc"
        : b.status === "in_progress" || b.status === "compounding"
        ? "in-progress"
        : "queued";

    const patient = b.prescription?.patient
      ? formatPatientName(b.prescription.patient)
      : "Stock batch";

    return {
      id: b.batchNumber || b.id.slice(0, 8),
      batchId: b.id,
      formula: b.formulaVersion?.formula?.name ?? "Unknown formula",
      formulaCode: b.formulaVersion?.formula?.formulaCode ?? null,
      patient,
      rxNumber: b.prescription?.rxNumber ?? null,
      qty: Number(b.quantityPrepared ?? 0),
      unit: b.unit ?? "",
      due: b.budDate ? `BUD ${formatDate(b.budDate)}` : "—",
      priority: b.priority === "high" ? "high" : "normal",
      status: uiStatus,
    };
  });

  const qcCount = queueRows.filter((b) => b.status === "qc").length;

  // "Last used" derives from the most-recent Prescription that
  // references each Formula. Formula has no updatedAt column in the
  // schema, so the previous fallback always rendered "—" — caught
  // during verification. Single grouped query keeps this O(1) per
  // page render even when there are hundreds of formulas.
  const formulaIds = formulas.map((f: any) => f.id);
  const lastUsedByFormula = formulaIds.length
    ? await prisma.prescription.groupBy({
        by: ["formulaId"],
        where: { formulaId: { in: formulaIds } },
        _max: { dateReceived: true },
      })
    : [];
  const lastUsedById = new Map(
    lastUsedByFormula.map((g) => [g.formulaId, g._max.dateReceived])
  );

  const formulaRows: FormulaRow[] = formulas.map((f: any) => {
    const lastUsed = lastUsedById.get(f.id) ?? null;
    return {
      id: f.id,
      name: f.name,
      code: f.formulaCode ?? null,
      category: f.category ?? "—",
      lastUsed: lastUsed ? formatDateRelative(lastUsed) : "Never",
      uses: f._count?.prescriptions ?? 0,
    };
  });

  return (
    <CompoundingClient
      queue={queueRows}
      qcCount={qcCount}
      formulas={formulaRows}
      formulaTotal={formulaTotal}
    />
  );
}
