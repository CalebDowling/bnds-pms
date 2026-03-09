"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addBatchQa } from "@/app/(dashboard)/compounding/actions";

const CHECK_TYPES = [
  "Weight Verification",
  "pH Check",
  "Appearance",
  "Color",
  "Odor",
  "Viscosity",
  "Sterility",
  "Endotoxin",
  "Potency",
  "Uniformity",
  "Particle Size",
  "Other",
];

export default function QaCheckForm({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  const [checkType, setCheckType] = useState("Appearance");
  const [expectedValue, setExpectedValue] = useState("");
  const [actualValue, setActualValue] = useState("");
  const [result, setResult] = useState("pass");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(d => {
      if (d.userId) setUserId(d.userId);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setError("User session not found"); return; }
    setLoading(true);
    setError(null);

    try {
      await addBatchQa(batchId, {
        checkType,
        expectedValue: expectedValue || undefined,
        actualValue: actualValue || undefined,
        result,
        notes: notes || undefined,
      }, userId);

      setCheckType("Appearance");
      setExpectedValue("");
      setActualValue("");
      setResult("pass");
      setNotes("");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to record");
    } finally { setLoading(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="px-4 py-2 bg-[#1B4F72] text-white text-sm font-medium rounded-lg hover:bg-[#154360] transition-colors">
        + Add QA Check
      </button>
    );
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent";

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">New QA Check</h3>
      {error && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Check Type</label>
            <select value={checkType} onChange={(e) => setCheckType(e.target.value)} className={inputClass}>
              {CHECK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Expected</label>
            <input type="text" value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)}
              placeholder="e.g. White, pH 5.5" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Actual</label>
            <input type="text" value={actualValue} onChange={(e) => setActualValue(e.target.value)}
              placeholder="Observed value" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Result</label>
            <select value={result} onChange={(e) => setResult(e.target.value)} className={inputClass}>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="warning">Warning</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional" className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button type="submit" disabled={loading}
            className="px-4 py-1.5 bg-[#1B4F72] text-white text-sm font-medium rounded-lg hover:bg-[#154360] disabled:opacity-50">
            {loading ? "Saving..." : "Record Check"}
          </button>
        </div>
      </form>
    </div>
  );
}
