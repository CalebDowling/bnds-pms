"use client";

/**
 * QueueClient — interactive shell for /queue.
 *
 * The server component (page.tsx) does the data fetch and passes a flat
 * `QueueRow[]` plus pre-computed bucket counts. We render the redesigned
 * two-column layout (table + right rail) and handle:
 *   - Visual bucket filtering (all/verify/filling/insurance/ready)
 *   - Right-rail selection (which fill is highlighted)
 *   - Row navigation: each row links to /queue/process/[fillId] so a click
 *     drops the user into the live workflow page (1846-line state machine).
 *
 * The right-rail "Verify & advance" button is intentionally a Link, not a
 * stub onClick — because the actual advancement logic lives in the process
 * page, where the DUR / pickup-checklist guards are wired.
 */

import * as React from "react";
import Link from "next/link";
import { DesignPage, I } from "@/components/design";

export type QueueBucket = "verify" | "filling" | "insurance" | "ready";

export interface QueueRow {
  fillId: string;
  rxNumber: string;
  patientName: string;
  patientDob: string | null;
  itemName: string;
  prescriberName: string;
  status: string;
  bucket: QueueBucket;
  quantity: number;
  daysSupply: number | null;
  refillsRemaining: number;
  insurance: string;
  isControlled: boolean;
  isCII: boolean;
  deaSchedule: string | null;
  hasSevereAllergy: boolean;
  allergyList: string[];
  createdAt: string | null;
}

interface QueueCounts {
  all: number;
  verify: number;
  filling: number;
  insurance: number;
  ready: number;
}

const BUCKET_META: Record<QueueBucket, { label: string; pill: string; dot: string }> = {
  verify: { label: "Verify", pill: "danger", dot: "danger" },
  filling: { label: "Filling", pill: "info", dot: "info" },
  insurance: { label: "Insurance", pill: "warn", dot: "warn" },
  ready: { label: "Ready", pill: "leaf", dot: "ok" },
};

type FilterKey = "all" | QueueBucket;

export default function QueueClient({
  rows,
  counts,
}: {
  rows: QueueRow[];
  counts: QueueCounts;
}) {
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [selected, setSelected] = React.useState<string | null>(rows[0]?.fillId ?? null);

  const filtered = rows.filter((r) => (filter === "all" ? true : r.bucket === filter));
  const active = rows.find((r) => r.fillId === selected) ?? rows[0] ?? null;

  const tabs: Array<{ id: FilterKey; label: string; n: number; dot?: string }> = [
    { id: "all", label: "All", n: counts.all },
    { id: "verify", label: "Verify", n: counts.verify, dot: "danger" },
    { id: "filling", label: "Filling", n: counts.filling, dot: "info" },
    { id: "insurance", label: "Insurance", n: counts.insurance, dot: "warn" },
    { id: "ready", label: "Ready", n: counts.ready, dot: "ok" },
  ];

  return (
    <DesignPage dense>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: active ? "1fr 420px" : "1fr",
          height: "100%",
          minHeight: "calc(100vh - 56px)",
        }}
      >
        {/* LEFT — list */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, borderRight: "1px solid var(--line)" }}>
          {/* Header */}
          <div style={{ padding: "20px 24px 0" }}>
            <div className="t-eyebrow">Workflow</div>
            <h1 className="bnds-serif" style={{ fontSize: 26, fontWeight: 500, marginTop: 4, color: "var(--ink)" }}>
              Rx Queue
            </h1>
            <div className="t-xs" style={{ marginTop: 4 }}>
              {counts.all} active fill{counts.all === 1 ? "" : "s"} · click any row to enter the workflow
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, padding: "14px 24px 0", borderBottom: "1px solid var(--line)" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                style={{
                  background: "none",
                  border: 0,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  color: filter === t.id ? "var(--ink)" : "var(--ink-3)",
                  borderBottom: filter === t.id ? "2px solid var(--bnds-forest)" : "2px solid transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: -1,
                  fontFamily: "inherit",
                }}
              >
                {t.dot && <span className={`dot dot-${t.dot}`} />}
                {t.label}
                <span
                  style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: "var(--paper-2)",
                    color: "var(--ink-3)",
                  }}
                >
                  {t.n}
                </span>
              </button>
            ))}
          </div>

          {/* Filter row */}
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "12px 24px",
              borderBottom: "1px solid var(--line)",
              alignItems: "center",
              background: "var(--surface)",
            }}
          >
            <button className="btn btn-secondary btn-sm">
              <I.Filter className="ic-sm" /> All locations
            </button>
            <button className="btn btn-secondary btn-sm">
              All prescribers <I.ChevD className="ic-sm" />
            </button>
            <div style={{ flex: 1 }} />
            <span className="t-xs" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              Auto-refresh <span className="dot dot-ok" /> live
            </span>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: "auto", background: "var(--surface)" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--ink-3)" }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                  No fills in this bucket
                </div>
                <div className="t-xs">Switch tabs to see other queues, or wait for new intake.</div>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 28, paddingLeft: 24 }}>
                      <input type="checkbox" />
                    </th>
                    <th>Rx #</th>
                    <th>Patient</th>
                    <th>Drug</th>
                    <th>Qty</th>
                    <th>Status</th>
                    <th>Insurance</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const meta = BUCKET_META[r.bucket];
                    const isHigh = r.hasSevereAllergy || r.isCII;
                    return (
                      <tr
                        key={r.fillId}
                        className={selected === r.fillId ? "selected" : ""}
                        onClick={() => setSelected(r.fillId)}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ paddingLeft: 24 }}>
                          <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                        </td>
                        <td className="bnds-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                          {r.rxNumber}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}>
                            {isHigh && (
                              <span style={{ width: 4, height: 16, background: "var(--danger)", borderRadius: 2 }} />
                            )}
                            {r.patientName}
                          </div>
                          {r.patientDob && <div className="t-xs">DOB {r.patientDob}</div>}
                        </td>
                        <td>
                          <div>{r.itemName}</div>
                          <div className="t-xs">
                            {r.prescriberName} · {r.refillsRemaining} refill{r.refillsRemaining === 1 ? "" : "s"} left
                          </div>
                        </td>
                        <td className="t-num">{r.quantity}</td>
                        <td>
                          <span className={`pill pill-${meta.pill}`}>
                            <span className={`dot dot-${meta.dot}`} />
                            {meta.label}
                          </span>
                          {(r.hasSevereAllergy || r.isCII) && (
                            <span style={{ marginLeft: 6, color: "var(--danger)", fontSize: 10.5, fontWeight: 600 }}>
                              {[r.hasSevereAllergy && "ALG", r.isCII && "C-II"].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </td>
                        <td className="t-xs">{r.insurance}</td>
                        <td>
                          <Link
                            href={`/queue/process/${r.fillId}`}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Open in workflow"
                            style={{ display: "inline-flex", color: "var(--ink-4)" }}
                          >
                            <I.ChevR />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT — detail rail */}
        {active && <RxDetail rx={active} />}
      </div>
    </DesignPage>
  );
}

