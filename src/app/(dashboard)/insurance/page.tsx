/**
 * /insurance — Claims list (real data).
 *
 * Replaces the previous mock-data Insurance page (CLM-44210 etc.) with
 * a real Claim query via the new getClaims() action. Tabs filter by
 * status bucket; search hits claim number / patient / plan.
 */
import { getClaims, getClaimStats } from "./actions";
import {
  formatPatientName,
  formatItemDisplayName,
  formatDrugWithStrength,
  formatDate,
} from "@/lib/utils/formatters";
import InsuranceClient, { type InsuranceClaimRow } from "./InsuranceClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<{ tab?: string; q?: string; search?: string; page?: string }>;
}

export default async function InsurancePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const tab = ((sp.tab ?? "rejected") as "rejected" | "pending" | "paid" | "all");
  const search = (sp.q ?? sp.search ?? "").trim();
  const page = Number(sp.page ?? 1);

  const [{ claims, total, pages }, stats] = await Promise.all([
    getClaims({ filter: tab, search, limit: 50, page }),
    getClaimStats(),
  ]);

  const rows: InsuranceClaimRow[] = claims.map((c: any) => {
    const patient = c.insurance?.patient
      ? formatPatientName(c.insurance.patient)
      : "Unknown";
    const plan = c.insurance?.thirdPartyPlan?.planName ?? "Cash / no plan";
    // Claim has a fills array (schema is 1-to-many); the include limits
    // it to the first row for display purposes.
    const firstFill = Array.isArray(c.fills) ? c.fills[0] : null;
    const drug = firstFill?.item
      ? formatDrugWithStrength(formatItemDisplayName(firstFill.item), firstFill.item.strength ?? null)
      : "—";

    // Map raw status → UI bucket. Submitted/pending both render "pending".
    const uiStatus: InsuranceClaimRow["status"] =
      c.status === "paid"
        ? "paid"
        : c.status === "rejected"
        ? "rejected"
        : c.status === "partial"
        ? "partial"
        : "pending";

    // Show first rejection code or first message snippet so the
    // operator knows what to act on. Falls back to "—".
    let codeLabel = "—";
    if (uiStatus === "rejected" || uiStatus === "pending") {
      const codes = Array.isArray(c.rejectionCodes) ? c.rejectionCodes : null;
      if (codes && codes.length > 0) codeLabel = String(codes[0]);
      else if (c.rejectionMessages && typeof c.rejectionMessages === "object") {
        const firstKey = Object.keys(c.rejectionMessages)[0];
        if (firstKey) codeLabel = firstKey;
      }
    }

    return {
      id: c.id,
      claimNumber: c.claimNumber ?? c.id.slice(0, 8),
      rxNumber: firstFill?.prescription?.rxNumber ?? null,
      patient,
      plan,
      drug,
      billed: Number(c.amountBilled ?? 0),
      paid: Number(c.amountPaid ?? 0),
      status: uiStatus,
      codeLabel,
      submitted: c.submittedAt ? formatDate(c.submittedAt) : "—",
    };
  });

  // Tab counts come from getClaimStats — but for the operator's
  // "needs action" tab we want rejected only. Let getClaims own
  // the page-level total so pagination is accurate.
  const tabCounts = {
    rejected: stats.rejected,
    pending: stats.pending + stats.submitted,
    paid: stats.paid,
  };

  return (
    <InsuranceClient
      rows={rows}
      total={total}
      page={page}
      totalPages={pages}
      tab={tab}
      search={search}
      tabCounts={tabCounts}
    />
  );
}
