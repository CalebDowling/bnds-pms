"use client";

import * as React from "react";
import { DesignPage, I, Toolbar } from "@/components/design";

// ── Mock patients (mirrors design-reference/screens/lists.jsx PatientsList) ──
interface PatientRow {
  id: string;
  name: string;
  dob: string;
  phone: string;
  plan: string;
  flags: Array<"allergy" | "DUR" | "C-II" | "delivery" | "minor">;
  activeRx: number;
  lastFill: string;
  status: "active" | "inactive";
}

const PATIENTS: PatientRow[] = [
  { id: "P-1042", name: "James Hebert", dob: "03/14/1958", phone: "(337) 555-0182", plan: "BCBS Louisiana", flags: ["allergy"], activeRx: 7, lastFill: "2 days ago", status: "active" },
  { id: "P-2188", name: "Marie Comeaux", dob: "07/22/1971", phone: "(337) 555-0934", plan: "Medicare Part D", flags: [], activeRx: 3, lastFill: "6 days ago", status: "active" },
  { id: "P-0917", name: "Beau Thibodeaux", dob: "11/02/1985", phone: "(337) 555-0445", plan: "United HC", flags: ["DUR"], activeRx: 4, lastFill: "Today", status: "active" },
  { id: "P-3301", name: "Camille Fontenot", dob: "04/19/1992", phone: "(337) 555-0710", plan: "Cash", flags: [], activeRx: 1, lastFill: "3 weeks ago", status: "active" },
  { id: "P-2044", name: "Pierre Boudreaux", dob: "09/30/1944", phone: "(337) 555-0212", plan: "Medicare Part D", flags: ["allergy", "C-II"], activeRx: 9, lastFill: "1 day ago", status: "active" },
  { id: "P-4488", name: "Annette LeBlanc", dob: "01/12/1966", phone: "(337) 555-0101", plan: "BCBS Louisiana", flags: [], activeRx: 5, lastFill: "Yesterday", status: "active" },
  { id: "P-5512", name: "Theo Doucet", dob: "06/08/2003", phone: "(337) 555-0688", plan: "BCBS Louisiana", flags: ["minor"], activeRx: 1, lastFill: "4 months ago", status: "inactive" },
  { id: "P-1129", name: "Yvette Robichaux", dob: "12/30/1949", phone: "(337) 555-0301", plan: "Medicare Part D", flags: ["delivery"], activeRx: 11, lastFill: "Today", status: "active" },
  { id: "P-6675", name: "Marcus Guidry", dob: "02/17/1979", phone: "(337) 555-0533", plan: "Cigna", flags: [], activeRx: 2, lastFill: "2 weeks ago", status: "active" },
  { id: "P-7720", name: "Delphine Mouton", dob: "08/04/1955", phone: "(337) 555-0892", plan: "Humana", flags: ["allergy"], activeRx: 6, lastFill: "5 days ago", status: "active" },
];

const TABS = [
  { id: "all", label: "All", count: 1284 },
  { id: "recent", label: "Recent", count: 24 },
  { id: "flagged", label: "Flagged", count: 18 },
  { id: "birthdays", label: "Birthdays this week", count: 6 },
];

export default function PatientsListPage() {
  const [tab, setTab] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [sel, setSel] = React.useState<string | null>(null);

  return (
    <DesignPage
      sublabel="People"
      title="Patients"
      subtitle="1,284 active patients · across 3 locations"
      actions={
        <>
          <button className="btn btn-secondary btn-sm">
            <I.Download className="ic-sm" /> Export
          </button>
          <button className="btn btn-primary btn-sm">
            <I.Plus /> Add patient
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
        searchPlaceholder="Search by name, phone, DOB, Rx#…"
        filters={[
          { label: "Plan", value: "Any" },
          { label: "Location", value: "Main St" },
          { label: "Sort: Recently filled" },
        ]}
        right={
          <button className="btn btn-ghost btn-sm" aria-label="Print">
            <I.Print className="ic-sm" />
          </button>
        }
      />

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Patient</th>
              <th>DOB</th>
              <th>Phone</th>
              <th>Insurance</th>
              <th>Flags</th>
              <th className="t-num" style={{ textAlign: "right" }}>
                Active Rx
              </th>
              <th>Last fill</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {PATIENTS.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSel(p.id)}
                className={sel === p.id ? "selected" : ""}
                style={{ cursor: "pointer" }}
              >
                <td>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div className="t-xs bnds-mono">{p.id}</div>
                </td>
                <td className="t-xs">{p.dob}</td>
                <td className="t-xs bnds-mono">{p.phone}</td>
                <td className="t-xs">{p.plan}</td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {p.flags.includes("allergy") && (
                      <span className="pill pill-danger" style={{ padding: "2px 6px" }}>
                        Allergy
                      </span>
                    )}
                    {p.flags.includes("DUR") && (
                      <span className="pill pill-warn" style={{ padding: "2px 6px" }}>
                        DUR
                      </span>
                    )}
                    {p.flags.includes("C-II") && (
                      <span className="pill" style={{ padding: "2px 6px" }}>
                        C-II
                      </span>
                    )}
                    {p.flags.includes("delivery") && (
                      <span className="pill pill-info" style={{ padding: "2px 6px" }}>
                        Delivery
                      </span>
                    )}
                    {p.flags.includes("minor") && (
                      <span className="pill pill-mute" style={{ padding: "2px 6px" }}>
                        Minor
                      </span>
                    )}
                  </div>
                </td>
                <td className="t-num" style={{ textAlign: "right", fontWeight: 500 }}>
                  {p.activeRx}
                </td>
                <td
                  className="t-xs"
                  style={{ color: p.lastFill === "Today" ? "var(--bnds-forest)" : "var(--ink-3)" }}
                >
                  {p.lastFill}
                </td>
                <td>
                  <I.ChevR style={{ color: "var(--ink-4)" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div
          style={{
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid var(--line)",
            fontSize: 12,
            color: "var(--ink-3)",
          }}
        >
          <div>Showing {PATIENTS.length} of 1,284</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost btn-sm">Prev</button>
            <button className="btn btn-secondary btn-sm">Next</button>
          </div>
        </div>
      </div>
    </DesignPage>
  );
}
