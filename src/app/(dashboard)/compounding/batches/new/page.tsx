"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBatch } from "@/app/(dashboard)/compounding/actions";
import { searchFormulas } from "@/app/(dashboard)/compounding/actions";

export default function NewBatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFormulaId = searchParams.get("formulaId") || "";
  const preselectedVersionId = searchParams.get("versionId") || "";
  const preselectedFormulaName = searchParams.get("formulaName") || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  // Formula selection
  const [formulaQuery, setFormulaQuery] = useState("");
  const [formulaResults, setFormulaResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<any>(
    preselectedFormulaId
      ? { id: preselectedFormulaId, name: preselectedFormulaName, formulaCode: "" }
      : null
  );
  const [versionId, setVersionId] = useState(preselectedVersionId);

  const [form, setForm] = useState({
    quantityPrepared: "",
    unit: "g",
    budDate: "",
    envTemp: "",
    envHumidity: "",
    notes: "",
  });

  // Fetch current user ID on mount
  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(d => {
      if (d.userId) setUserId(d.userId);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (formulaQuery.length < 2) { setFormulaResults([]); return; }
    const t = setTimeout(async () => {
      const results = await searchFormulas(formulaQuery);
      setFormulaResults(results);
      setShowDropdown(true);
    }, 200);
    return () => clearTimeout(t);
  }, [formulaQuery]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!versionId) throw new Error("Please select a formula");
      if (!form.quantityPrepared || parseFloat(form.quantityPrepared) <= 0) throw new Error("Quantity is required");
      if (!form.budDate) throw new Error("BUD date is required");
      if (!userId) throw new Error("User session not found. Please refresh.");

      const batch = await createBatch({
        formulaVersionId: versionId,
        quantityPrepared: parseFloat(form.quantityPrepared),
        unit: form.unit,
        budDate: form.budDate,
        envTemp: form.envTemp ? parseFloat(form.envTemp) : undefined,
        envHumidity: form.envHumidity ? parseFloat(form.envHumidity) : undefined,
        notes: form.notes || undefined,
      }, userId);

      router.push(`/compounding/batches/${batch.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Compounding Batch</h1>
        <p className="text-sm text-gray-500 mt-1">Start a new batch from a formula</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>}

        {/* Formula Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Formula</h2>
          {selectedFormula ? (
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFormula.name}</p>
                <p className="text-xs text-gray-500">{selectedFormula.formulaCode}</p>
              </div>
              {!preselectedFormulaId && (
                <button type="button" onClick={() => { setSelectedFormula(null); setVersionId(""); }}
                  className="text-sm text-red-600 hover:underline">Change</button>
              )}
            </div>
          ) : (
            <div className="relative">
              <input type="text" value={formulaQuery} onChange={(e) => setFormulaQuery(e.target.value)}
                onFocus={() => formulaResults.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Search by formula name or code..." className={inputClass} />
              {showDropdown && formulaResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {formulaResults.map((f: any) => (
                    <button key={f.id} type="button"
                      onClick={() => { setSelectedFormula(f); setShowDropdown(false); setFormulaQuery(""); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                      <span className="font-medium">{f.name}</span>
                      <span className="text-gray-400 ml-2 text-xs">{f.formulaCode}</span>
                      {f.dosageForm && <span className="text-gray-400 ml-2 text-xs capitalize">— {f.dosageForm}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Batch Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Batch Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity to Prepare <span className="text-red-500">*</span>
              </label>
              <input type="number" step="0.01" value={form.quantityPrepared}
                onChange={(e) => updateField("quantityPrepared", e.target.value)}
                required placeholder="e.g. 500" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select value={form.unit} onChange={(e) => updateField("unit", e.target.value)} className={inputClass}>
                <option value="g">g (grams)</option>
                <option value="mg">mg (milligrams)</option>
                <option value="mL">mL (milliliters)</option>
                <option value="L">L (liters)</option>
                <option value="each">each</option>
                <option value="capsules">capsules</option>
                <option value="suppositories">suppositories</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beyond-Use Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={form.budDate}
                onChange={(e) => updateField("budDate", e.target.value)}
                required className={inputClass} />
            </div>
          </div>
        </div>

        {/* Environmental */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Environmental Conditions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
              <input type="number" step="0.1" value={form.envTemp}
                onChange={(e) => updateField("envTemp", e.target.value)}
                placeholder="e.g. 68.5" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Humidity (%)</label>
              <input type="number" step="0.1" value={form.envHumidity}
                onChange={(e) => updateField("envHumidity", e.target.value)}
                placeholder="e.g. 45.0" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input type="text" value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Batch notes..." className={inputClass} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 transition-colors">
            {loading ? "Creating..." : "Start Batch"}
          </button>
        </div>
      </form>
    </div>
  );
}
