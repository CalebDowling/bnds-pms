import Link from "next/link";
import { Plus, Package, Boxes, CalendarClock, AlertTriangle } from "lucide-react";
import { getItems, getInventoryStats } from "./actions";
import { formatDate } from "@/lib/utils";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import StatsRow from "@/components/layout/StatsRow";
import { Suspense } from "react";

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
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white no-underline transition-colors"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Plus size={14} /> Add Item
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
              accent: stats.expiringSoon > 0 ? "#ea580c" : undefined,
            },
            {
              label: "Low Stock Items",
              value: stats.lowStockItems,
              icon: <AlertTriangle size={12} />,
              accent: stats.lowStockItems > 0 ? "#dc2626" : undefined,
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
              {CATEGORY_FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={`/inventory?category=${f.value}${search ? `&search=${search}` : ""}`}
                  className="px-3 py-1 text-xs font-semibold rounded-full border no-underline transition-colors"
                  style={{
                    backgroundColor: category === f.value ? "var(--color-primary)" : "transparent",
                    color: category === f.value ? "#fff" : "var(--text-secondary)",
                    borderColor: category === f.value ? "var(--color-primary)" : "var(--border)",
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
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg mb-2" style={{ color: "var(--text-muted)" }}>
              {search ? "No items match your search" : "No items yet"}
            </p>
            {!search && (
              <Link
                href="/inventory/new"
                className="text-sm font-semibold hover:underline"
                style={{ color: "var(--color-primary)" }}
              >
                Add your first item
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full responsive-table">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--green-50)" }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Item</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>NDC</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Strength</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Manufacturer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>On Hand</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Reorder Pt</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Earliest Exp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Tags</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="transition-colors"
                    style={{
                      borderTop: idx > 0 ? "1px solid var(--border-light)" : undefined,
                      backgroundColor: item.isLow ? "rgba(239,68,68,0.05)" : undefined,
                    }}
                  >
                    <td className="px-4 py-3" data-label="Item">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="text-sm font-semibold no-underline"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {item.name}
                      </Link>
                      {item.genericName && item.genericName !== item.name && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.genericName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: "var(--text-secondary)" }} data-label="NDC">{item.ndc || "—"}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }} data-label="Strength">{item.strength || "—"}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }} data-label="Manufacturer">{item.manufacturer || "—"}</td>
                    <td className="px-4 py-3" data-label="On Hand">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: item.isLow ? "#dc2626" : "var(--text-primary)" }}
                      >
                        {item.totalOnHand}
                      </span>
                      {item.unitOfMeasure && (
                        <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>{item.unitOfMeasure}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }} data-label="Reorder Pt">
                      {item.reorderPoint ? Number(item.reorderPoint) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }} data-label="Earliest Exp">
                      {item.earliestExpiry ? formatDate(item.earliestExpiry) : "—"}
                    </td>
                    <td className="px-4 py-3" data-label="Tags">
                      <div className="flex flex-wrap gap-1">
                        {item.isCompoundIngredient && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 rounded">CPD</span>
                        )}
                        {item.isRefrigerated && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded">COLD</span>
                        )}
                        {item.deaSchedule && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 rounded">C-{item.deaSchedule}</span>
                        )}
                        {item.isLow && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-800 rounded">LOW</span>
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
