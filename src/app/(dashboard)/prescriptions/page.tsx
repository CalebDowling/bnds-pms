import Link from "next/link";
import { Plus } from "lucide-react";
import { getPrescriptions } from "./actions";
import { formatDate } from "@/lib/utils";
import {
  formatPatientName,
  formatPrescriberName,
  formatDrugName,
} from "@/lib/utils/formatters";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import { Suspense } from "react";

// BNDS PMS Redesign — heritage status palette
// ok = forest, leaf = leaf-green, warn = amber, danger = burgundy, info = lake
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  intake: { label: "Intake", bg: "rgba(122,138,120,0.14)", color: "#5a6b58" },
  pending_review: { label: "Pending Review", bg: "rgba(212,138,40,0.14)", color: "#8a5a17" },
  in_progress: { label: "In Progress", bg: "rgba(56,109,140,0.12)", color: "#2c5e7a" },
  compounding: { label: "Compounding", bg: "rgba(122,138,120,0.14)", color: "#5a6b58" },
  pending_fill: { label: "Pending Fill", bg: "rgba(56,109,140,0.12)", color: "#2c5e7a" },
  ready_to_fill: { label: "Ready to Fill", bg: "rgba(56,109,140,0.12)", color: "#2c5e7a" },
  filling: { label: "Filling", bg: "rgba(56,109,140,0.12)", color: "#2c5e7a" },
  ready_for_verification: { label: "Needs Verification", bg: "rgba(212,138,40,0.14)", color: "#8a5a17" },
  verified: { label: "Verified", bg: "rgba(90,168,69,0.14)", color: "#2d6a1f" },
  ready: { label: "Ready", bg: "rgba(90,168,69,0.14)", color: "#2d6a1f" },
  on_hold: { label: "On Hold", bg: "rgba(184,58,47,0.10)", color: "#9a2c1f" },
  dispensed: { label: "Dispensed", bg: "rgba(31,90,58,0.12)", color: "#1f5a3a" },
  shipped: { label: "Shipped", bg: "rgba(56,109,140,0.12)", color: "#2c5e7a" },
  delivered: { label: "Delivered", bg: "rgba(31,90,58,0.12)", color: "#1f5a3a" },
  cancelled: { label: "Cancelled", bg: "rgba(122,138,120,0.14)", color: "#5a6b58" },
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
      eyebrow="Pharmacy"
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
            className="inline-flex items-center gap-1.5 rounded-md font-semibold no-underline transition-colors"
            style={{
              backgroundColor: "#1f5a3a",
              color: "#ffffff",
              border: "1px solid #1f5a3a",
              padding: "7px 13px",
              fontSize: 13,
            }}
          >
            <Plus size={14} strokeWidth={2} /> New Rx
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
              {STATUS_FILTERS.map((f) => {
                const active = status === f.value;
                return (
                  <Link
                    key={f.value}
                    href={`/prescriptions?status=${f.value}${search ? `&search=${search}` : ""}`}
                    className="inline-flex items-center font-medium rounded-md no-underline transition-colors"
                    style={{
                      backgroundColor: active ? "#1f5a3a" : "#ffffff",
                      color: active ? "#ffffff" : "#3a4a3c",
                      border: active ? "1px solid #1f5a3a" : "1px solid #d9d2c2",
                      padding: "5px 11px",
                      fontSize: 12,
                    }}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </>
          }
        />
      }
    >
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        {prescriptions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg mb-2" style={{ color: "#7a8a78" }}>
              {search ? "No prescriptions match your search" : "No prescriptions yet"}
            </p>
            {!search && (
              <Link
                href="/prescriptions/new"
                className="text-sm font-semibold hover:underline"
                style={{ color: "#1f5a3a" }}
              >
                Create the first prescription
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e3ddd1", backgroundColor: "#f4ede0" }}>
                  <th
                    className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase"
                    style={{ color: "#7a8a78", letterSpacing: "0.10em" }}
                  >Rx #</th>
                  <th
                    className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase"
                    style={{ color: "#7a8a78", letterSpacing: "0.10em" }}
                  >Patient</th>
                  <th
                    className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase"
                    style={{ color: "#7a8a78", letterSpacing: "0.10em" }}
                  >Medication</th>
                  <th
                    className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase"
                    style={{ color: "#7a8a78", letterSpacing: "0.10em" }}
                  >Prescriber</th>
                  <th
                    className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase"
                    style={{ color: "#7a8a78", letterSpacing: "0.10em" }}
                  >Created</th>
                  <th
                    className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase"
                    style={{ color: "#7a8a78", letterSpacing: "0.10em" }}
                  >Status</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx, idx) => {
                  const statusConfig = STATUS_CONFIG[rx.status] || { label: rx.status, bg: "rgba(122,138,120,0.14)", color: "#5a6b58" };
                  return (
                    <tr
                      key={rx.id}
                      className="transition-colors"
                      style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/prescriptions/${rx.id}`}
                          className="hover:underline"
                          style={{
                            color: "#1f5a3a",
                            fontWeight: 600,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 13,
                          }}
                        >
                          {rx.rxNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p style={{ color: "#0f2e1f", fontWeight: 500, fontSize: 13 }}>
                          {formatPatientName({ firstName: rx.patient.firstName, lastName: rx.patient.lastName })}
                        </p>
                        <p style={{ color: "#7a8a78", fontSize: 12 }}>{rx.patient.mrn}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p style={{ color: "#3a4a3c", fontSize: 13 }}>
                          {rx.item?.name ? formatDrugName(rx.item.name) : (rx.formula?.name ? formatDrugName(rx.formula.name) : "—")}
                        </p>
                        {rx.item?.strength && <p style={{ color: "#7a8a78", fontSize: 12 }}>{rx.item.strength}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p style={{ color: "#3a4a3c", fontSize: 13 }}>
                          {formatPrescriberName({ firstName: rx.prescriber.firstName, lastName: rx.prescriber.lastName })}{rx.prescriber.suffix ? `, ${rx.prescriber.suffix}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ color: "#3a4a3c", fontSize: 13 }}>{formatDate(rx.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center"
                          style={{
                            backgroundColor: statusConfig.bg,
                            color: statusConfig.color,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 999,
                          }}
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
