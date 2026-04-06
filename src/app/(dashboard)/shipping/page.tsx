import Link from "next/link";
import { getShipments, getShippingStats } from "./actions";
import { formatDate } from "@/lib/utils";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import { Suspense } from "react";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-50 text-yellow-700" },
  packed: { label: "Packed", color: "bg-blue-50 text-blue-700" },
  shipped: { label: "Shipped", color: "bg-cyan-50 text-cyan-700" },
  in_transit: { label: "In Transit", color: "bg-indigo-50 text-indigo-700" },
  delivered: { label: "Delivered", color: "bg-green-50 text-green-700" },
  returned: { label: "Returned", color: "bg-red-50 text-red-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500" },
};

const STATUS_FILTERS = ["all", "pending", "packed", "shipped", "in_transit", "delivered", "returned"];

async function ShippingPageContent({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const status = params.status || "all";

  const [{ shipments, total, pages }, stats] = await Promise.all([
    getShipments({ search, status, page }),
    getShippingStats(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping</h1>
          <p className="text-sm text-gray-500 mt-1">Manage shipments and deliveries</p>
        </div>
        <Link href="/shipping/new"
          className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors">
          + New Shipment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Pending</p>
          <p className={`text-2xl font-bold mt-1 ${stats.pending > 0 ? "text-yellow-600" : "text-gray-900"}`}>{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">In Transit</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.shipped}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Delivered</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.delivered}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Shipped Today</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.shippedToday}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-4 mb-3">
          <Suspense fallback={null}>
            <SearchBar placeholder="Search by tracking #, patient name, or MRN..." basePath="/shipping" />
          </Suspense>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <Link key={s} href={`/shipping?status=${s}${search ? `&search=${search}` : ""}`}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                status === s ? "bg-[#40721D] text-white border-[#40721D]" : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}>
              {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {shipments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">{search ? "No shipments match your search" : "No shipments yet"}</p>
            {!search && <Link href="/shipping/new" className="text-[#40721D] text-sm font-medium hover:underline">Create first shipment</Link>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Carrier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tracking #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ship Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shipments.map((s) => {
                  const si = STATUS_CONFIG[s.status] || { label: s.status, color: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/shipping/${s.id}`} className="text-sm font-medium text-gray-900 hover:text-[#40721D]">
                          {s.patient.lastName}, {s.patient.firstName}
                        </Link>
                        <p className="text-xs text-gray-400 font-mono">{s.patient.mrn}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 uppercase">{s.carrier}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{s.trackingNumber || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {s.address ? `${s.address.city}, ${s.address.state}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.shipDate ? formatDate(s.shipDate) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {s.requiresColdChain && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded">COLD</span>
                          )}
                          {s.requiresSignature && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-orange-50 text-orange-700 rounded">SIG REQ</span>
                          )}
                        </div>
                      </td>
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
          <Suspense fallback={null}>
            <Pagination total={total} pages={pages} page={page} basePath="/shipping" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
export default function ShippingPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  return (
    <PermissionGuard resource="shipping" action="read">
      <ShippingPageContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
