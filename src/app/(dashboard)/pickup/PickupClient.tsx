"use client";

/**
 * PickupClient — interactive bin board for /pickup.
 *
 * Each card links to /queue/process/[fillId] (the pickup-checklist gated
 * workflow page). The legacy /pickup/[fillId] route is being deprecated.
 */
import * as React from "react";
import Link from "next/link";
import { DesignPage, I, Toolbar } from "@/components/design";

export interface PickupBin {
  fillId: string;
  bin: string;
  rxNumber: string;
  patientName: string;
  patientId: string | null;
  itemName: string;
  copay: number;
  ageLabel: string;
  ageDays: number;
  insurance: string;
  isCII: boolean;
  isControlled: boolean;
  hasSevereAllergy: boolean;
}

const TABS = [
  { id: "ready", label: "Ready for pickup" },
  { id: "aging", label: "Aging > 7 days" },
  { id: "delivery", label: "Out for delivery" },
  { id: "picked", label: "Picked up today" },
];

function ageColor(days: number, label: string): string {
  if (label.endsWith("d") && days >= 5) return "var(--danger)";
  if (label.endsWith("d")) return "var(--warn)";
  return "var(--ink-3)";
}

export default function PickupClient({ bins }: { bins: PickupBin[] }) {
  const [tab, setTab] = React.useState("ready");
  const [search, setSearch] = React.useState("");

  // Filter logic per tab. We only have real data for "ready" and "aging" —
  // "delivery" / "picked" require a separate query and are placeholders.
  const filtered = bins.filter((b) => {
    if (tab === "aging" && b.ageDays < 7) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !b.patientName.toLowerCase().includes(q) &&
        !b.bin.toLowerCase().includes(q) &&
        !b.rxNumber.toLowerCase().includes(q) &&
        !b.itemName.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  // Compute counts for the tabs from the real data so the badge numbers
  // aren't misleading lies.
  const counts = {
    ready: bins.length,
    aging: bins.filter((b) => b.ageDays >= 7).length,
    delivery: 0,
    picked: 0,
  };
  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count: counts[t.id as keyof typeof counts],
  }));

  return (
    <DesignPage
      sublabel="Operations"
      title="Pickup"
      subtitle={`Will-call bins · ${bins.length} ready · keep aged scripts moving`}
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
        tabs={tabsWithCounts}
        active={tab}
        onChange={setTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Scan or type bin #, patient, Rx#…"
        filters={[{ label: "Has copay", icon: I.Dollar }]}
      />

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center", color: "var(--ink-3)" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            {tab === "ready"
              ? "No fills waiting for pickup"
              : tab === "aging"
                ? "No aged scripts — nice work"
                : "Coming soon"}
          </div>
          <div className="t-xs">
            {tab === "ready"
              ? "Verified fills will appear here once they're routed to a bin."
              : tab === "aging"
                ? "All scripts in the bins are < 7 days old."
                : "Delivery and pickup-history views are not yet implemented."}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 10,
            marginBottom: 18,
          }}
        >
          {filtered.map((b) => {
            // #20 — distinguish aging from restock-eligible by age band.
            // Pharmacy RTS convention: 3+ days = aging (warn border only,
            // no badge), 7+ days = AGING badge (yellow), 14+ days = RESTOCK
            // (red). Previously a single "RESTOCK" badge fired at 7 days,
            // which over-flagged fills that were merely aging and burned
            // the badge's signal value for the truly RTS-eligible ones.
            const aged = b.ageDays >= 3;
            const aging = b.ageDays >= 7;
            const restock = b.ageDays >= 14;
            return (
              <Link
                key={b.fillId}
                href={`/queue/process/${b.fillId}`}
                className="card"
                style={{
                  padding: 14,
                  cursor: "pointer",
                  textDecoration: "none",
                  color: "inherit",
                  borderColor: restock
                    ? "var(--danger)"
                    : aging || aged
                      ? "var(--warn)"
                      : "var(--line)",
                  borderWidth: restock || aging || aged ? 1.5 : 1,
                  background: "var(--surface)",
                  position: "relative",
                  display: "block",
                }}
              >
                {(restock || aging) && (
                  <div
                    style={{
                      position: "absolute",
                      top: -1,
                      right: -1,
                      padding: "3px 7px",
                      background: restock ? "var(--danger)" : "var(--warn)",
                      color: "white",
                      borderRadius: "0 9px 0 9px",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: 0.06,
                    }}
                  >
                    {restock ? "RESTOCK" : "AGING"}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div className="bnds-mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--bnds-forest)" }}>
                    {b.bin === "—" ? `RX ${b.rxNumber}` : `BIN ${b.bin}`}
                  </div>
                  <div className="t-xs" style={{ color: ageColor(b.ageDays, b.ageLabel), fontWeight: 500 }}>
                    {b.ageLabel}
                  </div>
                </div>
                <div style={{ fontWeight: 500, fontSize: 14, color: "var(--ink)" }}>{b.patientName}</div>
                <div className="t-xs" style={{ marginTop: 2 }}>
                  {b.itemName} · {b.insurance}
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
                    {b.isCII && (
                      <span className="pill" style={{ padding: "2px 6px" }}>
                        C-II · ID
                      </span>
                    )}
                    {!b.isCII && b.isControlled && (
                      <span className="pill pill-warn" style={{ padding: "2px 6px" }}>
                        Controlled
                      </span>
                    )}
                    {b.hasSevereAllergy && (
                      <span className="pill pill-danger" style={{ padding: "2px 6px" }}>
                        Allergy
                      </span>
                    )}
                    {(restock || aging) && (
                      <span
                        className={restock ? "pill pill-danger" : "pill pill-warn"}
                        style={{ padding: "2px 6px" }}
                      >
                        {restock ? "Old" : "Aging"}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DesignPage>
  );
}
