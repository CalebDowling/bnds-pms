"use client";

import * as React from "react";
import { DesignPage, I, KPI } from "@/components/design";

interface Props {
  stats: { todayTransactions: number; todayRevenue: number; activeSessions: number };
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export default function PosClient({ stats }: Props) {
  return (
    <DesignPage
      sublabel="Operations"
      title="Point of Sale"
      subtitle={`${stats.todayTransactions.toLocaleString()} transactions today · ${fmtMoney(stats.todayRevenue)} processed · ${stats.activeSessions} drawer${stats.activeSessions === 1 ? "" : "s"} open`}
      actions={
        <>
          <a href="/pos/history" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Transaction history
          </a>
          <a href="/pickup" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
            <I.Card className="ic-sm" /> Open pickup queue
          </a>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPI label="Transactions today" value={stats.todayTransactions.toLocaleString()} tone="forest" />
        <KPI label="Revenue today" value={fmtMoney(stats.todayRevenue)} tone="ok" />
        <KPI label="Open drawers" value={stats.activeSessions.toString()} tone="info" />
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
          Standalone POS register isn't wired yet
        </div>
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 16 }}>
          The canonical way to ring a patient up is the Pickup queue. Each fill in waiting bin has a
          full checklist (counsel offered, signature captured, payment received, and ID verified
          for controlled substances) plus the Mark Sold action that writes a real Payment row.
        </p>
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 16 }}>
          For OTC-only sales without an Rx fill, this register page will get a real cart UI,
          tax calculation against per-store settings (not a hardcoded 9.45% rate), Decimal-based
          totals, and integration with the drawer/session machinery — coming soon.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/pickup" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
            Go to Pickup queue
          </a>
          <a href="/pos/history" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            View transaction history
          </a>
        </div>
      </div>
    </DesignPage>
  );
}
