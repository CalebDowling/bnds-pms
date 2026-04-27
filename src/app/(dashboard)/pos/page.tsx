"use client";

import * as React from "react";
import { Avatar, DesignPage, I } from "@/components/design";

// ── Mock active sale (mirrors design-reference/screens/operations.jsx POS) ──
interface CartItem {
  id: number;
  name: string;
  rx?: string;
  patient?: string;
  price: number;
  type: "Rx" | "OTC";
  covered?: boolean;
}

const INITIAL_ITEMS: CartItem[] = [
  { id: 1, name: "Atorvastatin 20mg · 30ct", rx: "RX-77412", patient: "James Hebert", price: 14.2, type: "Rx" },
  { id: 2, name: "Lisinopril 10mg · 90ct", rx: "RX-77389", patient: "James Hebert", price: 0, type: "Rx", covered: true },
  { id: 3, name: "Tylenol PM · 100ct", price: 12.99, type: "OTC" },
  { id: 4, name: "Boudreaux's tote bag", price: 8.0, type: "OTC" },
];

export default function PosPage() {
  const [items, setItems] = React.useState<CartItem[]>(INITIAL_ITEMS);

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const tax = +(subtotal * 0.0945).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  const remove = (id: number) => setItems((arr) => arr.filter((i) => i.id !== id));

  return (
    <DesignPage
      sublabel="Operations"
      title="Point of Sale"
      subtitle="Workstation 04 · Front counter · Sara Comeaux"
      actions={
        <>
          <button className="btn btn-secondary btn-sm">
            <I.Eye className="ic-sm" /> Look up sale
          </button>
          <a href="/pos/history" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            History
          </a>
          <button className="btn btn-secondary btn-sm">Drawer</button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Cart */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name="James Hebert" size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>James Hebert</div>
              <div className="t-xs">P-1042 · BCBS Louisiana · 2 ready in bin A-01</div>
            </div>
            <button className="btn btn-ghost btn-sm">Change</button>
          </div>

          {/* Scan input */}
          <div
            style={{
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--paper)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <I.Barcode className="ic-lg" style={{ color: "var(--bnds-forest)" }} />
            <input
              placeholder="Scan barcode or search item…"
              style={{
                flex: 1,
                border: 0,
                background: "transparent",
                outline: 0,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            />
            <span className="kbd">F2</span>
          </div>

          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th className="t-num" style={{ textAlign: "right" }}>
                  Price
                </th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{i.name}</div>
                    {i.rx && <div className="t-xs bnds-mono">{i.rx}</div>}
                  </td>
                  <td>
                    <span
                      className="pill"
                      style={{
                        background: i.type === "Rx" ? "var(--bnds-leaf-100)" : "var(--paper-2)",
                        color: i.type === "Rx" ? "var(--bnds-forest-700)" : "var(--ink-2)",
                      }}
                    >
                      {i.type}
                    </span>
                  </td>
                  <td className="t-num" style={{ textAlign: "right", fontWeight: 500 }}>
                    {i.covered ? (
                      <span style={{ color: "var(--ok)", fontWeight: 500, fontSize: 12 }}>Covered</span>
                    ) : (
                      `$${i.price.toFixed(2)}`
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => remove(i.id)}
                      style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--ink-4)" }}
                      aria-label={`Remove ${i.name}`}
                    >
                      <I.X />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              padding: "14px 18px",
              borderTop: "1px solid var(--line)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: 13.5,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-3)" }}>
              <span>Subtotal</span>
              <span className="t-num">${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-3)" }}>
              <span>Tax (9.45% · OTC only)</span>
              <span className="t-num">${tax.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-3)" }}>
              <span>Insurance covered</span>
              <span className="t-num">−$58.00</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 18,
                fontWeight: 600,
                marginTop: 6,
                paddingTop: 8,
                borderTop: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              <span>Total due</span>
              <span className="t-num bnds-serif" style={{ color: "var(--bnds-forest)" }}>
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Pay panel */}
        <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="t-eyebrow">Payment</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(
              [
                { l: "Card", icon: I.Card, primary: true },
                { l: "Cash", icon: I.Dollar },
                { l: "HSA / FSA", icon: I.Shield },
                { l: "Charge acct", icon: I.Receipt },
                { l: "Gift card", icon: I.Tag },
                { l: "Split", icon: I.Hash },
              ] as Array<{ l: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; primary?: boolean }>
            ).map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.l}
                  className={p.primary ? "btn btn-primary" : "btn btn-secondary"}
                  style={{ justifyContent: "flex-start", padding: "12px 14px" }}
                >
                  <Icon className="ic-sm" /> {p.l}
                </button>
              );
            })}
          </div>

          <div
            style={{
              padding: 12,
              background: "var(--paper-2)",
              borderRadius: 8,
              fontSize: 12.5,
              color: "var(--ink-2)",
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Counseling required</div>
            <div className="t-xs">
              First fill of Atorvastatin 20mg. Pharmacist must verify before sale.{" "}
              <a href="#" style={{ color: "var(--bnds-forest)" }}>
                Page pharmacist
              </a>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            <button className="btn btn-ghost" style={{ flex: 1 }}>
              Hold
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }}>
              Print quote
            </button>
          </div>
          <button className="btn btn-primary btn-lg" style={{ justifyContent: "center", fontSize: 15 }}>
            Charge ${total.toFixed(2)} <I.ChevR />
          </button>
        </div>
      </div>
    </DesignPage>
  );
}
