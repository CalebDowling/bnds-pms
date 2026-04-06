import {
  getControlledSubstanceLog,
  getDEAStats,
  getTodayDEAStats,
  getDiscrepancies,
} from "./actions";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import { Suspense } from "react";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

const SCHEDULE_CONFIG: Record<string, { label: string; color: string }> = {
  II: { label: "Schedule II", color: "bg-red-50 text-red-700" },
  III: { label: "Schedule III", color: "bg-orange-50 text-orange-700" },
  IV: { label: "Schedule IV", color: "bg-yellow-50 text-yellow-700" },
  V: { label: "Schedule V", color: "bg-blue-50 text-blue-700" },
};

async function DEALogPageContent({
  searchParams,
}: {
  searchParams: Promise<{
    schedule?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const schedule = params.schedule || "";
  const startDate = params.startDate || "";
  const endDate = params.endDate || "";
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);

  const [
    { fills, total, pages },
    stats,
    todayStats,
    discrepancies,
  ] = await Promise.all([
    getControlledSubstanceLog({
      schedule: schedule || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
      page,
    }),
    getDEAStats(startDate || undefined, endDate || undefined),
    getTodayDEAStats(),
    getDiscrepancies(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DEA Controlled Substance Log</h1>
          <p className="text-sm text-gray-500 mt-1">Track Schedule II-V prescriptions dispensed</p>
        </div>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 p-4">
          <p className="text-xs font-semibold text-red-700 uppercase">Schedule II Today</p>
          <p className="text-3xl font-bold text-red-900 mt-2">{todayStats.scheduleIIQuantity}</p>
          <p className="text-xs text-red-600 mt-1">Units dispensed</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl border border-orange-200 p-4">
          <p className="text-xs font-semibold text-orange-700 uppercase">Schedule III-V Today</p>
          <p className="text-3xl font-bold text-orange-900 mt-2">{todayStats.scheduleIIIVQuantity}</p>
          <p className="text-xs text-orange-600 mt-1">Units dispensed</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl border border-yellow-200 p-4">
          <p className="text-xs font-semibold text-yellow-700 uppercase">Discrepancies Flagged</p>
          <p className="text-3xl font-bold text-yellow-900 mt-2">{discrepancies.length}</p>
          <p className="text-xs text-yellow-600 mt-1">Requiring review</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Suspense fallback={null}>
              <SearchBar placeholder="Search by patient name, MRN, or drug name..." basePath="/compliance/dea-log" />
            </Suspense>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="text-sm text-gray-600">Schedule:</label>
            {["", "II", "III", "IV", "V"].map((s) => (
              <Link
                key={s || "all"}
                href={`/compliance/dea-log?schedule=${s}${
                  startDate ? `&startDate=${startDate}` : ""
                }${endDate ? `&endDate=${endDate}` : ""}${search ? `&search=${search}` : ""}`}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  schedule === s ? "bg-[#40721D] text-white border-[#40721D]" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s || "All"}
              </Link>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">From:</label>
              <form className="flex gap-2">
                <input
                  type="date"
                  name="startDate"
                  defaultValue={startDate}
                  className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg"
                />
                <input type="hidden" name="schedule" value={schedule} />
                <input type="hidden" name="endDate" value={endDate} />
                <input type="hidden" name="search" value={search} />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#40721D] text-white text-xs rounded-lg hover:bg-[#2D5114]"
                >
                  Apply
                </button>
              </form>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">To:</label>
              <form className="flex gap-2">
                <input
                  type="date"
                  name="endDate"
                  defaultValue={endDate}
                  className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg"
                />
                <input type="hidden" name="schedule" value={schedule} />
                <input type="hidden" name="startDate" value={startDate} />
                <input type="hidden" name="search" value={search} />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#40721D] text-white text-xs rounded-lg hover:bg-[#2D5114]"
                >
                  Apply
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats for Date Range */}
      {(startDate || endDate) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase">C-II Fills</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{stats.scheduleII}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stats.quantityII} units</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase">C-III Fills</p>
            <p className="text-2xl font-bold text-orange-700 mt-1">{stats.scheduleIII}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stats.quantityIII} units</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase">C-IV Fills</p>
            <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.scheduleIV}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stats.quantityIV} units</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase">C-V Fills</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{stats.scheduleV}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stats.quantityV} units</p>
          </div>
        </div>
      )}

      {/* Log Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {fills.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg">No controlled substance entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rx #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Drug Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Schedule</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pharmacist</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fills.map((fill) => {
                  const scheduleInfo = SCHEDULE_CONFIG[fill.schedule || ""] || { label: fill.schedule || "Unknown", color: "bg-gray-100" };
                  return (
                    <tr key={fill.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(fill.date)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-[#40721D] font-medium">{fill.rxNumber}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{fill.patient}</div>
                        <div className="text-xs text-gray-400 font-mono">{fill.mrn}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{fill.drugName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${scheduleInfo.color}`}>
                          {fill.schedule}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{fill.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{fill.pharmacist}</td>
                      <td className="px-4 py-3">
                        {fill.flagged ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-full">
                            ⚠️ Flagged
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                            ✓ OK
                          </span>
                        )}
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
            <Pagination total={total} pages={pages} page={page} basePath="/compliance/dea-log" />
          </Suspense>
        </div>
      </div>

      {/* Flagged Items Section */}
      {discrepancies.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Flagged Discrepancies</h2>
          <div className="bg-yellow-50 rounded-xl border border-yellow-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-yellow-200 bg-yellow-100/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-yellow-900 uppercase">Date Flagged</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-yellow-900 uppercase">Rx #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-yellow-900 uppercase">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-yellow-900 uppercase">Drug</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-yellow-900 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yellow-100">
                {discrepancies.map((d) => (
                  <tr key={d.id} className="hover:bg-yellow-100/20">
                    <td className="px-4 py-3 text-sm text-yellow-900">{formatDate(new Date(typeof d.flaggedAt === "string" ? d.flaggedAt : new Date()))}</td>
                    <td className="px-4 py-3 text-sm font-mono text-yellow-900">{d.rxNumber}</td>
                    <td className="px-4 py-3 text-sm text-yellow-900">{d.patient}</td>
                    <td className="px-4 py-3 text-sm text-yellow-900">{d.drugName}</td>
                    <td className="px-4 py-3 text-sm text-yellow-900">{typeof d.notes === "string" ? d.notes : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DEALogPage({
  searchParams,
}: {
  searchParams: Promise<{
    schedule?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: string;
  }>;
}) {
  return (
    <PermissionGuard resource="reports" action="read">
      <DEALogPageContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
