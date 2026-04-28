"use client";

/**
 * Compounding client shell.
 *
 * Replaces the previous mock-data CompoundingPage. Owns the active-tab
 * state and renders queue / formulas / placeholder tabs.
 */
import * as React from "react";
import { DesignPage, I, StatusPill, Toolbar } from "@/components/design";
import { useRouter } from "next/navigation";

export interface CompoundJob {
  id: string;
  batchId: string;
  formula: string;
  formulaCode: string | null;
  patient: string;
  rxNumber: string | null;
  qty: number;
  unit: string;
  due: string;
  priority: "high" | "normal";
  status: "in-progress" | "queued" | "qc";
}

export interface FormulaRow {
  id: string;
  name: string;
  code: string | null;
  category: string;
  lastUsed: string;
  uses: number;
}

interface Props {
  queue: CompoundJob[];
  qcCount: number;
  formulas: FormulaRow[];
  formulaTotal: number;
}

const STATUS_TONE: Record<CompoundJob["status"], "info" | "mute" | "warn"> = {
  "in-progress": "info",
  queued: "mute",
  qc: "warn",
};

const STATUS_LABEL: Record<CompoundJob["status"], string> = {
  "in-progress": "In progress",
  queued: "Queued",
  qc: "QC review",
};

export default function CompoundingClient({ queue, qcCount, formulas, formulaTotal }: Props) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"queue" | "formulas" | "history" | "ingredients">("queue");

  const TABS = [
    { id: "queue", label: "Active queue", count: queue.length },
    { id: "formulas", label: "Formulas", count: formulaTotal },
    { id: "history", label: "History" },
    { id: "ingredients", label: "Ingredients" },
  ];

  return (
    <DesignPage
      sublabel="Dispensing"
      title="Compounding"
      subtitle={`${queue.length} formula${queue.length === 1 ? "" : "s"} in queue · ${qcCount} awaiting QC`}
      actions={
        <>
          <a
            href="/compounding/batch-record"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: "none" }}
          >
            Batch records
          </a>
          <a
            href="/compounding/pricing"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: "none" }}
          >
            Pricing
          </a>
        </>
      }
    >
      <Toolbar tabs={TABS} active={tab} onChange={(t) => setTab(t as typeof tab)} />

      {tab === "queue" && (
        <div className="card" style={{ marginTop: 12 }}>
          {queue.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              No active compound batches. New batches appear here as soon as they're created.
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Formula</th>
                  <th>Patient</th>
                  <th className="t-num" style={{ textAlign: "right" }}>
                    Qty
                  </th>
                  <th>BUD</th>
                  <th>Status</th>
                  <th style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {queue.map((b) => (
                  <tr
                    key={b.batchId}
                    style={{ cursor: "pointer" }}
                    onClick={() => router.push(`/compounding/batches/${b.batchId}`)}
                  >
                    <td className="bnds-mono" style={{ fontSize: 12 }}>
                      {b.id}
                      {b.priority === "high" && (
                        <span className="pill pill-danger" style={{ marginLeft: 8, fontSize: 10 }}>
                          Priority
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {b.formula}
                      {b.formulaCode && <div className="t-xs">{b.formulaCode}</div>}
                    </td>
                    <td>
                      {b.patient}
                      {b.rxNumber && <div className="t-xs">Rx {b.rxNumber}</div>}
                    </td>
                    <td className="t-num" style={{ textAlign: "right" }}>
                      {b.qty.toLocaleString()} {b.unit}
                    </td>
                    <td className="t-xs">{b.due}</td>
                    <td>
                      <StatusPill tone={STATUS_TONE[b.status]} label={STATUS_LABEL[b.status]} />
                    </td>
                    <td>
                      <I.ChevR style={{ color: "var(--ink-4)" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "formulas" && (
        <div className="card" style={{ marginTop: 12 }}>
          {formulas.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              No formulas defined. Create your first formula to start compounding.
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Formula</th>
                  <th>Category</th>
                  <th>Last used</th>
                  <th className="t-num" style={{ textAlign: "right" }}>
                    Total Rxs
                  </th>
                  <th style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {formulas.map((f) => (
                  <tr
                    key={f.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => router.push(`/compounding/formulas/${f.id}`)}
                  >
                    <td style={{ fontWeight: 500 }}>
                      {f.name}
                      {f.code && <div className="t-xs">{f.code}</div>}
                    </td>
                    <td>{f.category}</td>
                    <td className="t-xs">{f.lastUsed}</td>
                    <td className="t-num" style={{ textAlign: "right" }}>
                      {f.uses.toLocaleString()}
                    </td>
                    <td>
                      <I.ChevR style={{ color: "var(--ink-4)" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="card" style={{ marginTop: 12, padding: 32, textAlign: "center", color: "var(--ink-3)" }}>
          Batch history view —{" "}
          <a href="/compounding/batch-record" style={{ color: "var(--bnds-forest)" }}>
            see Batch Records
          </a>
          .
        </div>
      )}
      {tab === "ingredients" && (
        <div className="card" style={{ marginTop: 12, padding: 32, textAlign: "center", color: "var(--ink-3)" }}>
          Ingredient inventory —{" "}
          <a href="/inventory?category=compound_ingredient" style={{ color: "var(--bnds-forest)" }}>
            see Inventory
          </a>
          .
        </div>
      )}
    </DesignPage>
  );
}
