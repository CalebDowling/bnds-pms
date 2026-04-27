import Link from "next/link";
import { Plus, Package, Boxes, CalendarClock, AlertTriangle } from "lucide-react";
import { getItems, getInventoryStats } from "./actions";
import { formatDate } from "@/lib/utils";
import { formatDrugName } from "@/lib/utils/formatters";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import StatsRow from "@/components/layout/StatsRow";
import { Suspense } from "react";

// BNDS PMS Redesign — heritage inventory palette (forest, leaf, lake, amber, burgundy)
const CATEGORY_FILTERS = [
  { value: "all", label: "All Items" },
  { value: "compound_ingredient", label: "Compound Ingredients" },
  { value: "controlled", label: "Controlled" },
  { value: "refrigerated", label: "Refrigerated" },
];

async function InventoryPageContent({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const category = params.category || "all";

  const [{ items, total, pages }, stats] = await Promise.all([
    getItems({ search, category, page }),
    getInventoryStats(),
  ]);

  return (
    <PageShell
      eyebrow="Operations"
      title="Inventory"
      subtitle={`${stats.totalItems.toLocaleString()} items in catalog`}
      actions={
        <>
          <ExportButton
            endpoint="/api/export/inventory"
            filename={`inventory_${new Date().toISOString().split("T")[0]}`}
            sheetName="Inventory"
            params={{ category, search }}
          />
          <Link
            href="/inventory/new"
            className="inline-flex items-center gap-1.5 rounded-md font-semibold no-underline transition-colors"
            style={{
              backgroundColor: "#1f5a3a",
              color: "#ffffff",
              border: "1px solid #1f5a3a",
              padding: "7px 13px",
              fontSize: 13,
            }}
          >
            <Plus size={14} strokeWidth={2} /> Add Item
          </Link>
        </>
      }
      stats={
        <StatsRow
          stats={[
            { label: "Total Items", value: stats.totalItems, icon: <Package size={12} /> },
            { label: "Active Lots", value: stats.totalLots, icon: <Boxes size={12} /> },
            {
              label: "Expiring (90 days)",
              value: stats.expiringSoon,
              icon: <CalendarClock size={12} />,
              accent: stats.expiringSoon > 0 ? "#d48a28" : undefined,
            },
            {
              label: "Low Stock Items",
              value: stats.lowStockItems,
              icon: <AlertTriangle size={12} />,
              accent: stats.lowStockItems > 0 ? "#9a2c1f" : undefined,
            },
          ]}
        />
      }
      toolbar={
        <FilterBar
          search={
            <Suspense fallback={null}>
              <SearchBar placeholder="Search by name, NDC, or manufacturer..." basePath="/inventory" />
            </Suspense>
          }
          filters={
            <>
              {CATEGORY_FILTERS.map((f) => {
                const active = category === f.value;
                return (
                  <Link
                    key={f.value}
                    href={`/inventory?category=${f.value}${search ? `&search=${search}` : ""}`}
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
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg mb-2" style={{ color: "#7a8a78" }}>
              {search ? "No items match your search" : "No items yet"}
            </p>
            {!search && (
              <Link
                href="/inventory/new"
                className="text-sm font-semibold hover:underline"
                style={{ color: "#1f5a3a" }}
              >
                Add your first item
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full responsive-table" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e3ddd1", backgroundColor: "#f4ede0" }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Item</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>NDC</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Strength</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Manufacturer</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>On Hand</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Reorder Pt</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Earliest Exp</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Tags</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="transition-colors"
                    style={{
                      borderTop: idx > 0 ? "1px solid #ede6d6" : undefined,
                      backgroundColor: item.isLow ? "rgba(184,58,47,0.05)" : undefined,
                    }}
                  >
                    <td className="px-4 py-3" data-label="Item">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="no-underline hover:underline"
                        style={{ color: "#0f2e1f", fontWeight: 600 }}
                      >
                        {formatDrugName(item.name)}
                      </Link>
                      {item.genericName && item.genericName !== item.name && (
                        <p className="text-xs" style={{ color: "#7a8a78" }}>{formatDrugName(item.genericName)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#3a4a3c", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }} data-label="NDC">{item.ndc || "—"}</td>
                    <td className="px-4 py-3" style={{ color: "#3a4a3c" }} data-label="Strength">{item.strength || "—"}</td>
                    <td className="px-4 py-3" style={{ color: "#3a4a3c" }} data-label="Manufacturer">{item.manufacturer || "—"}</td>
                    <td className="px-4 py-3" data-label="On Hand">
                      <span
                        className="font-semibold"
                        style={{ color: item.isLow ? "#9a2c1f" : "#0f2e1f" }}
                      >
                        {item.totalOnHand}
                      </span>
                      {item.unitOfMeasure && (
                        <span className="text-xs ml-1" style={{ color: "#7a8a78" }}>{item.unitOfMeasure}</span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#3a4a3c" }} data-label="Reorder Pt">
                      {item.reorderPoint ? Number(item.reorderPoint) : "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#3a4a3c" }} data-label="Earliest Exp">
                      {item.earliestExpiry ? formatDate(item.earliestExpiry) : "—"}
                    </td>
                    <td className="px-4 py-3" data-label="Tags">
                      <div className="flex flex-wrap gap-1">
                        {item.isCompoundIngredient && (
                          <span style={{ backgroundColor: "rgba(120,80,160,0.12)", color: "#5a4a78", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>CPD</span>
                        )}
                        {item.isRefrigerated && (
                          <span style={{ backgroundColor: "rgba(56,109,140,0.12)", color: "#2c5e7a", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>COLD</span>
                        )}
                        {item.deaSchedule && (
                          <span style={{ backgroundColor: "rgba(212,138,40,0.14)", color: "#8a5a17", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>C-{item.deaSchedule}</span>
                        )}
                        {item.isLow && (
                          <span style={{ backgroundColor: "rgba(184,58,47,0.10)", color: "#9a2c1f", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>LOW</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Suspense fallback={null}>
            <Pagination total={total} pages={pages} page={page} basePath="/inventory" />
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}

export default function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; category?: string }>;
}) {
  return (
    <PermissionGuard resource="inventory" action="read">
      <InventoryPageContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
