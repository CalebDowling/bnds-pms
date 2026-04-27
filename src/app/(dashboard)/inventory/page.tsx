"use client";

import * as React from "react";
import { DesignPage, I } from "@/components/design";

// ── Mock inventory (mirrors design-reference/screens/inventory.jsx Inventory) ──
type Status = "ok" | "low" | "out";

interface Item {
  ndc: string;
  name: string;
  cls: string;
  onHand: number;
  par: number;
  status: Status;
  loc: string;
  exp: string;
}

const ITEMS: Item[] = [
  { ndc: "00071-0156", name: "Lisinopril 10mg", cls: "Rx", onHand: 482, par: 300, status: "ok", loc: "A-12", exp: "11/2027" },
  { ndc: "00378-0414", name: "Metformin HCl 500mg", cls: "Rx", onHand: 1240, par: 600, status: "ok", loc: "A-04", exp: "08/2027" },
  { ndc: "00071-0155", name: "Atorvastatin 20mg", cls: "Rx", onHand: 88, par: 200, status: "low", loc: "A-07", exp: "06/2027" },
  { ndc: "00069-2940", name: "Amoxicillin 500mg", cls: "Rx", onHand: 12, par: 150, status: "low", loc: "B-02", exp: "02/2027" },
  { ndc: "00169-4136", name: "Ozempic 0.5mg pen", cls: "Rx · CHL", onHand: 0, par: 8, status: "out", loc: "F-cold", exp: "—" },
  { ndc: "00088-2220", name: "Levothyroxine 50mcg", cls: "Rx", onHand: 720, par: 300, status: "ok", loc: "A-09", exp: "10/2027" },
  { ndc: "00406-8530", name: "Oxycodone 5mg", cls: "C-II", onHand: 240, par: 200, status: "ok", loc: "Vault", exp: "07/2027" },
];

export default function InventoryPage() {
  return (
    <DesignPage
      sublabel="Operations"
      title="Inventory"
      subtitle="Main St location · 1,284 SKUs · last reconciled Apr 25"
      actions={
        <>
          <button className="btn btn-secondary btn-sm">
            <I.Filter className="ic-sm" /> Filter
          </button>
          <a href="/inventory/reorder" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Reorder report
          </a>
          <button className="btn btn-primary btn-sm">
            <I.Plus /> Receive shipment
          </button>
        </>
      }
    >
      <div className="card">
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
              <th>Location</th>
              <th>Earliest exp</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((x) => (
              <tr key={x.ndc} style={{ cursor: "pointer" }}>
                <td className="bnds-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  {x.ndc}
                </td>
                <td style={{ fontWeight: 500 }}>{x.name}</td>
                <td>
                  <span className="pill">{x.cls}</span>
                </td>
                <td className="t-num" style={{ fontWeight: 500, textAlign: "right" }}>
                  {x.onHand}
                </td>
                <td className="t-num" style={{ textAlign: "right", color: "var(--ink-3)" }}>
                  {x.par}
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
                </td>
                <td className="t-xs">{x.loc}</td>
                <td className="t-xs">{x.exp}</td>
                <td>
                  <I.ChevR style={{ color: "var(--ink-4)" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DesignPage>
  );
}
