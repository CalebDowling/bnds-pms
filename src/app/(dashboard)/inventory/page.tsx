import Link from "next/link";
import {
  Plus,
  Package,
  Boxes,
  CalendarClock,
  AlertTriangle,
  Search,
  ChevronRight,
} from "lucide-react";
import { getItems, getInventoryStats } from "./actions";
import { formatDate } from "@/lib/utils";
import { formatDrugName } from "@/lib/utils/formatters";
import SearchBarPlain from "@/components/ui/SearchBarPlain";
import ExportButton from "@/components/ui/ExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import StatsRow from "@/components/layout/StatsRow";
import { Suspense } from "react";

// BNDS PMS Redesign — heritage inventory palette (forest, leaf, lake, amber, burgundy)
const CATEGORY_FILTERS = [
  { value: "all", label: "All items" },
  { value: "compound_ingredient", label: "Compound" },
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
        <div className="flex items-center flex-wrap" style={{ gap: 12 }}>
          {/* Segmented tabs — paper-2 container with white surface for active tab */}
          <div
            className="inline-flex items-center"
            style={{
              gap: 2,
              padding: 3,
              backgroundColor: "#f3efe7",
              borderRadius: 8,
              border: "1px solid #e3ddd1",
            }}
          >
            {CATEGORY_FILTERS.map((f) => {
              const active = category === f.value;
              return (
                <Link
                  key={f.value}
                  href={`/inventory?category=${f.value}${search ? `&search=${search}` : ""}`}
                  className="inline-flex items-center no-underline transition-all"
                  style={{
                    gap: 6,
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
                  {f.label}
                </Link>
              );
            })}
          </div>

          {/* Search */}
          <div
            className="inline-flex items-center"
            style={{
              gap: 7,
              padding: "6px 11px",
              backgroundColor: "#ffffff",
              border: "1px solid #e3ddd1",
              borderRadius: 6,
              minWidth: 220,
              flex: "0 1 320px",
            }}
          >
            <Search size={13} style={{ color: "#6b7a72" }} strokeWidth={2} />
            <Suspense fallback={null}>
              <SearchBarPlain
                placeholder="Search by name, NDC, or manufacturer…"
                basePath="/inventory"
              />
            </Suspense>
          </div>
        </div>
      }
    >
      <div
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e3ddd1",
          boxShadow: "0 1px 0 rgba(20,32,26,0.04), 0 1px 2px rgba(20,32,26,0.04)",
        }}
      >
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <p style={{ color: "#6b7a72", fontSize: 14 }}>
              {search ? "No items match your search" : "No items yet"}
            </p>
            {!search && (
              <Link
                href="/inventory/new"
                className="inline-block mt-2 hover:underline"
                style={{ color: "#1f5a3a", fontSize: 13, fontWeight: 600 }}
              >
                Add your first item
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full"
              style={{ fontSize: 13, borderCollapse: "collapse" }}
            >
              <thead>
                <tr style={{ backgroundColor: "#faf8f4" }}>
                  <th style={th()}>NDC</th>
                  <th style={th()}>Product</th>
                  <th style={th({ textAlign: "right", numeric: true })}>On hand</th>
                  <th style={th({ textAlign: "right", numeric: true })}>Reorder</th>
                  <th style={th()}>Status</th>
                  <th style={th()}>Tags</th>
                  <th style={th()}>Earliest exp</th>
                  <th style={th({ width: 36 })}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const onHand = Number(item.totalOnHand) || 0;
                  const reorderPt = item.reorderPoint
                    ? Number(item.reorderPoint)
                    : null;
                  const stockStatus =
                    onHand <= 0
                      ? "out"
                      : item.isLow
                        ? "low"
                        : "ok";
                  return (
                    <tr key={item.id}>
                      <td
                        style={{
                          ...td(),
                          fontSize: 12,
                          color: "#6b7a72",
                          fontFamily:
                            "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace",
                        }}
                      >
                        {item.ndc || "—"}
                      </td>
                      <td style={td()}>
                        <Link
                          href={`/inventory/${item.id}`}
                          className="no-underline"
                          style={{ color: "#14201a" }}
                        >
                          <div style={{ fontWeight: 500, color: "#14201a" }}>
                            {formatDrugName(item.name)}
                            {item.strength ? ` ${item.strength}` : ""}
                          </div>
                          {item.manufacturer && (
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "#6b7a72",
                                marginTop: 1,
                              }}
                            >
                              {item.manufacturer}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td
                        style={td({
                          textAlign: "right",
                          numeric: true,
                          fontWeight: 500,
                        })}
                      >
                        <span
                          style={{
                            color: stockStatus !== "ok" ? "#7a2818" : "#14201a",
                          }}
                        >
                          {onHand}
                        </span>
                        {item.unitOfMeasure && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "#a3aea7",
                              marginLeft: 4,
                            }}
                          >
                            {item.unitOfMeasure}
                          </span>
                        )}
                      </td>
                      <td style={td({ textAlign: "right", numeric: true })}>
                        <span style={{ color: "#6b7a72" }}>
                          {reorderPt ?? "—"}
                        </span>
                      </td>
                      <td style={td()}>
                        <StockPill status={stockStatus} />
                      </td>
                      <td style={td()}>
                        <div className="flex flex-wrap" style={{ gap: 4 }}>
                          {item.isCompoundIngredient && <TagPill tone="info" label="CPD" />}
                          {item.isRefrigerated && <TagPill tone="info" label="COLD" />}
                          {item.deaSchedule && (
                            <TagPill tone="warn" label={`C-${item.deaSchedule}`} />
                          )}
                        </div>
                      </td>
                      <td style={td()}>
                        <span style={{ fontSize: 11.5, color: "#6b7a72" }}>
                          {item.earliestExpiry
                            ? formatDate(item.earliestExpiry)
                            : "—"}
                        </span>
                      </td>
                      <td style={td({ width: 36 })}>
                        <Link
                          href={`/inventory/${item.id}`}
                          className="inline-flex items-center"
                          style={{ color: "#a3aea7" }}
                          aria-label="Open item"
                        >
                          <ChevronRight size={16} strokeWidth={2} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Footer */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: "10px 14px",
            borderTop: "1px solid #e3ddd1",
            fontSize: 12,
            color: "#6b7a72",
          }}
        >
          <div>
            {total === 0
              ? "No items"
              : `Showing ${(page - 1) * 25 + 1}–${Math.min(page * 25, total)} of ${total.toLocaleString()}`}
          </div>
          <div className="flex" style={{ gap: 6 }}>
            {page > 1 ? (
              <Link
                href={`/inventory?${new URLSearchParams({
                  ...(category !== "all" ? { category } : {}),
                  ...(search ? { search } : {}),
                  ...(page - 1 > 1 ? { page: String(page - 1) } : {}),
                }).toString()}`}
                className="inline-flex items-center no-underline"
                style={paginationGhost}
              >
                Prev
              </Link>
            ) : (
              <span style={{ ...paginationGhost, color: "#a3aea7" }}>Prev</span>
            )}
            {page < pages ? (
              <Link
                href={`/inventory?${new URLSearchParams({
                  ...(category !== "all" ? { category } : {}),
                  ...(search ? { search } : {}),
                  page: String(page + 1),
                }).toString()}`}
                className="inline-flex items-center no-underline"
                style={paginationActive}
              >
                Next
              </Link>
            ) : (
              <span
                style={{
                  ...paginationActive,
                  color: "#a3aea7",
                  backgroundColor: "#faf8f4",
                }}
              >
                Next
              </span>
            )}
          </div>
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

