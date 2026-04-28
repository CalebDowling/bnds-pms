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

// Visual bucket order on the queue tabs is intake → insurance → filling →
// verify → ready. Reflects the workflow's left-to-right progression so a
// fill physically moves down the tab strip as it advances. (#8 added intake
// as its own bucket — was previously rolled into insurance.)
export type QueueBucket = "intake" | "insurance" | "filling" | "verify" | "ready";

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
  /**
   * Pre-computed humanized age (e.g. "12m", "3h", "2d") so the row can
   * render an aging signal without each renderer rolling its own clock.
   * Computed on the server from `createdAt` so SSR + CSR agree.
   */
  ageLabel: string;
  /**
   * Floor of `(now - createdAt) / day`. Drives the warn / danger color
   * on the row so a fill stuck in Insurance for 3+ days lights up.
   */
  ageDays: number;
}

interface QueueCounts {
  all: number;
  intake: number;
  insurance: number;
  filling: number;
  verify: number;
  ready: number;
}

const BUCKET_META: Record<QueueBucket, { label: string; pill: string; dot: string }> = {
  intake: { label: "Intake", pill: "info", dot: "info" },
  insurance: { label: "Insurance", pill: "warn", dot: "warn" },
  filling: { label: "Filling", pill: "info", dot: "info" },
  verify: { label: "Verify", pill: "danger", dot: "danger" },
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
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(rows[0]?.fillId ?? null);

  // Bucket filter + free-text search across the four fields a tech is
  // most likely to scan: patient name, Rx number, drug, and prescriber.
  // Mirror of /pickup so the two workflow boards behave the same way.
  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.bucket !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (
        !r.patientName.toLowerCase().includes(q) &&
        !r.rxNumber.toLowerCase().includes(q) &&
        !r.itemName.toLowerCase().includes(q) &&
        !r.prescriberName.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
  // #24 — keep the right rail in sync with the visible bucket. If the
  // currently-selected fill isn't part of the filtered set (e.g. the user
  // selected a verify fill, then switched to the filling tab), promote the
  // first filtered row instead of leaving a stale rail. Falls back to the
  // overall first row only when the filtered list is empty so the rail
  // doesn't unexpectedly disappear on an empty bucket.
  const active =
    filtered.find((r) => r.fillId === selected) ??
    filtered[0] ??
    rows.find((r) => r.fillId === selected) ??
    null;

  const tabs: Array<{ id: FilterKey; label: string; n: number; dot?: string }> = [
    { id: "all", label: "All", n: counts.all },
    { id: "intake", label: "Intake", n: counts.intake, dot: "info" },
    { id: "insurance", label: "Insurance", n: counts.insurance, dot: "warn" },
    { id: "filling", label: "Filling", n: counts.filling, dot: "info" },
    { id: "verify", label: "Verify", n: counts.verify, dot: "danger" },
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

          {/* Filter / search row.
              Previously this row had two stub buttons ("All locations",
              "All prescribers") and a fake "Auto-refresh live" indicator
              with no live wire-up. Walkthrough caught all three —
              clicking the buttons did nothing, and the green dot lied.
              Replaced with a working search input that mirrors /pickup. */}
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
            <div style={{ flex: 1, maxWidth: 480, position: "relative" }}>
              <I.Search
                className="ic-sm"
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--ink-3)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={"Search patient, Rx#, drug, prescriber\u2026"}
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 32px",
                  fontSize: 13,
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ flex: 1 }} />
            <span className="t-xs" style={{ color: "var(--ink-3)" }}>
              {filtered.length} of {counts.all} fill{counts.all === 1 ? "" : "s"}
              {search ? ` matching \u201C${search}\u201D` : ""}
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
                    {/* Bulk-select column removed — the original
                        checkboxes were stubs with no onClick, no selected
                        state, and no batch-action toolbar to back them up.
                        Walkthrough flagged them as ghost UI. Re-introduce
                        with real behavior when there's an actual batch
                        action ("notify all aging", "print labels for…")
                        wired to the selection. */}
                    <th style={{ paddingLeft: 24 }}>Rx #</th>
                    <th>Patient</th>
                    <th>Drug</th>
                    <th>Qty</th>
                    <th>Age</th>
                    <th>Status</th>
                    <th>Insurance</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const meta = BUCKET_META[r.bucket];
                    const isHigh = r.hasSevereAllergy || r.isCII;
                    // Aging signal: 3+ days in the queue is unusual for any
                    // bucket except waiting_bin (where /pickup owns the
                    // RTS surfacing). Use warn at 3+, danger at 7+ so the
                    // tech sees long-tail fills they need to chase.
                    const ageColor =
                      r.ageDays >= 7
                        ? "var(--danger)"
                        : r.ageDays >= 3
                          ? "var(--warn)"
                          : "var(--ink-3)";
                    return (
                      <tr
                        key={r.fillId}
                        className={selected === r.fillId ? "selected" : ""}
                        onClick={() => setSelected(r.fillId)}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="bnds-mono" style={{ fontSize: 12, color: "var(--ink-3)", paddingLeft: 24 }}>
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
                        <td className="t-xs t-num" style={{ color: ageColor, fontWeight: 500 }}>
                          {r.ageLabel}
                        </td>
                        <td>
                          <span className={`pill pill-${meta.pill}`}>
                            <span className={`dot dot-${meta.dot}`} />
                            {meta.label}
                          </span>
                          {(r.hasSevereAllergy || r.isCII) && (
                            <span style={{ marginLeft: 6, color: "var(--danger)", fontSize: 10.5, fontWeight: 600 }}>
                              {[r.hasSevereAllergy && "Allergy", r.isCII && "C-II"].filter(Boolean).join(" \u00b7 ")}
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

        {/* Actions — links into the live process workflow, not stubs.
            The previous "Phone" / "Dots" buttons next to "Open in workflow"
            were no-op stubs (no onClick, no menu). Walkthrough caught them.
            Removed in favor of a single primary action. The phone-call /
            more-actions affordances live on the patient profile page,
            which is one click away from /queue/process. */}
        <Link
          href={`/queue/process/${rx.fillId}`}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
        >
          <I.Check /> Open in workflow
        </Link>
      </div>
    </div>
  );
}
