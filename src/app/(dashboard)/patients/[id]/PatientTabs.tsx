"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatPhone } from "@/lib/utils";
import { formatPrescriberName, formatDrugName } from "@/lib/utils/formatters";
import type { PatientWithRelations } from "@/types/patient";
import type { PatientPrescription } from "@/types/patient";
import { addAllergy, deleteAllergy } from "@/app/(dashboard)/patients/actions";
import DocumentsTab from "@/components/patients/DocumentsTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "allergies", label: "Allergies" },
  { id: "insurance", label: "Insurance" },
  { id: "contacts", label: "Phone & Address" },
  { id: "meds", label: "Outside Meds" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes" },
];

export default function PatientTabs({ patient }: { patient: PatientWithRelations }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div>
      {/* Tab Bar */}
      <div className="border-b border-gray-200 mb-4">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#1f5a3a] text-[#1f5a3a]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === "overview" && <OverviewTab patient={patient} />}
        {activeTab === "prescriptions" && <PrescriptionsTab patient={patient} />}
        {activeTab === "allergies" && <AllergiesTab patient={patient} />}
        {activeTab === "insurance" && <InsuranceTab patient={patient} />}
        {activeTab === "contacts" && <ContactsTab patient={patient} />}
        {activeTab === "meds" && <OutsideMedsTab patient={patient} />}
        {activeTab === "documents" && <DocumentsTab patientId={patient.id} />}
        {activeTab === "notes" && <NotesTab patient={patient} />}
      </div>
    </div>
  );
}

// Heritage status pill — single mapping shared between the Overview and
// Prescriptions tabs so the patient profile reads with the same status
// language as the rest of the system. Maps Rx workflow states to the
// heritage tokens (ok/danger/info) instead of Tailwind rainbow.
function RxStatusPill({ status }: { status: string }) {
  const ok = status === "ready" || status === "dispensed" || status === "delivered";
  const cancelled = status === "cancelled" || status === "expired";
  const config = ok
    ? { bg: "rgba(31,90,58,0.10)", color: "#1f5a3a" }
    : cancelled
    ? { bg: "rgba(184,68,46,0.10)", color: "#b8442e" }
    : { bg: "rgba(43,108,155,0.12)", color: "#2c5e7a" };
  return (
    <span
      className="inline-flex items-center"
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        backgroundColor: config.bg,
        color: config.color,
      }}
    >
      {status}
    </span>
  );
}

// Heritage allergy severity pill — life_threatening / severe → danger,
// moderate → warn, mild → ink-3 neutral. Removes the Tailwind orange
// rainbow that previously sat beside heritage cards on the same page.
function AllergySeverityPill({ severity }: { severity: string }) {
  const config =
    severity === "life_threatening"
      ? { bg: "rgba(184,68,46,0.18)", color: "#9a2c1f", weight: 700 }
      : severity === "severe"
      ? { bg: "rgba(184,68,46,0.10)", color: "#b8442e", weight: 600 }
      : severity === "moderate"
      ? { bg: "rgba(201,138,20,0.14)", color: "#8a5a17", weight: 600 }
      : { bg: "rgba(122,138,120,0.14)", color: "#5a6b58", weight: 500 };
  return (
    <span
      className="inline-flex items-center"
      style={{
        fontSize: 11,
        fontWeight: config.weight,
        padding: "2px 8px",
        borderRadius: 999,
        backgroundColor: config.bg,
        color: config.color,
      }}
    >
      {severity.replace("_", " ")}
    </span>
  );
}

