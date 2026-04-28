"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DesignPage, I, Toolbar } from "@/components/design";

export type LaneId = "pack" | "manifest" | "transit" | "delivered";

export interface ShipmentCard {
  id: string;
  shipmentNumber: string;
  patient: string;
  itemCount: number;
  destination: string;
  service: string;
  tracking: string | null;
  priority: boolean;
  cold: boolean;
  eta: string | null;
  delivered: string | null;
}

const LANES: Array<{ id: LaneId; label: string; color: string }> = [
  { id: "pack", label: "To pack", color: "var(--info)" },
  { id: "manifest", label: "Awaiting carrier", color: "var(--warn)" },
  { id: "transit", label: "In transit", color: "var(--bnds-forest)" },
  { id: "delivered", label: "Delivered today", color: "var(--ok)" },
];

interface Props {
  lanes: Record<LaneId, ShipmentCard[]>;
  stats: { active: number; deliveredToday: number; coldChain: number };
  search: string;
}

export default function ShippingClient({ lanes, stats, search: initialSearch }: Props) {
  const router = useRouter();
  const [searchInput, setSearchInput] = React.useState(initialSearch);

  const submitSearch = (q: string) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/shipping${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <DesignPage
      sublabel="Operations"
      title="Shipping"
      subtitle={`${stats.active.toLocaleString()} active · ${stats.deliveredToday} delivered today · ${stats.coldChain} cold-chain`}
      actions={
        <>
          <a href="/shipping/routes" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            <I.MapPin className="ic-sm" /> Driver routes
          </a>
          <a href="/shipping/new" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
            <I.Plus /> New shipment
          </a>
        </>
      }
    >
      <Toolbar
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search shipment#, tracking#, patient, MRN…"
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
        {LANES.map((lane) => (
          <div key={lane.id} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: lane.color }} />
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{lane.label}</div>
              <div className="t-xs" style={{ marginLeft: "auto", fontWeight: 500, color: "var(--ink-3)" }}>
                {lanes[lane.id].length}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lanes[lane.id].length === 0 ? (
                <div className="card" style={{ padding: 12, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
                  Empty
                </div>
              ) : (
                lanes[lane.id].map((c) => (
                  <div
                    key={c.id}
                    className="card"
                    style={{ padding: 12, cursor: "pointer" }}
                    onClick={() => router.push(`/shipping/deliver/${c.id}`)}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div className="bnds-mono" style={{ fontSize: 11.5, color: "var(--bnds-forest)" }}>
                        {c.shipmentNumber}
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
                      {c.itemCount} item{c.itemCount === 1 ? "" : "s"} · {c.destination}
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
                      <span style={{ color: lane.id === "delivered" ? "var(--ok)" : "var(--ink-2)" }}>
                        {c.delivered ?? c.eta ?? c.tracking ?? "—"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </DesignPage>
  );
}
