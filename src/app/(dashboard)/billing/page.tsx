import Link from "next/link";
import { Clock, XCircle, DollarSign, TrendingUp } from "lucide-react";
import { getClaims, getPayments, getBillingStats } from "./actions";
import { formatDate } from "@/lib/utils";
import { formatPatientName, formatDrugName } from "@/lib/utils/formatters";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import StatsRow from "@/components/layout/StatsRow";
import { Suspense } from "react";
import PermissionGuard from "@/components/auth/PermissionGuard";

// BNDS PMS Redesign — heritage status palette
const CLAIM_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "rgba(212,138,40,0.14)", color: "#8a5a17" },
  submitted: { label: "Submitted", bg: "rgba(56,109,140,0.12)", color: "#2c5e7a" },
  accepted: { label: "Accepted", bg: "rgba(90,168,69,0.14)", color: "#2d6a1f" },
  paid: { label: "Paid", bg: "rgba(31,90,58,0.14)", color: "#1f5a3a" },
  partial: { label: "Partial Pay", bg: "rgba(212,138,40,0.18)", color: "#8a5a17" },
  rejected: { label: "Rejected", bg: "rgba(184,58,47,0.10)", color: "#9a2c1f" },
  reversed: { label: "Reversed", bg: "rgba(122,138,120,0.14)", color: "#5a6b58" },
};

const CLAIM_FILTERS = ["all", "pending", "submitted", "paid", "rejected"];

