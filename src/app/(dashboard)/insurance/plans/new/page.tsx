"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlan } from "../../actions";

export default function NewPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ planName: "", bin: "", pcn: "", phone: "", planType: "" });

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (!form.planName.trim()) throw new Error("Plan name is required");
      if (!form.bin.trim()) throw new Error("BIN is required");
      await createPlan(form);
      router.push("/insurance");
      router.refresh();
    } catch (err: any) { setError(err.message); setLoading(false); }
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Insurance Plan</h1>
        <p className="text-sm text-gray-500 mt-1">Register a third-party payer</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
              <input type="text" value={form.planName} onChange={e => updateField("planName", e.target.value)} required placeholder="e.g. Blue Cross Blue Shield LA" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BIN *</label>
              <input type="text" value={form.bin} onChange={e => updateField("bin", e.target.value)} required placeholder="e.g. 003858" maxLength={10} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PCN</label>
              <input type="text" value={form.pcn} onChange={e => updateField("pcn", e.target.value)} placeholder="Processor Control Number" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
              <select value={form.planType} onChange={e => updateField("planType", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option value="commercial">Commercial</option>
                <option value="medicare">Medicare</option>
                <option value="medicaid">Medicaid</option>
                <option value="tricare">TRICARE</option>
                <option value="workers_comp">Workers' Comp</option>
                <option value="cash">Cash / Discount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Help Desk Phone</label>
              <input type="tel" value={form.phone} onChange={e => updateField("phone", e.target.value)} placeholder="(800) 555-0100" className={inputClass} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50">
            {loading ? "Creating..." : "Create Plan"}
          </button>
        </div>
      </form>
    </div>
  );
}
