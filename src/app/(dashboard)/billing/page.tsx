/**
 * /billing — Billing & payments overview (real data).
 *
 * The mock-data version of this page imagined an Invoice model
 * (INV-8842 etc.) that doesn't exist in our schema — Payment is the
 * canonical "money collected" record, and copays are captured on
 * PrescriptionFill. Rather than fabricate invoices, this page now
 * shows the real Payment activity stream + claim/AR summary KPIs.
 *
 * Operators looking for the per-patient AR / statement-cycle features
 * the mock alluded to should pivot to the patient profile.
 */
import { getPayments, getBillingStats } from "./actions";
import { formatPatientName, formatDateTime } from "@/lib/utils/formatters";
import BillingClient, { type BillingPaymentRow } from "./BillingClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<{ q?: string; search?: string; page?: string }>;
}

export default async function BillingPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const search = (sp.q ?? sp.search ?? "").trim();
  const page = Number(sp.page ?? 1);

  const [{ payments, total, pages }, stats] = await Promise.all([
    getPayments({ search, page, limit: 50 }),
    getBillingStats(),
  ]);

  const rows: BillingPaymentRow[] = payments.map((p: any) => ({
    id: p.id,
    referenceNumber: p.referenceNumber ?? p.id.slice(0, 8),
    patient: p.patient ? formatPatientName(p.patient) : "Walk-in / cash",
    rxNumber: p.fill?.prescription?.rxNumber ?? null,
    amount: Number(p.amount),
    method: p.paymentMethod,
    status: p.status as "completed" | "pending" | "failed" | "refunded",
    processedAt: p.processedAt ? formatDateTime(p.processedAt) : "—",
    processor: p.processor ? formatPatientName(p.processor) : null,
  }));

  return (
    <BillingClient
      rows={rows}
      total={total}
      page={page}
      totalPages={pages}
      search={search}
      stats={{
        pendingClaims: stats.pendingClaims,
        rejectedClaims: stats.rejectedClaims,
        paymentsMtd: stats.paymentsThisMonthAmount,
        paymentCountMtd: stats.paymentsThisMonth,
        outstandingAR: stats.totalOutstanding,
      }}
    />
  );
}
