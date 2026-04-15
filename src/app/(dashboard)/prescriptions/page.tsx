import Link from "next/link";
import { Plus } from "lucide-react";
import { getPrescriptions } from "./actions";
import { formatDate } from "@/lib/utils";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import { Suspense } from "react";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  intake: { label: "Intake", bg: "#f3f4f6", color: "#374151" },
  pending_review: { label: "Pending Review", bg: "#fefce8", color: "#a16207" },
  in_progress: { label: "In Progress", bg: "#eff6ff", color: "#1d4ed8" },
  compounding: { label: "Compounding", bg: "#faf5ff", color: "#7e22ce" },
  pending_fill: { label: "Pending Fill", bg: "#eef2ff", color: "#4338ca" },
  ready_to_fill: { label: "Ready to Fill", bg: "#eef2ff", color: "#4338ca" },
  filling: { label: "Filling", bg: "#eff6ff", color: "#1d4ed8" },
  ready_for_verification: { label: "Needs Verification", bg: "#fff7ed", color: "#c2410c" },
  verified: { label: "Verified", bg: "#ecfeff", color: "#0e7490" },
  ready: { label: "Ready", bg: "var(--green-100)", color: "var(--green-700)" },
  on_hold: { label: "On Hold", bg: "#fef2f2", color: "#b91c1c" },
  dispensed: { label: "Dispensed", bg: "var(--green-100)", color: "var(--green-700)" },
  shipped: { label: "Shipped", bg: "#ecfeff", color: "#0e7490" },
  delivered: { label: "Delivered", bg: "var(--green-100)", color: "var(--green-700)" },
  cancelled: { label: "Cancelled", bg: "rgba(0,0,0,0.05)", color: "#6b7280" },
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "intake", label: "Intake" },
  { value: "in_progress", label: "In Progress" },
  { value: "ready_to_fill", label: "Ready to Fill" },
  { value: "compounding", label: "Compounding" },
  { value: "ready_for_verification", label: "Needs Verification" },
  { value: "ready", label: "Ready" },
  { value: "on_hold", label: "On Hold" },
  { value: "dispensed", label: "Dispensed" },
  { value: "shipped", label: "Shipped" },
];

async function PrescriptionsContent({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const status = params.status || "all";

  const { prescriptions, total, pages } = await getPrescriptions({ search, status, page });

  return (
    <PageShell
      title="Prescriptions"
      subtitle={`${total.toLocaleString()} prescription${total === 1 ? "" : "s"}`}
      actions={
        <>
          <ExportButton
            endpoint="/api/export/prescriptions"
            filename={`prescriptions_${new Date().toISOString().split("T")[0]}`}
            sheetName="Prescriptions"
            params={{ status, search }}
          />
          <Link
            href="/prescriptions/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white no-underline transition-colors"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Plus size={14} /> New Prescription
          </Link>
        </>
      }
      toolbar={
        <FilterBar
          search={
            <Suspense fallback={null}>
              <SearchBar
                placeholder="Search by Rx#, patient name, or MRN..."
                basePath="/prescriptions"
              />
            </Suspense>
          }
          filters={
            <>
              {STATUS_FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={`/prescriptions?status=${f.value}${search ? `&search=${search}` : ""}`}
                  className="px-3 py-1 text-xs font-semibold rounded-full border no-underline transition-colors"
                  style={{
                    backgroundColor: status === f.value ? "var(--color-primary)" : "transparent",
                    color: status === f.value ? "#fff" : "var(--text-secondary)",
                    borderColor: status === f.value ? "var(--color-primary)" : "var(--border)",
                  }}
                >
                  {f.label}
                </Link>
              ))}
            </>
          }
        />
      }
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        {prescriptions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg mb-2" style={{ color: "var(--text-muted)" }}>
              {search ? "No prescriptions match your search" : "No prescriptions yet"}
            </p>
            {!search && (
              <Link
                href="/prescriptions/new"
                className="text-sm font-semibold hover:underline"
                style={{ color: "var(--color-primary)" }}
              >
                Create the first prescription
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--green-50)" }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Rx #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Medication</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Prescriber</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx, idx) => {
                  const statusConfig = STATUS_CONFIG[rx.status] || { label: rx.status, bg: "rgba(0,0,0,0.05)", color: "#6b7280" };
                  return (
                    <tr
                      key={rx.id}
                      className="transition-colors"
                      style={{ borderTop: idx > 0 ? "1px solid var(--border-light)" : undefined }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/prescriptions/${rx.id}`}
                          className="text-sm font-mono font-semibold hover:underline"
                          style={{ color: "var(--color-primary)" }}
                        >
                          {rx.rxNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{rx.patient.firstName} {rx.patient.lastName}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{rx.patient.mrn}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{rx.item?.name || rx.formula?.name || "—"}</p>
                        {rx.item?.strength && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{rx.item.strength}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {rx.prescriber.firstName} {rx.prescriber.lastName}{rx.prescriber.suffix ? `, ${rx.prescriber.suffix}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{formatDate(rx.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full"
                          style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                        >
                          {statusConfig.label}
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
          <Suspense fallback={null}>
            <Pagination total={total} pages={pages} page={page} basePath="/prescriptions" />
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  return (
    <PermissionGuard resource="prescriptions" action="read">
      <PrescriptionsContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
