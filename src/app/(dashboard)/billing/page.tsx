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

const CLAIM_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-50 text-yellow-700" },
  submitted: { label: "Submitted", color: "bg-blue-50 text-blue-700" },
  accepted: { label: "Accepted", color: "bg-green-50 text-green-700" },
  paid: { label: "Paid", color: "bg-green-100 text-green-800" },
  partial: { label: "Partial Pay", color: "bg-orange-50 text-orange-700" },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-700" },
  reversed: { label: "Reversed", color: "bg-gray-100 text-gray-600" },
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
      title="Billing"
      subtitle="Claims, payments, and revenue"
      stats={
        <StatsRow
          stats={[
            {
              label: "Pending Claims",
              value: stats.pendingClaims,
              icon: <Clock size={12} />,
              accent: stats.pendingClaims > 0 ? "#eab308" : undefined,
            },
            {
              label: "Rejected Claims",
              value: stats.rejectedClaims,
              icon: <XCircle size={12} />,
              accent: stats.rejectedClaims > 0 ? "#dc2626" : undefined,
            },
            {
              label: "Outstanding",
              value: `$${stats.totalOutstanding.toFixed(2)}`,
              icon: <DollarSign size={12} />,
              accent: stats.totalOutstanding > 0 ? "#ea580c" : undefined,
            },
            {
              label: "Payments (Month)",
              value: `$${stats.paymentsThisMonthAmount.toFixed(2)}`,
              icon: <TrendingUp size={12} />,
              accent: "var(--color-primary)",
              sub: `${stats.paymentsThisMonth} transactions`,
            },
          ]}
        />
      }
      toolbar={
        <FilterBar
          filters={
            <>
              {[{ id: "claims", label: "Claims" }, { id: "payments", label: "Payments" }].map((t) => (
                <Link
                  key={t.id}
                  href={`/billing?tab=${t.id}`}
                  className="px-4 py-1.5 text-xs font-semibold rounded-full border no-underline transition-colors"
                  style={{
                    backgroundColor: tab === t.id ? "var(--color-primary)" : "transparent",
                    color: tab === t.id ? "#fff" : "var(--text-secondary)",
                    borderColor: tab === t.id ? "var(--color-primary)" : "var(--border)",
                  }}
                >
                  {t.label}
                </Link>
              ))}
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
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-4 mb-3">
          <Suspense fallback={null}>
            <SearchBar placeholder="Search by claim number..." basePath="/billing?tab=claims" />
          </Suspense>
        </div>
        <div className="flex flex-wrap gap-2">
          {CLAIM_FILTERS.map((s) => (
            <Link key={s} href={`/billing?tab=claims&status=${s}${search ? `&search=${search}` : ""}`}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                status === s ? "bg-[#40721D] text-white border-[#40721D]" : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}>
              {s === "all" ? "All" : s.replace(/\b\w/g, (c) => c.toUpperCase())}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {claims.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg">No claims found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Claim #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Drug</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Billed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Paid</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Copay</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {claims.map((c) => {
                  const si = CLAIM_STATUS[c.status] || { label: c.status, color: "bg-gray-100 text-gray-700" };
                  const fill = c.fills?.[0];
                  const rawDrugName = fill?.prescription?.item?.name || fill?.prescription?.formula?.name || "—";
                  const drugName = rawDrugName === "—" ? rawDrugName : formatDrugName(rawDrugName);
                  const rxNumber = fill?.prescription?.rxNumber;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => {}}>
                      <td className="px-4 py-3">
                        <Link href={`/billing/${c.id}`} className="text-sm font-mono text-[#40721D] hover:underline">{c.claimNumber || c.id.slice(0, 8)}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{formatPatientName({ firstName: c.insurance.patient.firstName, lastName: c.insurance.patient.lastName }, { format: "last-first" })}</p>
                        <p className="text-xs text-gray-400 font-mono">{c.insurance.patient.mrn}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{drugName}</p>
                        {rxNumber && <p className="text-xs text-gray-400">Rx# {rxNumber}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.insurance.thirdPartyPlan?.planName || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">${Number(c.amountBilled).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.amountPaid ? `$${Number(c.amountPaid).toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.patientCopay ? `$${Number(c.patientCopay).toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${si.color}`}>{si.label}</span>
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
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by reference # or patient name..." basePath="/billing?tab=payments" />
        </Suspense>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {payments.length === 0 ? (
          <div className="p-12 text-center"><p className="text-gray-400 text-lg">No payments found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rx #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Processed By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{formatPatientName({ firstName: p.patient.firstName, lastName: p.patient.lastName }, { format: "last-first" })}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.patient.mrn}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-700">${Number(p.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{p.paymentMethod.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{p.referenceNumber || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.fill ? `Rx# ${p.fill.prescription.rxNumber}` : "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {p.processor ? formatPatientName({ firstName: p.processor.firstName, lastName: p.processor.lastName }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(p.processedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                        p.status === "completed" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>{p.status}</span>
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
