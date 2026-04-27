"use client";

import * as React from "react";
import { DesignPage, I, Toolbar } from "@/components/design";

// ── Mock pickup bins (mirrors design-reference/screens/operations.jsx Pickup) ──
type PickupFlag = "counsel" | "C-II" | "restock" | null;

interface Bin {
  bin: string;
  patient: string;
  items: number;
  copay: number;
  since: string;
  flag: PickupFlag;
  insurance: string;
}

const BINS: Bin[] = [
  { bin: "A-01", patient: "James Hebert", items: 2, copay: 14.2, since: "2h", flag: null, insurance: "BCBS LA" },
  { bin: "A-02", patient: "Marie Comeaux", items: 1, copay: 0, since: "4h", flag: "counsel", insurance: "Medicare" },
  { bin: "A-03", patient: "Beau Thibodeaux", items: 3, copay: 28.0, since: "6h", flag: "C-II", insurance: "United HC" },
  { bin: "A-04", patient: "Camille Fontenot", items: 1, copay: 12.0, since: "1d", flag: null, insurance: "Cash" },
  { bin: "A-05", patient: "Pierre Boudreaux", items: 4, copay: 0, since: "2d", flag: "counsel", insurance: "Medicare" },
  { bin: "A-06", patient: "Annette LeBlanc", items: 2, copay: 18.5, since: "3d", flag: null, insurance: "BCBS LA" },
  { bin: "A-07", patient: "Yvette Robichaux", items: 5, copay: 0, since: "5d", flag: "restock", insurance: "Medicare" },
  { bin: "A-08", patient: "Marcus Guidry", items: 1, copay: 8.0, since: "7d", flag: "restock", insurance: "Cigna" },
  { bin: "B-01", patient: "Delphine Mouton", items: 2, copay: 22.0, since: "12d", flag: "restock", insurance: "Humana" },
];

const TABS = [
  { id: "ready", label: "Ready for pickup", count: 47 },
  { id: "aging", label: "Aging > 7 days", count: 8 },
  { id: "delivery", label: "Out for delivery", count: 12 },
  { id: "picked", label: "Picked up today", count: 34 },
];

function ageColor(s: string): string {
  if (s.endsWith("d") && parseInt(s, 10) >= 5) return "var(--danger)";
  if (s.endsWith("d")) return "var(--warn)";
  return "var(--ink-3)";
}

export default function PickupPage() {
  const [tab, setTab] = React.useState("ready");
  const [search, setSearch] = React.useState("");
  const [sel, setSel] = React.useState<string | null>(null);

  return (
    <DesignPage
      sublabel="Operations"
      title="Pickup"
      subtitle="Will-call bins · keep aged scripts moving"
      actions={
        <>
          <button className="btn btn-secondary btn-sm">
            <I.Print className="ic-sm" /> Print labels
          </button>
          <button className="btn btn-secondary btn-sm">
            <I.Send className="ic-sm" /> Notify all aging
          </button>
          <button className="btn btn-primary btn-sm">
            <I.Barcode className="ic-sm" /> Scan to release
          </button>
        </>
      }
    >
      <Toolbar
        tabs={TABS}
        active={tab}
        onChange={setTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Scan or type bin #, patient, Rx#…"
        filters={[
          { label: "Bay", value: "All" },
          { label: "Has copay", icon: I.Dollar },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, marginBottom: 18 }}>
        {BINS.map((b) => {
          const aged = b.since.endsWith("d") && parseInt(b.since, 10) >= 3;
          const old = b.since.endsWith("d") && parseInt(b.since, 10) >= 7;
          return (
            <div
              key={b.bin}
              onClick={() => setSel(b.bin)}
              className="card"
              style={{
                padding: 14,
                cursor: "pointer",
                borderColor:
                  sel === b.bin
                    ? "var(--bnds-forest)"
                    : old
                    ? "var(--danger)"
                    : aged
                    ? "var(--warn)"
                    : "var(--line)",
                borderWidth: sel === b.bin || old || aged ? 1.5 : 1,
                background: sel === b.bin ? "var(--bnds-leaf-100)" : "var(--surface)",
                position: "relative",
              }}
            >
              {old && (
                <div
                  style={{
                    position: "absolute",
                    top: -1,
                    right: -1,
                    padding: "3px 7px",
                    background: "var(--danger)",
                    color: "white",
                    borderRadius: "0 9px 0 9px",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 0.06,
                  }}
                >
                  RESTOCK
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div className="bnds-mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--bnds-forest)" }}>
                  BIN {b.bin}
                </div>
                <div className="t-xs" style={{ color: ageColor(b.since), fontWeight: 500 }}>
                  {b.since}
                </div>
              </div>
              <div style={{ fontWeight: 500, fontSize: 14, color: "var(--ink)" }}>{b.patient}</div>
              <div className="t-xs" style={{ marginTop: 2 }}>
                {b.items} item{b.items > 1 ? "s" : ""} · {b.insurance}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <div
                  className="t-num"
                  style={{
                    fontWeight: 500,
                    fontSize: 14,
                    color: b.copay > 0 ? "var(--ink)" : "var(--ink-3)",
                  }}
                >
                  {b.copay > 0 ? `$${b.copay.toFixed(2)}` : "No copay"}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {b.flag === "counsel" && (
                    <span className="pill pill-info" style={{ padding: "2px 6px" }}>
                      Counsel
                    </span>
                  )}
                  {b.flag === "C-II" && (
                    <span className="pill" style={{ padding: "2px 6px" }}>
                      C-II · ID
                    </span>
                  )}
                  {b.flag === "restock" && (
                    <span className="pill pill-warn" style={{ padding: "2px 6px" }}>
                      Old
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DesignPage>
  );
}
