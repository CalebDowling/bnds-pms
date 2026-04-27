"use client";

import * as React from "react";
import Link from "next/link";
import { DesignPage, I } from "@/components/design";

// ── Workflow Queue rows (matches Claude Design source-of-truth) ──
const WORKFLOW_QUEUE: Array<{ label: string; dot: string; count: number; hot?: boolean }> = [
  { label: "Intake", dot: "#5aa845", count: 0 },
  { label: "Sync", dot: "#2b6c9b", count: 0 },
  { label: "Reject", dot: "#b8442e", count: 0 },
  { label: "Print", dot: "#1f5a3a", count: 2 },
  { label: "Scan", dot: "#5aa845", count: 1 },
  { label: "Verify", dot: "#c98a14", count: 4 },
  { label: "Out of Stock", dot: "#c98a14", count: 0 },
  { label: "Waiting Bin", dot: "#c98a14", count: 18, hot: true },
  { label: "Renewals", dot: "#5aa845", count: 0 },
  { label: "Todo", dot: "#2b6c9b", count: 0 },
  { label: "Price Check", dot: "#b8442e", count: 0 },
  { label: "Prepay", dot: "#5aa845", count: 0 },
  { label: "OK to Charge", dot: "#1f5a3a", count: 0 },
  { label: "Decline", dot: "#b8442e", count: 0 },
  { label: "OK to Charge Clinic", dot: "#5aa845", count: 0 },
  { label: "Mochi", dot: "#8b5cf6", count: 0 },
];

const QUICK_TILES: Array<{ label: string; sub: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; bg: string; href: string }> = [
  { label: "Patient", sub: "3 today", icon: I.Users, bg: "#1f5a3a", href: "/patients" },
  { label: "Rx", sub: "5 today", icon: I.Pill, bg: "#2b6c9b", href: "/prescriptions" },
  { label: "Item", sub: "112,143", icon: I.Inventory, bg: "#7c3aed", href: "/inventory" },
  { label: "Prescriber", sub: "5,351", icon: I.Users, bg: "#d97706", href: "/prescriptions/prescribers" },
  { label: "Compound", sub: "0 pend", icon: I.Pill, bg: "#be185d", href: "/compounding" },
  { label: "Inventory", sub: "30 low", icon: I.Alert, bg: "#c98a14", href: "/inventory" },
  { label: "Sales", sub: "0 today", icon: I.Receipt, bg: "#1f5a3a", href: "/pos" },
  { label: "Claims", sub: "0 rej", icon: I.Shield, bg: "#7c3aed", href: "/insurance" },
  { label: "System", sub: "Admin", icon: I.Settings, bg: "#0f4c5c", href: "/settings" },
];

const RECENT_ACTIVITY = [
  { ref: "725369", patient: "Jessica Anter", flow: "Waiting Bin → Sold", tech: "Caleb Dowling", when: "48m" },
  { ref: "725368", patient: "Round8 Walkthrough", flow: "Waiting Bin → Sold", tech: "Caleb Dowling", when: "1h" },
  { ref: "725367", patient: "DurTest Walkthrough4", flow: "Waiting Bin → Sold", tech: "Caleb Dowling", when: "2h", amt: "$5.00" },
  { ref: "725366", patient: "Test Patient", flow: "Waiting Bin → Sold", tech: "Caleb Dowling", when: "4h" },
];

