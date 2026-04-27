"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPrescription, searchPatients } from "@/app/(dashboard)/prescriptions/actions";
import { searchPrescribers } from "@/app/(dashboard)/prescriptions/prescriber-actions";
import { searchItems } from "@/app/(dashboard)/inventory/actions";
import { searchFormulas } from "@/app/(dashboard)/compounding/actions";
import SigCodePicker from "@/components/rx/SigCodePicker";
import { formatDrugName, formatPatientName, formatPrescriberName } from "@/lib/utils/formatters";

import type { PatientSearchResult, PrescriberSearchResult, FormulaSearchResult, ItemSearchResult, SearchableItem, DrugSearchResult } from "@/types";

/**
 * Compose the bold first-line label for a drug picker row.
 *
 * The DRX feed often stores the strength inside `name` (e.g.
 * "Lisinopril 1.25 mg Capsule") AND repeats it in the dedicated
 * `strength` column ("1.25 MG"). A naive `${name} ${strength}`
 * concat then renders "Lisinopril 1.25 mg Capsule 1.25 MG", which
 * looks like a typo to a tech. Detect that overlap by normalising
 * both sides (case-insensitive, whitespace-collapsed, strip the
 * unit suffix) and skip the suffix when it's already represented.
 */
function buildDrugLabel(name: string | null | undefined, strength: string | null | undefined): string {
  const formattedName = formatDrugName(name);
  if (!strength) return formattedName;
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const stripUnits = (s: string) => normalize(s).replace(/[\s.]+/g, "");
  const nameNorm = stripUnits(formattedName);
  const strengthNorm = stripUnits(strength);
  // Strength already embedded in name — don't repeat.
  if (strengthNorm && nameNorm.includes(strengthNorm)) return formattedName;
  return `${formattedName} ${strength}`;
}

