"use client";

import * as React from "react";
import { DesignPage, I, Toolbar } from "@/components/design";

// ── Mock shipping (mirrors design-reference/screens/operations.jsx Shipping) ──
type LaneId = "pack" | "manifest" | "transit" | "delivered";

interface ShipCard {
  id: string;
  patient: string;
  items: number;
  dest: string;
  service: string;
  priority?: boolean;
  cold?: boolean;
  eta?: string;
  delivered?: string;
}

const LANES: Array<{ id: LaneId; label: string; count: number; color: string }> = [
  { id: "pack", label: "To pack", count: 12, color: "var(--info)" },
  { id: "manifest", label: "Awaiting carrier", count: 7, color: "var(--warn)" },
  { id: "transit", label: "In transit", count: 24, color: "var(--bnds-forest)" },
  { id: "delivered", label: "Delivered", count: 18, color: "var(--ok)" },
];

const CARDS: Record<LaneId, ShipCard[]> = {
  pack: [
    { id: "SHP-2204", patient: "Yvette Robichaux", items: 5, dest: "Lafayette, LA", service: "Local · Driver", priority: true },
    { id: "SHP-2205", patient: "Pierre Boudreaux", items: 2, dest: "Breaux Bridge", service: "USPS Priority" },
    { id: "SHP-2206", patient: "Marie Comeaux", items: 1, dest: "Carencro", service: "USPS Priority", cold: true },
  ],
  manifest: [
    { id: "SHP-2188", patient: "Annette LeBlanc", items: 2, dest: "Scott", service: "USPS Priority" },
    { id: "SHP-2189", patient: "Marcus Guidry", items: 1, dest: "Youngsville", service: "UPS Ground" },
  ],
  transit: [
    { id: "SHP-2150", patient: "Theo Doucet", items: 1, dest: "New Iberia", service: "USPS · 9405...", eta: "Today" },
    { id: "SHP-2151", patient: "Camille Fontenot", items: 3, dest: "Abbeville", service: "UPS · 1Z9F...", eta: "Tomorrow" },
    { id: "SHP-2152", patient: "Beau Thibodeaux", items: 2, dest: "Lafayette", service: "Local Driver", eta: "3:40 PM" },
  ],
  delivered: [
    { id: "SHP-2099", patient: "James Hebert", items: 2, dest: "Lafayette", service: "Driver", delivered: "11:20 AM" },
    { id: "SHP-2100", patient: "Delphine Mouton", items: 4, dest: "Crowley", service: "USPS", delivered: "9:42 AM" },
  ],
};

const TABS = [
  { id: "today", label: "Today", count: 43 },
  { id: "week", label: "This week", count: 187 },
  { id: "cold", label: "Cold-chain", count: 12 },
  { id: "returns", label: "Returns", count: 2 },
];

export default function ShippingPage() {
  const [tab, setTab] = React.useState("today");

  return (
    <DesignPage
      sublabel="Operations"
      title="Shipping"
      subtitle="43 shipments active · 7 awaiting pickup by carrier"
      actions={
        <>
          <button className="btn btn-secondary btn-sm">
            <I.Print className="ic-sm" /> Manifest
          </button>
          <button className="btn btn-secondary btn-sm">
            <I.MapPin className="ic-sm" /> Driver routes
          </button>
          <button className="btn btn-primary btn-sm">
            <I.Plus /> New shipment
          </button>
        </>
      }
    >
      <Toolbar
        tabs={TABS}
        active={tab}
        onChange={setTab}
        filters={[
          { label: "Carrier", value: "All" },
          { label: "Driver", value: "Any" },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {LANES.map((lane) => (
          <div key={lane.id} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: lane.color }} />
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{lane.label}</div>
              <div className="t-xs" style={{ marginLeft: "auto", fontWeight: 500, color: "var(--ink-3)" }}>
                {lane.count}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(CARDS[lane.id] || []).map((c) => (
                <div key={c.id} className="card" style={{ padding: 12, cursor: "grab" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div className="bnds-mono" style={{ fontSize: 11.5, color: "var(--bnds-forest)" }}>
                      {c.id}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {c.priority && (
                        <span className="pill pill-warn" style={{ padding: "1px 6px", fontSize: 10 }}>
                          RUSH
                        </span>
                      )}
                      {c.cold && (
                        <span className="pill pill-info" style={{ padding: "1px 6px", fontSize: 10 }}>
                          ❄ COLD
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 13.5, marginTop: 6, color: "var(--ink)" }}>
                    {c.patient}
                  </div>
                  <div className="t-xs" style={{ marginTop: 2 }}>
                    {c.items} item{c.items > 1 ? "s" : ""} · {c.dest}
                  </div>
                  <div
                    className="t-xs"
                    style={{
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: "1px solid var(--line)",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{c.service}</span>
                    {c.eta && <span style={{ color: "var(--bnds-forest)", fontWeight: 500 }}>ETA {c.eta}</span>}
                    {c.delivered && <span style={{ color: "var(--ok)", fontWeight: 500 }}>✓ {c.delivered}</span>}
                  </div>
                </div>
              ))}
              <button
                style={{
                  padding: 8,
                  border: "1px dashed var(--line-2)",
                  borderRadius: 8,
                  background: "transparent",
                  fontSize: 12,
                  color: "var(--ink-3)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                + Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </DesignPage>
  );
}
