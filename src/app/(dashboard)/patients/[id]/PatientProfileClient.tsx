"use client";

/**
 * Patient profile client shell.
 *
 * Receives a fully-resolved patient blob from the server page and owns
 * the interactive bits (tab state, expandable rows). All data shaping
 * — formatPatientName/cleanDrxArtifacts, drug fallback, sig parsing —
 * happens server-side in page.tsx so this component stays
 * presentation-only.
 *
 * Replaces the previous mock-data PatientProfilePage that hardcoded
 * "James L. Hebert" regardless of which patient was clicked.
 */
import * as React from "react";
import { DesignPage, I } from "@/components/design";

// ── Props (all pre-formatted by the server page) ──

export interface PatientProfileMed {
  id: string;
  drug: string;
  sig: string | null;
  since: string | null;       // year only or "—"
  status: "active" | "completed";
  lastFill: string | null;    // formatted date or null
  refillsRemaining: number;
  refillsAuthorized: number;
}

export interface PatientProfileActivity {
  when: string;               // formatted date/time
  what: string;
}

export interface PatientProfileData {
  id: string;
  initials: string;
  name: string;
  dob: string | null;         // MM/DD/YYYY
  age: number | null;
  mrn: string;
  phone: string | null;
  email: string | null;
  status: string;
  allergies: string[];        // pre-formatted "Sulfa (rash)" strings
  insurance: string[];        // pre-formatted plan names
  rxPcn: string | null;
  meds: PatientProfileMed[];
  recentActivity: PatientProfileActivity[];
}

type TabKey = "rx" | "history" | "clinical" | "insurance" | "notes";

export default function PatientProfileClient({ patient }: { patient: PatientProfileData }) {
  const [tab, setTab] = React.useState<TabKey>("rx");

  const activeMeds = patient.meds.filter((m) => m.status === "active");

  return (
    <DesignPage dense>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "calc(100vh - 56px)" }}>
        {/* Patient header */}
        <div style={{ padding: "20px 24px", background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <div
              className="bnds-serif"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--bnds-forest)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 500,
              }}
            >
              {patient.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 className="bnds-serif" style={{ fontSize: 26, fontWeight: 500, color: "var(--ink)" }}>
                  {patient.name}
                </h1>
                <span className="pill pill-leaf">
                  <span className="dot dot-ok" /> {patient.status}
                </span>
                {patient.allergies.length > 0 && (
                  <span className="pill pill-warn">
                    <I.Alert className="ic-sm" /> Allergies: {patient.allergies.join(", ")}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 22, marginTop: 6, fontSize: 13, color: "var(--ink-2)", flexWrap: "wrap" }}>
                {patient.dob && (
                  <span>
                    DOB <strong>{patient.dob}</strong>
                    {patient.age != null ? ` (${patient.age})` : null}
                  </span>
                )}
                <span>
                  MRN <span className="bnds-mono">{patient.mrn}</span>
                </span>
                {patient.phone && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <I.Phone className="ic-sm" /> {patient.phone}
                  </span>
                )}
                {patient.email && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <I.Mail className="ic-sm" /> {patient.email}
                  </span>
                )}
              </div>
              {(patient.insurance.length > 0 || patient.rxPcn) && (
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  {patient.insurance.map((ins) => (
                    <span key={ins} className="pill">
                      {ins}
                    </span>
                  ))}
                  {patient.rxPcn && (
                    <span className="pill pill-mute">
                      RxPCN <span className="bnds-mono">{patient.rxPcn}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled>
                <I.Phone className="ic-sm" /> Call
              </button>
              <button className="btn btn-secondary btn-sm" disabled>
                <I.Mail className="ic-sm" /> Message
              </button>
              <a href={`/prescriptions/new?patientId=${patient.id}`} className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
                <I.Plus /> New Rx
              </a>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, padding: "0 24px", background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
          {(
            [
              { id: "rx" as TabKey, l: "Medications", n: activeMeds.length },
              { id: "history" as TabKey, l: "Fill history", n: patient.meds.length },
              { id: "clinical" as TabKey, l: "Clinical" },
              { id: "insurance" as TabKey, l: "Insurance", n: patient.insurance.length },
              { id: "notes" as TabKey, l: "Notes" },
            ] as Array<{ id: TabKey; l: string; n?: number }>
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: "none",
                border: 0,
                padding: "12px 16px",
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: 500,
                color: tab === t.id ? "var(--ink)" : "var(--ink-3)",
                borderBottom: tab === t.id ? "2px solid var(--bnds-forest)" : "2px solid transparent",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: -1,
                fontFamily: "inherit",
              }}
            >
              {t.l}
              {t.n != null && (
                <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: "var(--paper-2)", color: "var(--ink-3)" }}>
                  {t.n}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: 24, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          {/* Med list — switches between active-only (rx) and all (history) */}
          <div className="card">
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                {tab === "history" ? "Fill history" : "Active medications"}
              </div>
              <a href={`/prescriptions/new?patientId=${patient.id}`} className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
                <I.Plus /> Add
              </a>
            </div>
            {(() => {
              const rows = tab === "history" ? patient.meds : activeMeds;
              if (rows.length === 0) {
                return (
                  <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                    No {tab === "history" ? "fill history" : "active medications"} on file.
                  </div>
                );
              }
              return (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Drug</th>
                      <th>Sig</th>
                      <th>Status</th>
                      <th>Last fill</th>
                      <th>Refills</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 500 }}>
                          {m.drug}
                          {m.since && <div className="t-xs">since {m.since}</div>}
                        </td>
                        <td className="t-xs" style={{ color: "var(--ink-2)" }}>
                          {m.sig ?? "—"}
                        </td>
                        <td>
                          {m.status === "active" ? (
                            <span className="pill pill-leaf">
                              <span className="dot dot-ok" /> Active
                            </span>
                          ) : (
                            <span className="pill pill-mute">Done</span>
                          )}
                        </td>
                        <td className="t-xs">{m.lastFill ?? "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 3 }}>
                            {Array.from({ length: Math.max(m.refillsAuthorized, 5) }).map((_, k) => (
                              <span
                                key={k}
                                style={{
                                  width: 6,
                                  height: 16,
                                  borderRadius: 2,
                                  background: k < m.refillsRemaining ? "var(--bnds-forest)" : "var(--line-2)",
                                }}
                              />
                            ))}
                          </div>
                        </td>
                        <td>
                          <a href={`/prescriptions/${m.id}`} className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
                            View <I.ChevR className="ic-sm" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>

          {/* Right rail */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Clinical highlights</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                <Row
                  label="Allergies"
                  value={patient.allergies.length ? patient.allergies.join(", ") : "None on file"}
                  valueStyle={patient.allergies.length ? { color: "var(--danger)", fontWeight: 500 } : undefined}
                />
                <Row label="Active meds" value={`${activeMeds.length}`} />
                <Row label="Total Rx history" value={`${patient.meds.length}`} />
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Recent activity</div>
              {patient.recentActivity.length === 0 ? (
                <div className="t-xs" style={{ marginTop: 8, color: "var(--ink-3)" }}>
                  No recent activity.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {patient.recentActivity.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 999, background: "var(--bnds-leaf)", marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "var(--ink)" }}>{a.what}</div>
                        <div className="t-xs">{a.when}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DesignPage>
  );
}

function Row({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--ink)", textAlign: "right", ...valueStyle }}>{value}</span>
    </div>
  );
}