export default function NewPrescriptionForm({
  // Pre-selected patient (e.g. when arriving from /patients/[id] via the
  // "+ New Rx" button with ?patientId=...). The form still allows the
  // user to clear and pick a different patient.
  initialPatient,
}: {
  initialPatient?: PatientSearchResult | null;
} = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Patient search
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(initialPatient ?? null);
  const [showPatientDD, setShowPatientDD] = useState(false);

  // Prescriber search
  const [prescriberQuery, setPrescriberQuery] = useState("");
  const [prescriberResults, setPrescriberResults] = useState<PrescriberSearchResult[]>([]);
  const [selectedPrescriber, setSelectedPrescriber] = useState<PrescriberSearchResult | null>(null);
  const [showPrescriberDD, setShowPrescriberDD] = useState(false);

  // Drug / Formula search
  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<DrugSearchResult[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<DrugSearchResult | null>(null);
  const [showDrugDD, setShowDrugDD] = useState(false);

  const [form, setForm] = useState({
    source: "written", priority: "normal", isCompound: false,
    quantityPrescribed: "", daysSupply: "", directions: "", dawCode: "",
    refillsAuthorized: "0", dateWritten: new Date().toISOString().split("T")[0],
    expirationDate: "", prescriberNotes: "", internalNotes: "",
  });

  useEffect(() => {
    if (patientQuery.length < 2) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      setPatientResults(await searchPatients(patientQuery));
      setShowPatientDD(true);
    }, 200);
    return () => clearTimeout(t);
  }, [patientQuery]);

  useEffect(() => {
    if (prescriberQuery.length < 2) { setPrescriberResults([]); return; }
    const t = setTimeout(async () => {
      setPrescriberResults(await searchPrescribers(prescriberQuery));
      setShowPrescriberDD(true);
    }, 200);
    return () => clearTimeout(t);
  }, [prescriberQuery]);

  useEffect(() => {
    if (drugQuery.length < 2) { setDrugResults([]); return; }
    const t = setTimeout(async () => {
      if (form.isCompound) {
        const formulas = await searchFormulas(drugQuery);
        setDrugResults(formulas.map((f: FormulaSearchResult) => ({ ...f, _type: "formula", label: `${f.name} (${f.formulaCode})`, sub: f.category || f.dosageForm || "" })));
      } else {
        const items = await searchItems(drugQuery);
        // Title-case the drug name (DRX feeds it ALL CAPS) and stash NDC +
        // manufacturer in the dropdown so the tech can disambiguate two
        // entries with the same name. `label` is what we render bold;
        // `sub` is the muted second-line metadata.
        //
        // Dedup by NDC: legacy DRX import created duplicate item rows for
        // the same product (e.g. two "Lisinopril 10 MG" entries with NDC
        // 68180051401 LUPIN). Without a dedup pass the picker shows the
        // same drug twice. Items without an NDC keep their own ids as
        // dedup keys so unrelated compound ingredients don't collapse.
        const seen = new Set<string>();
        const deduped: ItemSearchResult[] = [];
        for (const i of items) {
          const key = i.ndc ? `ndc:${i.ndc}` : `id:${i.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(i);
        }
        setDrugResults(deduped.map((i: ItemSearchResult) => ({
          ...i,
          _type: "item",
          label: buildDrugLabel(i.name, i.strength),
          // Always render an NDC slot — even when missing — so dispensers
          // see the gap in product data instead of mistaking a missing
          // line for "no metadata available".
          sub: [
            i.ndc ? `NDC ${i.ndc}` : "NDC unavailable",
            i.manufacturer || null,
          ].filter(Boolean).join(" \u00B7 "),
        })));
      }
      setShowDrugDD(true);
    }, 200);
    return () => clearTimeout(t);
  }, [drugQuery, form.isCompound]);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "isCompound") { setSelectedDrug(null); setDrugQuery(""); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Safety net: if the action neither resolves nor rejects within 60s
    // (e.g. session expired mid-action and the server-action POST got
    // intercepted by middleware → /login), surface a clear error and
    // un-stick the button instead of sitting on "Creating..." forever.
    //
    // 60s (was 30s) — the create path can stack up: Supabase cold start
    // (~12-18s on first hit), the rxNumber P2002 retry loop (worst case
    // ~1.5s @ 20 attempts), DUR engine, and audit logging. 30s was tripping
    // false-positive timeouts on real successful saves under cold-start load.
    const timeoutId = setTimeout(() => {
      setError("This is taking too long. Your session may have expired — refresh the page and sign in again.");
      setLoading(false);
    }, 60_000);

    try {
      if (!selectedPatient) throw new Error("Please select a patient");
      if (!selectedPrescriber) throw new Error("Please select a prescriber");

      const rx = await createPrescription({
        patientId: selectedPatient.id,
        prescriberId: selectedPrescriber.id,
        source: form.source,
        priority: form.priority,
        isCompound: form.isCompound,
        itemId: selectedDrug?._type === "item" ? selectedDrug.id : undefined,
        formulaId: selectedDrug?._type === "formula" ? selectedDrug.id : undefined,
        quantityPrescribed: form.quantityPrescribed ? parseFloat(form.quantityPrescribed) : undefined,
        daysSupply: form.daysSupply ? parseInt(form.daysSupply) : undefined,
        directions: form.directions,
        dawCode: form.dawCode,
        refillsAuthorized: parseInt(form.refillsAuthorized) || 0,
        dateWritten: form.dateWritten,
        expirationDate: form.expirationDate || undefined,
        prescriberNotes: form.prescriberNotes,
        internalNotes: form.internalNotes,
      });

      clearTimeout(timeoutId);

      // Defensive: a server-action POST intercepted by middleware can
      // return undefined instead of throwing. Surface that as an error
      // rather than crashing on `rx.id`.
      if (!rx?.id) {
        throw new Error("Prescription was not created. Try refreshing and signing in again.");
      }

      router.push(`/prescriptions/${rx.id}`);
      router.refresh();
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      setError((err instanceof Error ? err.message : String(err)) || "Something went wrong");
      setLoading(false);
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent";

  function renderSearchField(label: string, selected: SearchableItem | null, onClear: () => void, query: string, setQuery: (v: string) => void, results: SearchableItem[], showDD: boolean, setShowDD: (v: boolean) => void, onSelect: (item: SearchableItem) => void, placeholder: string, renderItem: (item: SearchableItem) => React.ReactNode, selectedDisplay: React.ReactNode) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{label}</h2>
        {selected ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            {selectedDisplay}
            <button type="button" onClick={onClear} className="text-sm text-red-600 hover:underline">Change</button>
          </div>
        ) : (
          <div className="relative">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowDD(true)}
              onBlur={() => setTimeout(() => setShowDD(false), 200)}
              placeholder={placeholder} className={inputClass} />
            {showDD && results.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {results.map((item) => (
                  <button key={item.id} type="button" onClick={() => { onSelect(item); setShowDD(false); setQuery(""); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    {renderItem(item)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Prescription</h1>
        <p className="text-sm text-gray-500 mt-1">Enter a new prescription order</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>}

        {/* Patient.
            Picker rows show DOB + last 4 of phone alongside name + MRN so a
            tech can disambiguate same-named patients without a chart click —
            same DOB + phone is exceedingly rare, while same-name is common
            (especially across spouses, generations, and seed data). */}
        {renderSearchField("Patient", selectedPatient, () => { setSelectedPatient(null); setPatientQuery(""); },
          patientQuery, setPatientQuery, patientResults, showPatientDD, setShowPatientDD,
          (p) => setSelectedPatient(p as PatientSearchResult), "Search by patient name, MRN, or phone...",
          (p: any) => {
            const dob = p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString("en-US") : null;
            const primaryPhone = p.phoneNumbers?.[0]?.number;
            const phoneDigits = primaryPhone ? String(primaryPhone).replace(/\D/g, "") : null;
            const phoneFormatted = phoneDigits && phoneDigits.length === 10
              ? `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`
              : primaryPhone;
            return (
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">
                    {formatPatientName({ firstName: p.firstName, lastName: p.lastName }, { format: "last-first" })}
                  </span>
                  <span className="text-gray-400 font-mono text-[11px]">{p.mrn}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {dob && <span>DOB {dob}</span>}
                  {dob && phoneFormatted && <span className="mx-1.5">·</span>}
                  {phoneFormatted && <span className="font-mono">{phoneFormatted}</span>}
                </div>
              </div>
            );
          },
          selectedPatient && (() => {
            const dob = selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString("en-US") : null;
            const primaryPhone = (selectedPatient as any).phoneNumbers?.[0]?.number;
            const phoneDigits = primaryPhone ? String(primaryPhone).replace(/\D/g, "") : null;
            const phoneFormatted = phoneDigits && phoneDigits.length === 10
              ? `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`
              : primaryPhone;
            return (
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {formatPatientName({ firstName: selectedPatient.firstName, lastName: selectedPatient.lastName }, { format: "last-first" })}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedPatient.mrn}
                  {dob && <span> · DOB {dob}</span>}
                  {phoneFormatted && <span> · <span className="font-mono">{phoneFormatted}</span></span>}
                </p>
              </div>
            );
          })()
        )}

        {/* Prescriber */}
        {renderSearchField("Prescriber", selectedPrescriber, () => { setSelectedPrescriber(null); setPrescriberQuery(""); },
          prescriberQuery, setPrescriberQuery, prescriberResults, showPrescriberDD, setShowPrescriberDD,
          (d) => setSelectedPrescriber(d as PrescriberSearchResult), "Search by prescriber name or NPI...",
          (d: any) => <><span className="font-medium">{formatPrescriberName({ firstName: d.firstName, lastName: d.lastName })}</span><span className="text-gray-400 ml-2 text-xs">NPI: {d.npi}</span></>,
          selectedPrescriber && <div><p className="text-sm font-medium text-gray-900">{formatPrescriberName({ firstName: selectedPrescriber.firstName, lastName: selectedPrescriber.lastName })}</p><p className="text-xs text-gray-500">NPI: {selectedPrescriber.npi}</p></div>
        )}

        {/* Drug / Formula */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {form.isCompound ? "Compound Formula" : "Drug / Item"}
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isCompound}
                onChange={(e) => updateField("isCompound", e.target.checked)}
                className="w-4 h-4 text-[#40721D] border-gray-300 rounded focus:ring-[#40721D]" />
              <span className="text-sm text-gray-700">Compound</span>
            </label>
          </div>
          {selectedDrug ? (
            <div className={`flex items-center justify-between p-3 rounded-lg border ${form.isCompound ? "bg-purple-50 border-purple-200" : "bg-green-50 border-green-200"}`}>
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedDrug.label}</p>
                <p className="text-xs text-gray-500">{selectedDrug.sub}</p>
              </div>
              <button type="button" onClick={() => { setSelectedDrug(null); setDrugQuery(""); }}
                className="text-sm text-red-600 hover:underline">Change</button>
            </div>
          ) : (
            <div className="relative">
              <input type="text" value={drugQuery} onChange={(e) => setDrugQuery(e.target.value)}
                onFocus={() => drugResults.length > 0 && setShowDrugDD(true)}
                onBlur={() => setTimeout(() => setShowDrugDD(false), 200)}
                placeholder={form.isCompound ? "Search formulas..." : "Search drugs by name or NDC..."}
                className={inputClass} />
              {showDrugDD && drugResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {drugResults.map((d: DrugSearchResult) => (
                    <button key={d.id} type="button" onClick={() => { setSelectedDrug(d); setShowDrugDD(false); setDrugQuery(""); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                      {/* Two-line layout: name (Title Case, bold) on top,
                          NDC + manufacturer underneath in muted text so a
                          tech can disambiguate same-named items. */}
                      <div className="font-medium text-gray-900">{d.label}</div>
                      {d.sub && <div className="text-[11px] text-gray-500 mt-0.5">{d.sub}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rx Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Prescription Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select value={form.source} onChange={(e) => updateField("source", e.target.value)} className={inputClass}>
                <option value="written">Written</option><option value="phone">Phone</option>
                <option value="fax">Fax</option><option value="eRx">eRx / SureScripts</option>
                <option value="transfer">Transfer In</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => updateField("priority", e.target.value)} className={inputClass}>
                <option value="normal">Normal</option><option value="urgent">Urgent</option><option value="stat">STAT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Prescribed</label>
              <input type="number" value={form.quantityPrescribed} onChange={(e) => updateField("quantityPrescribed", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Days Supply</label>
              <input type="number" value={form.daysSupply} onChange={(e) => updateField("daysSupply", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refills</label>
              <input type="number" value={form.refillsAuthorized} onChange={(e) => updateField("refillsAuthorized", e.target.value)} min="0" max="99" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Written <span className="text-red-500">*</span></label>
              <input type="date" value={form.dateWritten} onChange={(e) => updateField("dateWritten", e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
              <input type="date" value={form.expirationDate} onChange={(e) => updateField("expirationDate", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DAW Code</label>
              <select value={form.dawCode} onChange={(e) => updateField("dawCode", e.target.value)} className={inputClass}>
                {/* NCPDP Field 408-D8 — DAW codes. Filling in 3-9 was a real bug
                    found during the pharmacist walkthrough: claims that should
                    have been DAW 5 or 8 were getting rejected because the tech
                    couldn't pick the right code from the dropdown. */}
                <option value="">None</option>
                <option value="0">0 - No product selection</option>
                <option value="1">1 - Sub not allowed (prescriber)</option>
                <option value="2">2 - Patient requested brand</option>
                <option value="3">3 - Pharmacist selected brand</option>
                <option value="4">4 - Generic not in stock</option>
                <option value="5">5 - Brand dispensed as generic</option>
                <option value="6">6 - Override</option>
                <option value="7">7 - Brand mandated by law</option>
                <option value="8">8 - Generic not available</option>
                <option value="9">9 - Plan requests brand</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <SigCodePicker
              value={form.directions}
              onChange={(val) => updateField("directions", val)}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prescriber Notes</label>
              <textarea value={form.prescriberNotes} onChange={(e) => updateField("prescriberNotes", e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#40721D]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
              <textarea value={form.internalNotes} onChange={(e) => updateField("internalNotes", e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#40721D]" />
            </div>
          </div>
        </div>

        {/* Right padding clears the floating "+" FAB (~80px wide zone) */}
        <div className="flex items-center justify-end gap-3 pr-20">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50">
            {loading ? "Creating..." : "Create Prescription"}
          </button>
        </div>
      </form>
    </div>
  );
}
