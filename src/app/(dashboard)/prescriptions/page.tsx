import Link from "next/link";
import { getPrescriptions } from "./actions";
import { formatDate } from "@/lib/utils";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";
import { Suspense } from "react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  intake: { label: "Intake", color: "bg-gray-100 text-gray-700" },
  pending_review: { label: "Pending Review", color: "bg-yellow-50 text-yellow-700" },
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700" },
  compounding: { label: "Compounding", color: "bg-purple-50 text-purple-700" },
  pending_fill: { label: "Pending Fill", color: "bg-indigo-50 text-indigo-700" },
  ready_to_fill: { label: "Ready to Fill", color: "bg-indigo-50 text-indigo-700" },
  filling: { label: "Filling", color: "bg-blue-50 text-blue-700" },
  ready_for_verification: { label: "Needs Verification", color: "bg-orange-50 text-orange-700" },
  verified: { label: "Verified", color: "bg-teal-50 text-teal-700" },
  ready: { label: "Ready", color: "bg-green-50 text-green-700" },
  on_hold: { label: "On Hold", color: "bg-red-50 text-red-700" },
  dispensed: { label: "Dispensed", color: "bg-green-100 text-green-800" },
  shipped: { label: "Shipped", color: "bg-cyan-50 text-cyan-700" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500" },
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-sm text-gray-500 mt-1">{total} prescriptions</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            endpoint="/api/export/prescriptions"
            filename={`prescriptions_${new Date().toISOString().split("T")[0]}`}
            sheetName="Prescriptions"
            params={{
              status,
              search,
            }}
          />
          <Link
            href="/prescriptions/new"
            className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors"
          >
            + New Prescription
          </Link>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-4 mb-3">
          <Suspense fallback={null}>
            <SearchBar
              placeholder="Search by Rx#, patient name, or MRN..."
              basePath="/prescriptions"
            />
          </Suspense>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/prescriptions?status=${f.value}${search ? `&search=${search}` : ""}`}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                status === f.value
                  ? "bg-[#40721D] text-white border-[#40721D]"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {prescriptions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">
              {search ? "No prescriptions match your search" : "No prescriptions yet"}
            </p>
            {!search && (
              <Link href="/prescriptions/new" className="text-[#40721D] text-sm font-medium hover:underline">
                Create the first prescription
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rx #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Medication</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prescriber</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prescriptions.map((rx) => {
                  const statusConfig = STATUS_CONFIG[rx.status] || { label: rx.status, color: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={rx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/prescriptions/${rx.id}`} className="text-sm font-mono font-semibold text-[#40721D] hover:underline">
                          {rx.rxNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{rx.patient.firstName} {rx.patient.lastName}</p>
                        <p className="text-xs text-gray-400">{rx.patient.mrn}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{rx.item?.name || rx.formula?.name || "—"}</p>
                        {rx.item?.strength && <p className="text-xs text-gray-400">{rx.item.strength}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{rx.prescriber.firstName} {rx.prescriber.lastName}{rx.prescriber.suffix ? `, ${rx.prescriber.suffix}` : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{formatDate(rx.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
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
    </div>
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