async function BillingPageContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || "claims";
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const status = params.status || "all";

  const stats = await getBillingStats();

  return (
    <PageShell
      eyebrow="Finance"
      title="Billing"
      subtitle="Claims, payments, and revenue"
      stats={
        <StatsRow
          stats={[
            {
              label: "Pending Claims",
              value: stats.pendingClaims,
              icon: <Clock size={12} />,
              accent: stats.pendingClaims > 0 ? "#d48a28" : undefined,
            },
            {
              label: "Rejected Claims",
              value: stats.rejectedClaims,
              icon: <XCircle size={12} />,
              accent: stats.rejectedClaims > 0 ? "#9a2c1f" : undefined,
            },
            {
              label: "Outstanding",
              value: `$${stats.totalOutstanding.toFixed(2)}`,
              icon: <DollarSign size={12} />,
              accent: stats.totalOutstanding > 0 ? "#d48a28" : undefined,
            },
            {
              label: "Payments (Month)",
              value: `$${stats.paymentsThisMonthAmount.toFixed(2)}`,
              icon: <TrendingUp size={12} />,
              accent: "#1f5a3a",
              sub: `${stats.paymentsThisMonth} transactions`,
            },
          ]}
        />
      }
      toolbar={
        <FilterBar
          filters={
            <>
              {[{ id: "claims", label: "Claims" }, { id: "payments", label: "Payments" }].map((t) => {
                const active = tab === t.id;
                return (
                  <Link
                    key={t.id}
                    href={`/billing?tab=${t.id}`}
                    className="inline-flex items-center font-medium rounded-md no-underline transition-colors"
                    style={{
                      backgroundColor: active ? "#1f5a3a" : "#ffffff",
                      color: active ? "#ffffff" : "#3a4a3c",
                      border: active ? "1px solid #1f5a3a" : "1px solid #d9d2c2",
                      padding: "5px 13px",
                      fontSize: 12,
                    }}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </>
          }
        />
      }
    >
      {tab === "claims" ? (
        <ClaimsTab search={search} page={page} status={status} />
      ) : (
        <PaymentsTab search={search} page={page} />
      )}
    </PageShell>
  );
}

async function ClaimsTab({ search, page, status }: { search: string; page: number; status: string }) {
  const { claims, total, pages } = await getClaims({ search, status, page });

  return (
    <>
      <div
        className="rounded-lg p-4 mb-4"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        <div className="mb-3">
          <Suspense fallback={null}>
            <SearchBar placeholder="Search by claim number..." basePath="/billing?tab=claims" />
          </Suspense>
        </div>
        <div className="flex flex-wrap gap-2">
          {CLAIM_FILTERS.map((s) => {
            const active = status === s;
            return (
              <Link
                key={s}
                href={`/billing?tab=claims&status=${s}${search ? `&search=${search}` : ""}`}
                className="inline-flex items-center font-medium rounded-md no-underline transition-colors"
                style={{
                  backgroundColor: active ? "#1f5a3a" : "#ffffff",
                  color: active ? "#ffffff" : "#3a4a3c",
                  border: active ? "1px solid #1f5a3a" : "1px solid #d9d2c2",
                  padding: "5px 11px",
                  fontSize: 12,
                }}
              >
                {s === "all" ? "All" : s.replace(/\b\w/g, (c) => c.toUpperCase())}
              </Link>
            );
          })}
        </div>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        {claims.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg" style={{ color: "#7a8a78" }}>No claims found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e3ddd1", backgroundColor: "#f4ede0" }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Claim #</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Patient</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Drug</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Plan</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Billed</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Paid</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Copay</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Date</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c, idx) => {
                  const si = CLAIM_STATUS[c.status] || { label: c.status, bg: "rgba(122,138,120,0.14)", color: "#5a6b58" };
                  const fill = c.fills?.[0];
                  const rawDrugName = fill?.prescription?.item?.name || fill?.prescription?.formula?.name || "—";
                  const drugName = rawDrugName === "—" ? rawDrugName : formatDrugName(rawDrugName);
                  const rxNumber = fill?.prescription?.rxNumber;
                  return (
                    <tr key={c.id} style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/billing/${c.id}`}
                          className="hover:underline"
                          style={{
                            color: "#1f5a3a",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {c.claimNumber || c.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p style={{ color: "#0f2e1f", fontWeight: 500 }}>
                          {formatPatientName({ firstName: c.insurance.patient.firstName, lastName: c.insurance.patient.lastName }, { format: "last-first" })}
                        </p>
                        <p style={{ color: "#7a8a78", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{c.insurance.patient.mrn}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p style={{ color: "#0f2e1f" }}>{drugName}</p>
                        {rxNumber && <p style={{ color: "#7a8a78", fontSize: 12 }}>Rx# {rxNumber}</p>}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{c.insurance.thirdPartyPlan?.planName || "—"}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "#0f2e1f", fontWeight: 500 }}>${Number(c.amountBilled).toFixed(2)}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "#5a6b58" }}>{c.amountPaid ? `$${Number(c.amountPaid).toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "#5a6b58" }}>{c.patientCopay ? `$${Number(c.patientCopay).toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center"
                          style={{
                            backgroundColor: si.bg,
                            color: si.color,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 999,
                          }}
                        >
                          {si.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Suspense fallback={null}><Pagination total={total} pages={pages} page={page} basePath="/billing?tab=claims" /></Suspense>
        </div>
      </div>
    </>
  );
}

async function PaymentsTab({ search, page }: { search: string; page: number }) {
  const { payments, total, pages } = await getPayments({ search, page });

  return (
    <>
      <div
        className="rounded-lg p-4 mb-4"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by reference # or patient name..." basePath="/billing?tab=payments" />
        </Suspense>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        {payments.length === 0 ? (
          <div className="p-12 text-center"><p className="text-lg" style={{ color: "#7a8a78" }}>No payments found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e3ddd1", backgroundColor: "#f4ede0" }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Patient</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Amount</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Method</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Reference</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Rx #</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Processed By</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Date</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => (
                  <tr key={p.id} style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}>
                    <td className="px-4 py-3">
                      <p style={{ color: "#0f2e1f", fontWeight: 500 }}>
                        {formatPatientName({ firstName: p.patient.firstName, lastName: p.patient.lastName }, { format: "last-first" })}
                      </p>
                      <p style={{ color: "#7a8a78", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{p.patient.mrn}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: "#1f5a3a", fontWeight: 600 }}>${Number(p.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 capitalize" style={{ color: "#5a6b58" }}>{p.paymentMethod.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3" style={{ color: "#5a6b58", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{p.referenceNumber || "—"}</td>
                    <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{p.fill ? `Rx# ${p.fill.prescription.rxNumber}` : "—"}</td>
                    <td className="px-4 py-3" style={{ color: "#5a6b58" }}>
                      {p.processor ? formatPatientName({ firstName: p.processor.firstName, lastName: p.processor.lastName }) : "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{formatDate(p.processedAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center capitalize"
                        style={{
                          backgroundColor: p.status === "completed" ? "rgba(90,168,69,0.14)" : "rgba(122,138,120,0.14)",
                          color: p.status === "completed" ? "#2d6a1f" : "#5a6b58",
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Suspense fallback={null}><Pagination total={total} pages={pages} page={page} basePath="/billing?tab=payments" /></Suspense>
        </div>
      </div>
    </>
  );
}
export default function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; page?: string; status?: string }>;
}) {
  return (
    <PermissionGuard resource="billing" action="read">
      <BillingPageContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