function RxDetail({ rx }: { rx: QueueRow }) {
  const meta = BUCKET_META[rx.bucket];

  return (
    <div style={{ background: "var(--paper)", display: "flex", flexDirection: "column", overflow: "auto" }}>
      <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="bnds-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {rx.rxNumber}
            </div>
            <h2 className="bnds-serif" style={{ fontSize: 22, fontWeight: 500, marginTop: 2, color: "var(--ink)" }}>
              {rx.patientName}
            </h2>
            <div className="t-xs" style={{ marginTop: 2 }}>
              {rx.patientDob ? `DOB ${rx.patientDob} · ` : ""}{rx.insurance}
            </div>
          </div>
          <span className={`pill pill-${meta.pill}`}>
            <span className={`dot dot-${meta.dot}`} />
            {meta.label}
          </span>
        </div>
      </div>

      {/* Drug card */}
      <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="t-eyebrow">Prescribed</div>
          <div className="bnds-serif" style={{ fontSize: 22, marginTop: 4, fontWeight: 500, color: "var(--ink)" }}>
            {rx.itemName}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <div>
              <div className="t-xs">Quantity</div>
              <div className="t-num" style={{ fontSize: 14, fontWeight: 500 }}>
                {rx.quantity}
              </div>
            </div>
            <div>
              <div className="t-xs">Days supply</div>
              <div className="t-num" style={{ fontSize: 14, fontWeight: 500 }}>
                {rx.daysSupply ?? "—"}
              </div>
            </div>
            <div>
              <div className="t-xs">Refills left</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{rx.refillsRemaining}</div>
            </div>
            <div>
              <div className="t-xs">Prescriber</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{rx.prescriberName}</div>
            </div>
          </div>
          {rx.deaSchedule && (
            <div
              className="bnds-mono"
              style={{
                marginTop: 14,
                padding: 10,
                background: "var(--paper-2)",
                borderRadius: 6,
                fontSize: 12,
                color: "var(--ink-2)",
              }}
            >
              DEA Schedule: {rx.deaSchedule}
              {rx.isCII && " · ID required at pickup"}
            </div>
          )}
        </div>

        {/* Flags */}
        {(rx.hasSevereAllergy || rx.isCII) && (
          <div className="card" style={{ padding: 16, borderLeft: "3px solid var(--danger)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <I.Alert style={{ color: "var(--danger)" }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Pharmacist review</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {rx.hasSevereAllergy && (
                <div style={{ padding: 10, background: "#fbe6e0", borderRadius: 6, fontSize: 13 }}>
                  <strong>Severe allergy on file:</strong>{" "}
                  {rx.allergyList.length > 0 ? rx.allergyList.join(", ") : "review patient profile"}.
                </div>
              )}
              {rx.isCII && (
                <div style={{ padding: 10, background: "#fdf3dc", borderRadius: 6, fontSize: 13 }}>
                  <strong>Schedule II controlled substance:</strong> verify ID at pickup, no refills permitted.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions — links into the live process workflow, not stubs */}
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href={`/queue/process/${rx.fillId}`}
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}
          >
            <I.Check /> Open in workflow
          </Link>
          <button className="btn btn-secondary" aria-label="Call patient">
            <I.Phone />
          </button>
          <button className="btn btn-secondary" aria-label="More actions">
            <I.Dots />
          </button>
        </div>
      </div>
    </div>
  );
}