export default function DashboardPage() {
  const showWorkflowQueue = true;
  const showRecentActivity = true;
  const showStockAlerts = false;
  const showPhoneSystem = true;
  const tilesPerRow = 3;
  const showRight = showRecentActivity || showStockAlerts;

  let cols = "";
  if (showWorkflowQueue) cols += "300px ";
  cols += "1fr";
  if (showRight) cols += " 320px";

  return (
    <DesignPage dense>
      <div style={{ padding: 18 }}>
        {/* Breadcrumb */}
        <div className="t-xs" style={{ marginBottom: 10 }}>
          Home <span style={{ color: "var(--ink-4)" }}>›</span> Dashboard
        </div>

        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 14, alignItems: "start" }}>
          {/* ===== Left: Workflow Queue ===== */}
          {showWorkflowQueue && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div className="t-eyebrow">Workflow Queue</div>
                <Link
                  href="/queue"
                  style={{ fontSize: 11.5, color: "var(--bnds-forest)", textDecoration: "none", fontWeight: 500 }}
                >
                  Open Queue
                </Link>
              </div>
              <div>
                {WORKFLOW_QUEUE.map((w, i) => (
                  <div
                    key={w.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 14px",
                      borderBottom: i < WORKFLOW_QUEUE.length - 1 ? "1px solid var(--line)" : "none",
                      background: w.hot ? "rgba(201,138,20,0.06)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: w.dot }} />
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: w.count > 0 ? "var(--ink)" : "var(--ink-2)",
                        fontWeight: w.hot ? 500 : 400,
                      }}
                    >
                      {w.label}
                    </span>
                    <span
                      className="t-num"
                      style={{
                        fontSize: 13,
                        fontWeight: w.count > 0 ? 600 : 400,
                        color: w.hot ? "var(--warn)" : w.count > 0 ? "var(--ink)" : "var(--ink-4)",
                        minWidth: 18,
                        textAlign: "right",
                      }}
                    >
                      {w.count}
                    </span>
                    <I.ChevR className="ic-sm" style={{ color: "var(--ink-4)" }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Center: Quick Access + Phone System ===== */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card">
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                <div className="t-eyebrow">Quick Access</div>
              </div>
              <div
                style={{
                  padding: 14,
                  display: "grid",
                  gridTemplateColumns: `repeat(${tilesPerRow}, 1fr)`,
                  gap: 12,
                }}
              >
                {QUICK_TILES.map((t) => {
                  const Ic = t.icon;
                  return (
                    <Link
                      key={t.label}
                      href={t.href}
                      className="no-underline"
                      style={{
                        padding: "14px 14px 14px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                        background: "var(--surface)",
                        textAlign: "left",
                        border: "1px solid var(--line)",
                        borderLeft: `3px solid ${t.bg}`,
                        borderRadius: 8,
                        transition: "background .12s",
                        textDecoration: "none",
                        color: "var(--ink)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "var(--paper)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                      }}
                    >
                      <Ic className="ic-lg" style={{ color: t.bg }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 400, color: "var(--ink)" }}>{t.label}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{t.sub}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {showPhoneSystem && (
              <div className="card">
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <I.Phone className="ic-sm" />
                    <div className="t-eyebrow">Phone System</div>
                    <span className="dot dot-ok" style={{ marginLeft: 4 }} />
                  </div>
                  <Link
                    href="/phone"
                    style={{ fontSize: 11.5, color: "var(--bnds-forest)", textDecoration: "none", fontWeight: 500 }}
                  >
                    Full Dashboard →
                  </Link>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  {[
                    { label: "Active", n: 0, icon: I.Phone },
                    { label: "On Hold", n: 0, icon: I.Clock },
                    { label: "Today", n: 0, icon: I.Calendar },
                    { label: "Missed", n: 0, icon: I.X },
                  ].map((s, i) => {
                    const Ic = s.icon;
                    return (
                      <div
                        key={s.label}
                        style={{
                          padding: 14,
                          textAlign: "center",
                          borderRight: i < 3 ? "1px solid var(--line)" : "none",
                        }}
                      >
                        <Ic className="ic-sm" style={{ color: "var(--ink-3)" }} />
                        <div className="bnds-serif t-num" style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>
                          {s.n}
                        </div>
                        <div
                          className="t-xs"
                          style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}
                        >
                          {s.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid var(--line)" }}>
                  {[
                    { l: "Active Calls", t: "No active calls" },
                    { l: "On Hold", t: "No callers on hold" },
                  ].map((c, i) => (
                    <div
                      key={c.l}
                      style={{ padding: "14px 16px", borderRight: i === 0 ? "1px solid var(--line)" : "none" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="t-eyebrow" style={{ fontSize: 10 }}>{c.l}</span>
                        <span className="t-num" style={{ fontSize: 11, color: "var(--ink-4)" }}>0</span>
                      </div>
                      <div
                        style={{
                          height: 56,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          gap: 4,
                          color: "var(--ink-4)",
                        }}
                      >
                        {i === 0 ? <I.Phone /> : <I.Clock />}
                        <span className="t-xs">{c.t}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                  <div className="t-eyebrow" style={{ fontSize: 10, marginBottom: 8 }}>Departments</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["Pharmacy", "Pharmacist", "Billing", "Shipping", "Voicemail"].map((d) => (
                      <span key={d} className="pill pill-leaf">
                        <span className="dot dot-ok" />
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ padding: 12, display: "flex", gap: 8 }}>
                  <Link
                    href="/phone"
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}
                  >
                    <I.Phone className="ic-sm" /> Open Call Center
                  </Link>
                  <Link href="/phone/history" className="btn btn-secondary" style={{ textDecoration: "none" }}>
                    <I.Clock className="ic-sm" /> History
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ===== Right: Recent Activity + Stock Alerts ===== */}
          {showRight && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {showRecentActivity && (
                <div className="card">
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
                    <div className="t-eyebrow">Recent Activity</div>
                  </div>
                  <div>
                    {RECENT_ACTIVITY.map((a, i) => (
                      <div
                        key={a.ref}
                        style={{
                          padding: "10px 14px",
                          borderBottom: i < RECENT_ACTIVITY.length - 1 ? "1px solid var(--line)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span className="bnds-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                            Ref# {a.ref}
                          </span>
                          <span className="t-xs">{a.when}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{a.patient}</div>
                        <div className="t-xs" style={{ marginTop: 1, display: "flex", justifyContent: "space-between" }}>
                          <span>{a.flow} · {a.tech}</span>
                          {a.amt && (
                            <span className="t-num" style={{ color: "var(--bnds-forest)", fontWeight: 500 }}>
                              {a.amt}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating + button */}
        <Link
          href="/prescriptions/new"
          aria-label="New prescription"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: 0,
            background: "var(--bnds-leaf)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(31,90,58,0.30)",
            textDecoration: "none",
            zIndex: 30,
          }}
        >
          <I.Plus className="ic-lg" />
        </Link>
      </div>
    </DesignPage>
  );
}
