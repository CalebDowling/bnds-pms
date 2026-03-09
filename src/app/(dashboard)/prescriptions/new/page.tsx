"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPrescription, searchPatients } from "@/app/(dashboard)/prescriptions/actions";
import { searchPrescribers } from "@/app/(dashboard)/prescriptions/prescriber-actions";
import { searchItems } from "@/app/(dashboard)/inventory/actions";
import { searchFormulas } from "@/app/(dashboard)/compounding/actions";

export default function NewPrescriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Patient search
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showPatientDD, setShowPatientDD] = useState(false);

  // Prescriber search
  const [prescriberQuery, setPrescriberQuery] = useState("");
  const [prescriberResults, setPrescriberResults] = useState<any[]>([]);
  const [selectedPrescriber, setSelectedPrescriber] = useState<any>(null);
  const [showPrescriberDD, setShowPrescriberDD] = useState(false);

  // Drug / Formula search
  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<any[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<any>(null);
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
        setDrugResults(formulas.map((f: any) => ({ ...f, _type: "formula", label: `${f.name} (${f.formulaCode})`, sub: f.dosageForm || f.category || "" })));
      } else {
        const items = await searchItems(drugQuery);
        setDrugResults(items.map((i: any) => ({ ...i, _type: "item", label: `${i.name}${i.strength ? ` ${i.strength}` : ""}`, sub: i.dosageForm || i.manufacturer || "" })));
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

      router.push(`/prescriptions/${rx.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent";

  function renderSearchField(label: string, selected: any, onClear: () => void, query: string, setQuery: (v: string) => void, results: any[], showDD: boolean, setShowDD: (v: boolean) => void, onSelect: (item: any) => void, placeholder: string, renderItem: (item: any) => React.ReactNode, selectedDisplay: React.ReactNode) {
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Prescription</h1>
        <p className="text-sm text-gray-500 mt-1">Enter a new prescription order</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>}

        {/* Patient */}
        {renderSearchField("Patient", selectedPatient, () => { setSelectedPatient(null); setPatientQuery(""); },
          patientQuery, setPatientQuery, patientResults, showPatientDD, setShowPatientDD,
          (p) => setSelectedPatient(p), "Search by patient name or MRN...",
          (p) => <><span className="font-medium">{p.lastName}, {p.firstName}</span><span className="text-gray-400 ml-2 font-mono text-xs">{p.mrn}</span></>,
          selectedPatient && <div><p className="text-sm font-medium text-gray-900">{selectedPatient.lastName}, {selectedPatient.firstName}</p><p className="text-xs text-gray-500">{selectedPatient.mrn}</p></div>
        )}

        {/* Prescriber */}
        {renderSearchField("Prescriber", selectedPrescriber, () => { setSelectedPrescriber(null); setPrescriberQuery(""); },
          prescriberQuery, setPrescriberQuery, prescriberResults, showPrescriberDD, setShowPrescriberDD,
          (d) => setSelectedPrescriber(d), "Search by prescriber name or NPI...",
          (d) => <><span className="font-medium">Dr. {d.lastName}, {d.firstName}</span><span className="text-gray-400 ml-2 text-xs">NPI: {d.npi}</span></>,
          selectedPrescriber && <div><p className="text-sm font-medium text-gray-900">Dr. {selectedPrescriber.lastName}, {selectedPrescriber.firstName}</p><p className="text-xs text-gray-500">NPI: {selectedPrescriber.npi}</p></div>
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
                className="w-4 h-4 text-[#1B4F72] border-gray-300 rounded focus:ring-[#1B4F72]" />
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
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {drugResults.map((d: any) => (
                    <button key={d.id} type="button" onClick={() => { setSelectedDrug(d); setShowDrugDD(false); setDrugQuery(""); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                      <span className="font-medium">{d.label}</span>
                      {d.sub && <span className="text-gray-400 ml-2 text-xs">{d.sub}</span>}
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
                <option value="">None</option>
                <option value="0">0 - No product selection</option>
                <option value="1">1 - Sub not allowed</option>
                <option value="2">2 - Patient requested brand</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Directions (SIG)</label>
            <textarea value={form.directions} onChange={(e) => updateField("directions", e.target.value)}
              rows={2} placeholder="Take 1 capsule by mouth twice daily..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1B4F72]" />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prescriber Notes</label>
              <textarea value={form.prescriberNotes} onChange={(e) => updateField("prescriberNotes", e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1B4F72]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
              <textarea value={form.internalNotes} onChange={(e) => updateField("internalNotes", e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1B4F72]" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-[#1B4F72] text-white text-sm font-medium rounded-lg hover:bg-[#154360] disabled:opacity-50">
            {loading ? "Creating..." : "Create Prescription"}
          </button>
        </div>
      </form>
    </div>
  );
}
