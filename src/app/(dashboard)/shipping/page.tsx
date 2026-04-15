import Link from "next/link";
import { Plus, Clock, Truck, PackageCheck, CalendarClock } from "lucide-react";
import { getShipments, getShippingStats } from "./actions";
import { formatDate } from "@/lib/utils";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import StatsRow from "@/components/layout/StatsRow";
import { Suspense } from "react";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "#fefce8", color: "#a16207" },
  packed: { label: "Packed", bg: "#eff6ff", color: "#1d4ed8" },
  shipped: { label: "Shipped", bg: "#ecfeff", color: "#0e7490" },
  in_transit: { label: "In Transit", bg: "#eef2ff", color: "#4338ca" },
  delivered: { label: "Delivered", bg: "var(--green-100)", color: "var(--green-700)" },
  returned: { label: "Returned", bg: "#fef2f2", color: "#b91c1c" },
  cancelled: { label: "Cancelled", bg: "rgba(0,0,0,0.05)", color: "#6b7280" },
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
    <PageShell
      title="Shipping"
      subtitle="Manage shipments and deliveries"
      actions={
        <Link
          href="/shipping/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white no-underline transition-colors"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <Plus size={14} /> New Shipment
        </Link>
      }
      stats={
        <StatsRow
          stats={[
            { label: "Pending", value: stats.pending, icon: <Clock size={12} />, accent: stats.pending > 0 ? "#eab308" : undefined },
            { label: "In Transit", value: stats.shipped, icon: <Truck size={12} /> },
            { label: "Delivered", value: stats.delivered, icon: <PackageCheck size={12} />, accent: "var(--color-primary)" },
            { label: "Shipped Today", value: stats.shippedToday, icon: <CalendarClock size={12} /> },
          ]}
        />
      }
      toolbar={
        <FilterBar
          search={
            <Suspense fallback={null}>
              <SearchBar placeholder="Search by tracking #, patient name, or MRN..." basePath="/shipping" />
            </Suspense>
          }
          filters={
            <>
              {STATUS_FILTERS.map((s) => (
                <Link
                  key={s}
                  href={`/shipping?status=${s}${search ? `&search=${search}` : ""}`}
                  className="px-3 py-1 text-xs font-semibold rounded-full border no-underline transition-colors"
                  style={{
                    backgroundColor: status === s ? "var(--color-primary)" : "transparent",
                    color: status === s ? "#fff" : "var(--text-secondary)",
                    borderColor: status === s ? "var(--color-primary)" : "var(--border)",
                  }}
                >
                  {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              ))}
            </>
          }
        />
      }
    >
      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
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
              <tbody>
                {shipments.map((s, idx) => {
                  const si = STATUS_CONFIG[s.status] || { label: s.status, bg: "rgba(0,0,0,0.05)", color: "#6b7280" };
                  return (
                    <tr
                      key={s.id}
                      className="transition-colors"
                      style={{ borderTop: idx > 0 ? "1px solid var(--border-light)" : undefined }}
                    >
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
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full"
                          style={{ backgroundColor: si.bg, color: si.color }}
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
          <Suspense fallback={null}>
            <Pagination total={total} pages={pages} page={page} basePath="/shipping" />
          </Suspense>
        </div>
      </div>
    </PageShell>
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
