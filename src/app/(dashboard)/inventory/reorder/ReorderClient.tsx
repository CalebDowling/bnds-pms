"use client";

/**
 * Reorder client shell.
 *
 * Receives a fully-formatted list of reorder alerts from the server
 * page and renders the suggestion table + cart sidebar. Auto-builds
 * the cart with all out/critical items checked by default — the most
 * common operator workflow is "send orders for everything that's
 * critical right now."
 *
 * Replaces the previous mock-data shell with a 6-row hardcoded ITEMS
 * array.
 */
import * as React from "react";
import { DesignPage, I } from "@/components/design";

export interface ReorderRow {
  itemId: string;
  ndc: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  unitOfMeasure: string;
  vendor: string;
  urgency: number;
  status: "out" | "critical" | "low";
}

interface Props {
  rows: ReorderRow[];
  outOfStockCount: number;
  belowParCount: number;
}

export default function ReorderClient({ rows, outOfStockCount, belowParCount }: Props) {
  // Default: auto-check items that are out or critical. Operator can
  // uncheck per-row before sending.
  const initialCart = React.useMemo<Record<string, boolean>>(() => {
    const c: Record<string, boolean> = {};
    for (const r of rows) {
      if (r.status === "out" || r.status === "critical") c[r.itemId] = true;
    }
    return c;
  }, [rows]);

  const [cart, setCart] = React.useState<Record<string, boolean>>(initialCart);
  const cartRows = rows.filter((r) => cart[r.itemId]);

  const toggle = (id: string) => setCart((c) => ({ ...c, [id]: !c[id] }));

  return (
    <DesignPage
      sublabel="Operations"
      title="Reorder"
      subtitle={`${belowParCount.toLocaleString()} SKUs below par · ${outOfStockCount} out of stock`}
      actions={
        <>
          <a href="/inventory/orders" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Vendor history
          </a>
          <a
            href={`/inventory/orders?build=${cartRows.map((r) => r.itemId).join(",")}`}
            className="btn btn-primary btn-sm"
            style={{ textDecoration: "none", pointerEvents: cartRows.length === 0 ? "none" : undefined, opacity: cartRows.length === 0 ? 0.5 : 1 }}
          >
            <I.Send className="ic-sm" /> Build PO ({cartRows.length})
          </a>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Suggestions table */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Suggested orders</div>
            <div className="t-xs">Sorted by urgency · {rows.length} items</div>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              All items are above par. Nothing to reorder.
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Item</th>
                  <th>NDC</th>
                  <th className="t-num" style={{ textAlign: "right" }}>
                    On hand
                  </th>
                  <th className="t-num" style={{ textAlign: "right" }}>
                    Par
                  </th>
                  <th className="t-num" style={{ textAlign: "right" }}>
                    Suggest
                  </th>
                  <th>Status</th>
                  <th>Vendor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.itemId}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!cart[r.itemId]}
                        onChange={() => toggle(r.itemId)}
                      />
                    </td>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td className="bnds-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                      {r.ndc}
                    </td>
                    <td className="t-num" style={{ textAlign: "right" }}>
                      {r.currentStock.toLocaleString()}
                    </td>
                    <td className="t-num" style={{ textAlign: "right", color: "var(--ink-3)" }}>
                      {r.reorderPoint.toLocaleString()}
                    </td>
                    <td className="t-num" style={{ textAlign: "right", fontWeight: 500 }}>
                      {r.suggestedQuantity.toLocaleString()} {r.unitOfMeasure}
                    </td>
                    <td>
                      {r.status === "out" && (
                        <span className="pill pill-danger">
                          <span className="dot dot-danger" />
                          Out
                        </span>
                      )}
                      {r.status === "critical" && (
                        <span className="pill pill-warn">
                          <span className="dot dot-warn" />
                          Critical
                        </span>
                      )}
                      {r.status === "low" && (
                        <span className="pill pill-mute">
                          <span className="dot" />
                          Low
                        </span>
                      )}
                    </td>
                    <td className="t-xs">{r.vendor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cart sidebar */}
        <div className="card" style={{ padding: 16, position: "sticky", top: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>PO cart</div>
          <div className="t-xs" style={{ marginTop: 4 }}>
            {cartRows.length} items selected
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
            {cartRows.length === 0 ? (
              <div className="t-xs" style={{ color: "var(--ink-3)" }}>
                Tick a row to add items to the cart.
              </div>
            ) : (
              cartRows.map((r) => (
                <div key={r.itemId} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </span>
                  <span className="t-num" style={{ color: "var(--ink-3)" }}>
                    {r.suggestedQuantity} {r.unitOfMeasure}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DesignPage>
  );
}