// ─── Inline helpers (shared with patients/prescriptions style) ─────────────

function th({
  width,
  textAlign = "left",
  numeric = false,
}: {
  width?: number;
  textAlign?: "left" | "right" | "center";
  numeric?: boolean;
} = {}): React.CSSProperties {
  return {
    width,
    textAlign,
    padding: "10px 12px",
    fontSize: 11.5,
    fontWeight: 500,
    color: "#6b7a72",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderBottom: "1px solid #e3ddd1",
    backgroundColor: "#faf8f4",
    fontVariantNumeric: numeric ? "tabular-nums" : undefined,
  };
}

function td({
  width,
  textAlign = "left",
  numeric = false,
  fontWeight,
}: {
  width?: number;
  textAlign?: "left" | "right" | "center";
  numeric?: boolean;
  fontWeight?: number;
} = {}): React.CSSProperties {
  return {
    width,
    textAlign,
    padding: "12px",
    borderBottom: "1px solid #e3ddd1",
    verticalAlign: "middle",
    fontWeight,
    fontVariantNumeric: numeric ? "tabular-nums" : undefined,
  };
}

const paginationGhost: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 12.5,
  fontWeight: 500,
  color: "#3a4a42",
  backgroundColor: "transparent",
  border: "1px solid transparent",
  borderRadius: 6,
};

const paginationActive: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 12.5,
  fontWeight: 500,
  color: "#14201a",
  backgroundColor: "#ffffff",
  border: "1px solid #d8d1c2",
  borderRadius: 6,
};

function StockPill({ status }: { status: "ok" | "low" | "out" }) {
  const palette = {
    ok: { bg: "#e8f3e2", fg: "#174530", border: "rgba(90,168,69,0.2)", dot: "#2f8f56", label: "OK" },
    low: { bg: "#fdf3dc", fg: "#7a5408", border: "#f1d99c", dot: "#c98a14", label: "Low" },
    out: { bg: "#fbe6e0", fg: "#7a2818", border: "#f0bdaf", dot: "#b8442e", label: "Out" },
  }[status];
  return (
    <span
      className="inline-flex items-center"
      style={{
        gap: 5,
        padding: "3px 8px",
        borderRadius: 999,
        backgroundColor: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        fontSize: 11.5,
        fontWeight: 500,
        lineHeight: 1.3,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          backgroundColor: palette.dot,
          display: "inline-block",
        }}
      />
      {palette.label}
    </span>
  );
}

function TagPill({
  tone,
  label,
}: {
  tone: "info" | "warn" | "mute";
  label: string;
}) {
  const palette = {
    info: { bg: "#e0eef9", fg: "#19476b", border: "#b6d4ec" },
    warn: { bg: "#fdf3dc", fg: "#7a5408", border: "#f1d99c" },
    mute: { bg: "#f3efe7", fg: "#6b7a72", border: "#e3ddd1" },
  }[tone];
  return (
    <span
      className="inline-flex items-center"
      style={{
        padding: "1px 6px",
        borderRadius: 999,
        backgroundColor: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.04em",
        lineHeight: 1.3,
      }}
    >
      {label}
    </span>
  );
}
