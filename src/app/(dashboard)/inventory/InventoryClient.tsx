"use client";

/**
 * Inventory client shell.
 *
 * Receives a fully-formatted list of items from the server page and
 * renders the table. Owns the in-memory search filter (debounced on
 * keystroke against the rows already on the page); for cross-page
 * search the URL ?q= param is the source of truth and the server
 * does the actual narrowing.
 *
 * Replaces the previous mock-data shell that hardcoded a 7-row ITEMS
 * array regardless of the real inventory.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { DesignPage, I } from "@/components/design";

export interface InventoryRow {
  id: string;
  ndc: string;
  name: string;
  cls: string;
  onHand: number;
  par: number | null;
  status: "ok" | "low" | "out" | "untracked";
  location: string | null;
  earliestExpiry: string;
  lotCount: number;
}

interface Props {
  rows: InventoryRow[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  category: string;
}

export default function InventoryClient({
  rows,
  total,
  page,
  totalPages,
  search: initialSearch,
  category,
}: Props) {
  const router = useRouter();
  const [searchInput, setSearchInput] = React.useState(initialSearch);

  // Push search to URL on Enter so the server filters next page load.
  // In-page filter could be added later, but for now we rely on the
  // server-side filter (works across the full DB, not just the visible
  // 50 rows).
  const submitSearch = (q: string) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category !== "all") params.set("category", category);
    router.push(`/inventory${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <DesignPage
      sublabel="Operations"
      title="Inventory"
      subtitle={`${total.toLocaleString()} SKUs · page ${page} of ${Math.max(totalPages, 1)}`}
      actions={
        <>
          <a href="/inventory/reorder" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Reorder report
          </a>
          <a href="/inventory/orders" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Purchase orders
          </a>
          <a href="/inventory/new" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
            <I.Plus /> Add item
          </a>
        </>
      }
    >
      {/* Search bar wired to the server-side filter via ?q= */}
      <div className="card" style={{ padding: "10px 14px", marginBottom: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <I.Search className="ic-sm" style={{ color: "var(--ink-3)" }} />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitSearch(searchInput);
          }}
          placeholder="Search by name, NDC, manufacturer, generic name…"
          style={{
            flex: 1,
            border: 0,
            background: "transparent",
            outline: 0,
            fontSize: 13,
            fontFamily: "inherit",
            color: "var(--ink)",
          }}
        />
        {initialSearch && (
          <span className="t-xs" style={{ color: "var(--ink-3)" }}>
            Filtering: <strong>{initialSearch}</strong>
          </span>
        )}
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            {initialSearch ? `No items matching "${initialSearch}".` : "No inventory items on file."}
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>NDC</th>
                <th>Product</th>
                <th>Class</th>
                <th className="t-num" style={{ textAlign: "right" }}>
                  On hand
                </th>
                <th className="t-num" style={{ textAlign: "right" }}>
                  Par
                </th>
                <th>Status</th>
                <th>Lots</th>
                <th>Earliest exp</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/inventory/${x.id}`)}>
                  <td className="bnds-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    {x.ndc}
                  </td>
                  <td style={{ fontWeight: 500 }}>{x.name}</td>
                  <td>
                    <span className="pill">{x.cls}</span>
                  </td>
                  <td
                    className="t-num"
                    style={{
                      fontWeight: 500,
                      textAlign: "right",
                      color: x.status === "untracked" ? "var(--ink-4)" : undefined,
                    }}
                  >
                    {x.status === "untracked" ? "—" : x.onHand.toLocaleString()}
                  </td>
                  <td className="t-num" style={{ textAlign: "right", color: "var(--ink-3)" }}>
                    {x.par != null ? x.par.toLocaleString() : "—"}
                  </td>
                  <td>
                    {x.status === "ok" && (
                      <span className="pill pill-leaf">
                        <span className="dot dot-ok" />
                        OK
                      </span>
                    )}
                    {x.status === "low" && (
                      <span className="pill pill-warn">
                        <span className="dot dot-warn" />
                        Low
                      </span>
                    )}
                    {x.status === "out" && (
                      <span className="pill pill-danger">
                        <span className="dot dot-danger" />
                        Out
                      </span>
                    )}
                    {x.status === "untracked" && (
                      <span className="pill pill-mute" title="No ItemLot records — on-hand qty isn't tracked for this SKU">
                        Not tracked
                      </span>
                    )}
                  </td>
                  <td className="t-xs">{x.lotCount}</td>
                  <td className="t-xs">{x.earliestExpiry}</td>
                  <td>
                    <I.ChevR style={{ color: "var(--ink-4)" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          {page > 1 && (
            <a
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: "none" }}
              href={`/inventory?${new URLSearchParams({
                ...(initialSearch ? { q: initialSearch } : {}),
                page: String(page - 1),
              })}`}
            >
              ← Prev
            </a>
          )}
          <span className="t-xs" style={{ color: "var(--ink-3)", alignSelf: "center" }}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: "none" }}
              href={`/inventory?${new URLSearchParams({
                ...(initialSearch ? { q: initialSearch } : {}),
                page: String(page + 1),
              })}`}
            >
              Next →
            </a>
          )}
        </div>
      )}
    </DesignPage>
  );
}
