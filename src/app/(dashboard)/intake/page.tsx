import Link from "next/link";
import { getIntakeQueue, getIntakeStats } from "./actions";
import { formatDate } from "@/lib/utils";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import PermissionGuard from "@/components/auth/PermissionGuard";
import { Suspense } from "react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-50 text-yellow-700" },
  matched: { label: "Matched", color: "bg-blue-50 text-blue-700" },
  processing: { label: "Processing", color: "bg-purple-50 text-purple-700" },
  complete: { label: "Complete", color: "bg-green-50 text-green-700" },
  error: { label: "Error", color: "bg-red-50 text-red-700" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  stat: { label: "STAT", color: "text-red-600 font-bold" },
  urgent: { label: "Urgent", color: "text-orange-600" },
  normal: { label: "Normal", color: "text-gray-500" },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: string }> = {
  ncpdp: { label: "NCPDP", icon: "📱" },
  epcs: { label: "EPCS", icon: "🔐" },
  fax: { label: "Fax", icon: "📠" },
  manual: { label: "Manual", icon: "✋" },
  fhir: { label: "FHIR", icon: "🔗" },
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "matched", label: "Matched" },
  { value: "processing", label: "Processing" },
  { value: "complete", label: "Complete" },
  { value: "error", label: "Error" },
];

async function IntakeQueueContent({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const status = params.status || "all";

  const [{ items, total, pages }, stats] = await Promise.all([
    getIntakeQueue({ search, status, page }),
    getIntakeStats(),
  ]);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-6 py-2.5 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
        <a href="/dashboard" className="text-[var(--green-700)] no-underline font-medium hover:underline">Home</a>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <span className="text-[var(--text-secondary)] font-semibold">eRx Intake</span>
      </div>

      <div className="px-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">E-Prescribing Intake Queue</h1>
            <p className="text-sm text-gray-500 mt-1">{total} items total</p>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 tabular-nums">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Matched</p>
            <p className="text-2xl font-bold text-blue-600 tabular-nums">{stats.matched}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Processing</p>
            <p className="text-2xl font-bold text-purple-600 tabular-nums">{stats.processing}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Complete</p>
            <p className="text-2xl font-bold text-green-600 tabular-nums">{stats.complete}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Errors</p>
            <p className="text-2xl font-bold text-red-600 tabular-nums">{stats.error}</p>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-4 mb-3">
            <Suspense fallback={null}>
              <SearchBar
                placeholder="Search by patient, prescriber, or medication..."
                basePath="/intake"
              />
            </Suspense>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <Link
                key={f.value}
                href={`/intake?status=${f.value}${search ? `&search=${search}` : ""}`}
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
          {items.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-lg mb-2">
                {search ? "No intake items match your search" : "No intake items in queue"}
              </p>
              <p className="text-sm text-gray-400">
                E-prescriptions will appear here as they are received.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Received</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prescriber</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Medication</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const statusConfig = STATUS_CONFIG[item.status] || { label: item.status, color: "bg-gray-100 text-gray-700" };
                    const priorityConfig = PRIORITY_CONFIG[item.priority || "normal"] || PRIORITY_CONFIG.normal;
                    const sourceConfig = SOURCE_CONFIG[item.source] || { label: item.source, icon: "📋" };

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/intake/${item.id}`} className="text-sm font-mono text-[#40721D] hover:underline">
                            {formatDate(item.receivedAt)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm flex items-center gap-1.5">
                            <span>{sourceConfig.icon}</span>
                            <span className="text-gray-600">{sourceConfig.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{item.patientName || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600">{item.prescriberName || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600">{item.drugName || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600">
                            {item.assignee
                              ? `${item.assignee.firstName} ${item.assignee.lastName}`
                              : "—"}
                          </p>
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
              <Pagination total={total} pages={pages} page={page} basePath="/intake" />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function IntakeQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  return (
    <PermissionGuard resource="prescriptions" action="read">
      <IntakeQueueContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
