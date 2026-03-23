import Link from "next/link";
import { getIntakeQueue, getIntakeStats, getIntakeStatsBySource } from "./actions";
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

const PRIORITY_CONFIG: Record<string, { label: string; color: string; badgeColor: string }> = {
  stat: { label: "STAT", color: "text-red-600 font-bold", badgeColor: "bg-red-100 text-red-800 border-red-300" },
  urgent: { label: "Urgent", color: "text-orange-600", badgeColor: "bg-orange-100 text-orange-800 border-orange-300" },
  normal: { label: "Normal", color: "text-gray-500", badgeColor: "bg-gray-100 text-gray-700 border-gray-300" },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  prescriber_portal: { label: "Prescriber Portal", icon: "🏥", color: "bg-green-50 text-green-700 border-green-200" },
  walk_in: { label: "Walk-in", icon: "🚶", color: "bg-blue-50 text-blue-700 border-blue-200" },
  phone: { label: "Phone/Fax", icon: "☎️", color: "bg-purple-50 text-purple-700 border-purple-200" },
  fax: { label: "Fax", icon: "📠", color: "bg-purple-50 text-purple-700 border-purple-200" },
  erx: { label: "eRx (SureScripts)", icon: "📱", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  surescripts: { label: "eRx (SureScripts)", icon: "📱", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  patient_portal: { label: "Patient Portal", icon: "👤", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  ncpdp: { label: "NCPDP", icon: "📱", color: "bg-gray-50 text-gray-700 border-gray-200" },
  epcs: { label: "EPCS", icon: "🔐", color: "bg-gray-50 text-gray-700 border-gray-200" },
  manual: { label: "Manual", icon: "✋", color: "bg-gray-50 text-gray-700 border-gray-200" },
  fhir: { label: "FHIR", icon: "🔗", color: "bg-gray-50 text-gray-700 border-gray-200" },
};

const SOURCE_FILTERS = [
  { value: "all", label: "All Sources" },
  { value: "prescriber_portal", label: "Prescriber Portal" },
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone/Fax" },
  { value: "erx", label: "eRx (SureScripts)" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "matched", label: "Matched" },
  { value: "processing", label: "Processing" },
  { value: "complete", label: "Complete" },
  { value: "error", label: "Error" },
];

const SORT_OPTIONS = [
  { value: "received", label: "Date Received (Newest)" },
  { value: "priority", label: "Priority" },
  { value: "patient", label: "Patient Name" },
];

async function IntakeQueueContent({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string; source?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const status = params.status || "all";
  const source = params.source || "all";
  const sort = params.sort || "received";

  const [{ items, total, pages }, stats, sourceStats] = await Promise.all([
    getIntakeQueue({ search, status, source, page, sort }),
    getIntakeStats(),
    getIntakeStatsBySource(),
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

        {/* Quick Stats by Source */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-600 uppercase mb-3 tracking-wide">Intake by Source</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {SOURCE_FILTERS.map((src) => {
              const count = src.value === "all"
                ? total
                : sourceStats[src.value as keyof typeof sourceStats] || 0;
              const config = src.value !== "all" ? SOURCE_CONFIG[src.value] : null;

              return (
                <div
                  key={src.value}
                  className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow"
                >
                  {config && <p className="text-lg mb-1">{config.icon}</p>}
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    {src.label === "All Sources" ? "All" : src.label}
                  </p>
                  <p className="text-xl font-bold text-gray-900 tabular-nums">{count}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Stats */}
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

        {/* Source Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="text-xs font-semibold text-gray-600 uppercase mb-3 tracking-wide">Filter by Source</div>
          <div className="flex flex-wrap gap-2">
            {SOURCE_FILTERS.map((f) => (
              <Link
                key={f.value}
                href={`/intake?source=${f.value}${status !== "all" ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}${sort !== "received" ? `&sort=${sort}` : ""}`}
                className={`px-3.5 py-1.5 text-xs rounded-full border font-medium transition-all ${
                  source === f.value
                    ? "bg-[#40721D] text-white border-[#40721D] shadow-sm"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Search, Status Filters & Sort */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex flex-col gap-4">
            <div>
              <Suspense fallback={null}>
                <SearchBar
                  placeholder="Search by patient, prescriber, or medication..."
                  basePath="/intake"
                />
              </Suspense>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-max">
                <div className="text-xs font-semibold text-gray-600 uppercase mb-2 tracking-wide">Status</div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((f) => (
                    <Link
                      key={f.value}
                      href={`/intake?status=${f.value}${source !== "all" ? `&source=${source}` : ""}${search ? `&search=${search}` : ""}${sort !== "received" ? `&sort=${sort}` : ""}`}
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

              <div className="w-full sm:w-auto">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                  Sort By
                </label>
                <div className="flex gap-1">
                  {SORT_OPTIONS.map((opt) => (
                    <Link
                      key={opt.value}
                      href={`/intake?sort=${opt.value}${source !== "all" ? `&source=${source}` : ""}${status !== "all" ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        sort === opt.value
                          ? "bg-[#40721D] text-white border-[#40721D]"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                      title={opt.label}
                    >
                      {opt.label.split("(")[0].trim()}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
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
                    const sourceConfig = SOURCE_CONFIG[item.source] || { label: item.source, icon: "📋", color: "bg-gray-50 text-gray-700 border-gray-200" };

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/intake/${item.id}`} className="text-sm font-mono text-[#40721D] hover:underline">
                            {formatDate(item.receivedAt)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm flex items-center gap-1.5">
                              <span>{sourceConfig.icon}</span>
                              <span className="text-gray-600">{sourceConfig.label}</span>
                            </span>
                            {item.source === "prescriber_portal" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                                Portal
                              </span>
                            )}
                          </div>
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
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${priorityConfig.badgeColor}`}>
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
  searchParams: Promise<{ search?: string; page?: string; status?: string; source?: string; sort?: string }>;
}) {
  return (
    <PermissionGuard resource="prescriptions" action="read">
      <IntakeQueueContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
