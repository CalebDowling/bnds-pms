import Link from "next/link";
import { Plus, Clock, Truck, PackageCheck, CalendarClock } from "lucide-react";
import { getShipments, getShippingStats } from "./actions";
import { formatDate } from "@/lib/utils";
import { formatPatientName } from "@/lib/utils/formatters";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import StatsRow from "@/components/layout/StatsRow";
import { Suspense } from "react";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

// BNDS PMS Redesign — heritage shipping palette (warn=amber, info=lake, ok=forest, danger=burgundy)
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "rgba(212,138,40,0.14)", color: "#8a5a17" },
  packed: { label: "Packed", bg: "rgba(56,109,140,0.12)", color: "#2c5e7a" },
  shipped: { label: "Shipped", bg: "rgba(56,109,140,0.18)", color: "#2c5e7a" },
  in_transit: { label: "In Transit", bg: "rgba(56,109,140,0.18)", color: "#2c5e7a" },
  delivered: { label: "Delivered", bg: "rgba(31,90,58,0.14)", color: "#1f5a3a" },
  returned: { label: "Returned", bg: "rgba(184,58,47,0.10)", color: "#9a2c1f" },
  cancelled: { label: "Cancelled", bg: "rgba(122,138,120,0.14)", color: "#5a6b58" },
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
      eyebrow="Operations"
      title="Shipping"
      subtitle="Manage shipments and deliveries"
      actions={
        <Link
          href="/shipping/new"
          className="inline-flex items-center gap-1.5 rounded-md font-semibold no-underline transition-colors"
          style={{
            backgroundColor: "#1f5a3a",
            color: "#ffffff",
            border: "1px solid #1f5a3a",
            padding: "7px 13px",
            fontSize: 13,
          }}
        >
          <Plus size={14} strokeWidth={2} /> New Shipment
        </Link>
      }
      stats={
        <StatsRow
          stats={[
            { label: "Pending", value: stats.pending, icon: <Clock size={12} />, accent: stats.pending > 0 ? "#d48a28" : undefined },
            { label: "In Transit", value: stats.shipped, icon: <Truck size={12} />, accent: "#386d8c" },
            { label: "Delivered", value: stats.delivered, icon: <PackageCheck size={12} />, accent: "#1f5a3a" },
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
            <div
              className="inline-flex items-center flex-wrap"
              style={{
                gap: 2,
                padding: 3,
                backgroundColor: "#f3efe7",
                borderRadius: 8,
                border: "1px solid #e3ddd1",
              }}
            >
              {STATUS_FILTERS.map((s) => {
                const active = status === s;
                return (
                  <Link
                    key={s}
                    href={`/shipping?status=${s}${search ? `&search=${search}` : ""}`}
                    className="inline-flex items-center no-underline transition-all"
                    style={{
                      padding: "6px 12px",
                      fontSize: 12.5,
                      fontWeight: active ? 600 : 500,
                      color: active ? "#14201a" : "#6b7a72",
                      backgroundColor: active ? "#ffffff" : "transparent",
                      borderRadius: 6,
                      boxShadow: active
                        ? "0 1px 0 rgba(20,32,26,0.04), 0 1px 2px rgba(20,32,26,0.04)"
                        : "none",
                    }}
                  >
                    {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Link>
                );
              })}
            </div>
          }
        />
      }
    >
      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        {shipments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg mb-2" style={{ color: "#7a8a78" }}>
              {search ? "No shipments match your search" : "No shipments yet"}
            </p>
            {!search && (
              <Link
                href="/shipping/new"
                className="text-sm font-semibold hover:underline"
                style={{ color: "#1f5a3a" }}
              >
                Create first shipment
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e3ddd1", backgroundColor: "#f4ede0" }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Patient</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Carrier</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Tracking #</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Destination</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Ship Date</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Tags</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s, idx) => {
                  const si = STATUS_CONFIG[s.status] || { label: s.status, bg: "rgba(122,138,120,0.14)", color: "#5a6b58" };
                  return (
                    <tr
                      key={s.id}
                      className="transition-colors"
                      style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/shipping/${s.id}`}
                          className="hover:underline"
                          style={{ color: "#0f2e1f", fontWeight: 500 }}
                        >
                          {formatPatientName({ firstName: s.patient.firstName, lastName: s.patient.lastName }, { format: "last-first" })}
                        </Link>
                        <p style={{ color: "#7a8a78", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{s.patient.mrn}</p>
                      </td>
                      <td className="px-4 py-3 uppercase" style={{ color: "#5a6b58" }}>{s.carrier}</td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{s.trackingNumber || "—"}</td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>
                        {s.address ? `${s.address.city}, ${s.address.state}` : "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{s.shipDate ? formatDate(s.shipDate) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {s.requiresColdChain && (
                            <span
                              className="inline-flex items-center"
                              style={{
                                backgroundColor: "rgba(56,109,140,0.12)",
                                color: "#2c5e7a",
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: 4,
                                letterSpacing: "0.04em",
                              }}
                            >
                              COLD
                            </span>
                          )}
                          {s.requiresSignature && (
                            <span
                              className="inline-flex items-center"
                              style={{
                                backgroundColor: "rgba(212,138,40,0.14)",
                                color: "#8a5a17",
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: 4,
                                letterSpacing: "0.04em",
                              }}
                            >
                              SIG REQ
                            </span>
                          )}
                        </div>
                      </td>
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
