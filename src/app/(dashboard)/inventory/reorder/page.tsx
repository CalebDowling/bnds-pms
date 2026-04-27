"use client";

import * as React from "react";
import { DesignPage, I } from "@/components/design";

// ── Mock reorder data (mirrors design-reference/screens/operations.jsx Reorder) ──
type Status = "low" | "out" | "ok";

interface ReorderItem {
  ndc: string;
  name: string;
  onHand: number;
  par: number;
  vendor: string;
  pack: string;
  cost: number;
  lead: string;
  status: Status;
  cold?: boolean;
}

const ITEMS: ReorderItem[] = [
  { ndc: "00071-0155", name: "Atorvastatin 20mg", onHand: 88, par: 200, vendor: "McKesson", pack: "90 ct", cost: 12.4, lead: "1 day", status: "low" },
  { ndc: "00069-2940", name: "Amoxicillin 500mg", onHand: 12, par: 150, vendor: "Cardinal", pack: "500 ct", cost: 38.0, lead: "2 days", status: "low" },
  { ndc: "00169-4136", name: "Ozempic 0.5mg pen", onHand: 0, par: 8, vendor: "McKesson", pack: "1 ea", cost: 932.0, lead: "3 days", status: "out", cold: true },
  { ndc: "52268-0044", name: "Eliquis 5mg", onHand: 24, par: 60, vendor: "AmerisourceBergen", pack: "60 ct", cost: 482.0, lead: "1 day", status: "low" },
  { ndc: "00071-0156", name: "Lisinopril 10mg", onHand: 482, par: 300, vendor: "McKesson", pack: "1000 ct", cost: 14.8, lead: "1 day", status: "ok" },
  { ndc: "00378-0414", name: "Metformin HCl 500mg", onHand: 1240, par: 600, vendor: "Cardinal", pack: "500 ct", cost: 9.2, lead: "2 days", status: "ok" },
];

const VENDORS = ["McKesson", "Cardinal", "AmerisourceBergen"];

export default function ReorderPage() {
  const [cart, setCart] = React.useState<Record<string, boolean>>({
    "00069-2940": true,
    "00169-4136": true,
    "00071-0155": true,
  });

  const cartItems = ITEMS.filter((i) => cart[i.ndc]);
  const cartTotal = cartItems.reduce((s, i) => s + i.cost, 0);

  const toggle = (ndc: string) => setCart((c) => ({ ...c, [ndc]: !c[ndc] }));

  return (
    <DesignPage
      sublabel="Operations"
      title="Reorder"
      subtitle="32 SKUs below par · 4 out of stock"
      actions={
        <>
          <button className="btn btn-secondary btn-sm">
            <I.Sparkle className="ic-sm" /> Auto-build cart
          </button>
          <button className="btn btn-secondary btn-sm">Vendor history</button>
          <button className="btn btn-primary btn-sm">
            <I.Send className="ic-sm" /> Send {cartItems.length} orders
          </button>
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
            <div className="t-xs">Based on par levels & 30-day velocity</div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-sm">
              <I.Filter className="ic-sm" /> Vendor
            </button>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>Product</th>
                <th className="t-num" style={{ textAlign: "right" }}>
                  On hand
                </th>
                <th className="t-num" style={{ textAlign: "right" }}>
                  Par
                </th>
                <th>Vendor</th>
                <th>Pack</th>
                <th className="t-num" style={{ textAlign: "right" }}>
                  Cost
                </th>
                <th>Lead</th>
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((i) => (
                <tr key={i.ndc} className={cart[i.ndc] ? "selected" : ""}>
                  <td>
                    <input type="checkbox" checked={!!cart[i.ndc]} onChange={() => toggle(i.ndc)} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                      {i.name}
                      {i.cold && (
                        <span className="pill pill-info" style={{ padding: "1px 5px", fontSize: 10 }}>
                          ❄
                        </span>
                      )}
                    </div>
                    <div className="t-xs bnds-mono">{i.ndc}</div>
                  </td>
                  <td
                    className="t-num"
                    style={{
                      textAlign: "right",
                      color:
                        i.status === "out" ? "var(--danger)" : i.status === "low" ? "var(--warn)" : "var(--ink)",
                      fontWeight: 500,
                    }}
                  >
                    {i.onHand}
                  </td>
                  <td className="t-num" style={{ textAlign: "right", color: "var(--ink-3)" }}>
                    {i.par}
                  </td>
                  <td className="t-xs">{i.vendor}</td>
                  <td className="t-xs">{i.pack}</td>
                  <td className="t-num" style={{ textAlign: "right", fontWeight: 500 }}>
                    ${i.cost.toFixed(2)}
                  </td>
                  <td className="t-xs">{i.lead}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cart */}
        <div className="card" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
            <div className="t-eyebrow">Purchase order draft</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>
              {cartItems.length} items · 3 vendors
            </div>
          </div>
          {VENDORS.map((v) => {
            const vis = cartItems.filter((i) => i.vendor === v);
            if (!vis.length) return null;
            const sub = vis.reduce((s, i) => s + i.cost, 0);
            return (
              <div key={v} style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{v}</div>
                  <div className="t-num" style={{ fontWeight: 500, fontSize: 13 }}>
                    ${sub.toFixed(2)}
                  </div>
                </div>
                {vis.map((i) => (
                  <div
                    key={i.ndc}
                    className="t-xs"
                    style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}
                  >
                    <span>
                      {i.name} <span style={{ color: "var(--ink-4)" }}>· {i.pack}</span>
                    </span>
                    <span className="t-num">${i.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            );
          })}
          <div
            style={{
              padding: "14px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div className="t-eyebrow">Total</div>
            <div className="bnds-serif t-num" style={{ fontSize: 22, fontWeight: 500, color: "var(--bnds-forest)" }}>
              ${cartTotal.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </DesignPage>
  );
}