function OverviewTab({ patient }: { patient: PatientWithRelations }) {
  const rxCount = patient.prescriptions?.length || 0;
  const activeRx = patient.prescriptions?.filter((rx: PatientPrescription) => !["cancelled", "dispensed", "delivered"].includes(rx.status)).length || 0;
  const allergyCount = patient.allergies?.length || 0;
  const nkda = allergyCount === 0;
  const primaryInsurance = patient.insurance?.find((i: PatientWithRelations["insurance"][number]) => i.priority === "primary" && i.isActive);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase">Total Rx</p>
          <p className="text-xl font-bold text-gray-900">{rxCount}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase">Active Rx</p>
          <p className="text-xl font-bold" style={{ color: activeRx > 0 ? "#2c5e7a" : "#14201a" }}>{activeRx}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase">Allergies</p>
          <p className="text-xl font-bold" style={{ color: nkda ? "#1f5a3a" : "#b8442e" }}>
            {nkda ? "NKDA" : allergyCount}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase">Insurance</p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {primaryInsurance?.thirdPartyPlan?.planName || "Cash / Self-pay"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Demographics</h3>
          <dl className="space-y-2">
            <Row label="Email" value={patient.email || "—"} />
            <Row label="Preferred Contact" value={patient.preferredContact} />
            <Row label="Language" value={patient.preferredLanguage === "en" ? "English" : patient.preferredLanguage} />
            <Row label="SSN (last 4)" value={patient.ssnLastFour ? `••••${patient.ssnLastFour}` : "—"} />
            <Row label="Created" value={formatDate(patient.createdAt)} />
          </dl>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Recent Prescriptions</h3>
          {patient.prescriptions?.length > 0 ? (
            <div className="space-y-2">
              {patient.prescriptions.slice(0, 5).map((rx: PatientPrescription) => (
                <div key={rx.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {rx.item?.name ? formatDrugName(rx.item.name) : "Compound"} {rx.item?.strength || ""}
                    </p>
                    <p className="text-xs text-gray-400">
                      Rx# {rx.rxNumber}
                      {rx.prescriber ? ` — ${formatPrescriberName({ firstName: rx.prescriber.firstName, lastName: rx.prescriber.lastName })}` : ""}
                    </p>
                  </div>
                  <RxStatusPill status={rx.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No prescriptions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PrescriptionsTab({ patient }: { patient: PatientWithRelations }) {
  return (
    <div>
      {patient.prescriptions?.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Rx #</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Drug / Compound</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Prescriber</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Received</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Refills</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {patient.prescriptions.map((rx: PatientPrescription) => (
              <tr key={rx.id} className="hover:bg-gray-50">
                <td className="py-2.5 text-sm font-mono text-gray-600">{rx.rxNumber}</td>
                <td className="py-2.5 text-sm text-gray-900">
                  {rx.item?.name ? formatDrugName(rx.item.name) : "Compound"} {rx.item?.strength || ""}
                </td>
                <td className="py-2.5 text-sm text-gray-600">
                  {rx.prescriber
                    ? `${formatPrescriberName({ firstName: rx.prescriber.firstName, lastName: rx.prescriber.lastName })}${rx.prescriber.suffix ? `, ${rx.prescriber.suffix}` : ""}`
                    : "—"}
                </td>
                <td className="py-2.5 text-sm text-gray-600">{formatDate(rx.dateReceived)}</td>
                <td className="py-2.5 text-sm text-gray-600">
                  {rx.refillsRemaining}/{rx.refillsAuthorized}
                </td>
                <td className="py-2.5">
                  <RxStatusPill status={rx.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-gray-400">No prescriptions found</p>
      )}
    </div>
  );
}

function AllergiesTab({ patient }: { patient: PatientWithRelations }) {
  const router = useRouter();
  const active = patient.allergies.filter((a: PatientWithRelations["allergies"][number]) => a.status === "active");
  const inactive = patient.allergies.filter((a: PatientWithRelations["allergies"][number]) => a.status !== "active");

  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allergen, setAllergen] = useState("");
  const [reaction, setReaction] = useState("");
  const [severity, setSeverity] = useState("moderate");
  const [source, setSource] = useState("patient_reported");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!allergen.trim()) return;
    setSaving(true);
    try {
      await addAllergy(patient.id, { allergen: allergen.trim(), reaction: reaction.trim() || undefined, severity, source });
      setAllergen(""); setReaction(""); setSeverity("moderate"); setShowAdd(false);
      router.refresh();
    } catch {} finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this allergy?")) return;
    await deleteAllergy(id, patient.id);
    router.refresh();
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1f5a3a]";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Allergies</h3>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="text-sm text-[#1f5a3a] font-medium hover:underline">+ Add Allergy</button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-lg p-4 mb-4" style={{ backgroundColor: "#f3efe7", border: "1px solid #d8d1c2" }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Allergen *</label>
              <input type="text" value={allergen} onChange={(e) => setAllergen(e.target.value)} required placeholder="e.g. Penicillin" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reaction</label>
              <input type="text" value={reaction} onChange={(e) => setReaction(e.target.value)} placeholder="e.g. Rash, Anaphylaxis" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputClass}>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="life_threatening">Life Threatening</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
                <option value="patient_reported">Patient Reported</option>
                <option value="prescriber_reported">Prescriber Reported</option>
                <option value="observed">Observed</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-1.5 bg-[#1f5a3a] text-white text-sm font-medium rounded-lg hover:bg-[#174530] disabled:opacity-50">
              {saving ? "Saving..." : "Add Allergy"}
            </button>
          </div>
        </form>
      )}

      {active.length > 0 ? (
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Allergen</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Reaction</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Severity</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Source</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {active.map((a: PatientWithRelations["allergies"][number]) => (
              <tr key={a.id}>
                <td className="py-2.5 text-sm font-medium text-gray-900">{a.allergen}</td>
                <td className="py-2.5 text-sm text-gray-600">{a.reaction || "—"}</td>
                <td className="py-2.5">
                  <AllergySeverityPill severity={a.severity} />
                </td>
                <td className="py-2.5 text-sm text-gray-400 capitalize">{a.source?.replace("_", " ") || "—"}</td>
                <td className="py-2.5">
                  <button onClick={() => handleDelete(a.id)} className="text-xs hover:underline" style={{ color: "#b8442e" }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm font-medium mb-4" style={{ color: "#1f5a3a" }}>No Known Drug Allergies (NKDA)</p>
      )}
      {inactive.length > 0 && (
        <details className="text-sm">
          <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
            {inactive.length} inactive allerg{inactive.length === 1 ? "y" : "ies"}
          </summary>
          <div className="mt-2 space-y-1">
            {inactive.map((a: PatientWithRelations["allergies"][number]) => (
              <p key={a.id} className="text-gray-400 line-through">{a.allergen} — {a.severity}</p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function InsuranceTab({ patient }: { patient: PatientWithRelations }) {
  const active = patient.insurance.filter((i: PatientWithRelations["insurance"][number]) => i.isActive);
  const inactive = patient.insurance.filter((i: PatientWithRelations["insurance"][number]) => !i.isActive);

  return (
    <div>
      {active.length > 0 ? (
        <div className="space-y-4">
          {active.map((ins: PatientWithRelations["insurance"][number]) => (
            <div key={ins.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900 capitalize">{ins.priority}</span>
                <span
                  className="inline-flex items-center"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 999,
                    backgroundColor: "rgba(31,90,58,0.10)",
                    color: "#1f5a3a",
                  }}
                >
                  Active
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-2">
                <Row label="Member ID" value={ins.memberId} />
                <Row label="Group #" value={ins.groupNumber || "—"} />
                <Row label="Plan" value={ins.thirdPartyPlan?.planName || "—"} />
                <Row label="BIN" value={ins.thirdPartyPlan?.bin || "—"} />
                <Row label="Cardholder" value={ins.cardholderName || "—"} />
                <Row label="Relationship" value={ins.relationship || "—"} />
                <Row label="Effective" value={formatDate(ins.effectiveDate)} />
                <Row label="Terminates" value={formatDate(ins.terminationDate)} />
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No active insurance — Cash / Self-pay</p>
      )}
      {inactive.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
            {inactive.length} inactive plan{inactive.length === 1 ? "" : "s"}
          </summary>
        </details>
      )}
    </div>
  );
}

function ContactsTab({ patient }: { patient: PatientWithRelations }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Phone Numbers</h3>
        {patient.phoneNumbers.length > 0 ? (
          <div className="space-y-2">
            {patient.phoneNumbers.map((p: PatientWithRelations["phoneNumbers"][number]) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm text-gray-900">{formatPhone(p.number)}</p>
                  <p className="text-xs text-gray-400 capitalize">
                    {p.phoneType}
                    {p.acceptsSms ? " • SMS OK" : ""}
                  </p>
                </div>
                {p.isPrimary && (
                  <span className="text-xs font-medium text-[#1f5a3a]">Primary</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No phone numbers</p>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Addresses</h3>
        {patient.addresses.length > 0 ? (
          <div className="space-y-3">
            {patient.addresses.map((a: PatientWithRelations["addresses"][number]) => (
              <div key={a.id} className="py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500 capitalize">{a.addressType}</span>
                  {a.isDefault && <span className="text-xs font-medium text-[#1f5a3a]">Default</span>}
                </div>
                <p className="text-sm text-gray-900">{a.line1}</p>
                {a.line2 && <p className="text-sm text-gray-900">{a.line2}</p>}
                <p className="text-sm text-gray-600">{a.city}, {a.state} {a.zip}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No addresses</p>
        )}
      </div>
    </div>
  );
}

function OutsideMedsTab({ patient }: { patient: PatientWithRelations }) {
  const active = patient.outsideMeds?.filter((m: PatientWithRelations["outsideMeds"][number]) => m.isActive) || [];

  return (
    <div>
      {active.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Medication</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Strength</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Directions</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Prescriber</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Pharmacy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {active.map((m: PatientWithRelations["outsideMeds"][number]) => (
              <tr key={m.id}>
                <td className="py-2.5 text-sm font-medium text-gray-900">{m.medicationName}</td>
                <td className="py-2.5 text-sm text-gray-600">{m.strength || "—"}</td>
                <td className="py-2.5 text-sm text-gray-600">{m.directions || "—"}</td>
                <td className="py-2.5 text-sm text-gray-600">{m.prescriberName || "—"}</td>
                <td className="py-2.5 text-sm text-gray-600">{m.pharmacyName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-gray-400">No outside medications recorded</p>
      )}
    </div>
  );
}

function NotesTab({ patient }: { patient: PatientWithRelations }) {
  return (
    <div>
      {patient.notes ? (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{patient.notes}</p>
      ) : (
        <p className="text-sm text-gray-400">No notes</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 capitalize">{value}</dd>
    </div>
  );
}
