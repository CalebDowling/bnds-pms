"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFormula } from "@/app/(dashboard)/compounding/actions";

export default function NewFormulaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    formulaCode: "",
    category: "",
    dosageForm: "",
    route: "",
    isSterile: false,
    defaultBudDays: "",
    storageConditions: "",
  });

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!form.name.trim()) throw new Error("Formula name is required");
      if (!form.formulaCode.trim()) throw new Error("Formula code is required");

      const formula = await createFormula({
        name: form.name,
        formulaCode: form.formulaCode,
        category: form.category || undefined,
        dosageForm: form.dosageForm || undefined,
        route: form.route || undefined,
        isSterile: form.isSterile,
        defaultBudDays: form.defaultBudDays ? parseInt(form.defaultBudDays) : undefined,
        storageConditions: form.storageConditions || undefined,
      });

      router.push(`/compounding/formulas/${formula.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Formula</h1>
        <p className="text-sm text-gray-500 mt-1">Create a new compounding formula master record</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Formula Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formula Name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} required
                placeholder="e.g. Progesterone 200mg Capsules"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formula Code <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.formulaCode}
                onChange={(e) => updateField("formulaCode", e.target.value.toUpperCase())} required
                placeholder="e.g. PROG-200-CAP"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input type="text" value={form.category} onChange={(e) => updateField("category", e.target.value)}
                placeholder="e.g. HRT, Pain, Derm"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage Form</label>
              <select value={form.dosageForm} onChange={(e) => updateField("dosageForm", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent">
                <option value="">Select</option>
                <option value="capsule">Capsule</option>
                <option value="cream">Cream</option>
                <option value="ointment">Ointment</option>
                <option value="gel">Gel</option>
                <option value="solution">Solution</option>
                <option value="suspension">Suspension</option>
                <option value="suppository">Suppository</option>
                <option value="troche">Troche / Lozenge</option>
                <option value="injection">Injection</option>
                <option value="nasal_spray">Nasal Spray</option>
                <option value="ophthalmic">Ophthalmic</option>
                <option value="otic">Otic</option>
                <option value="powder">Powder</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
              <select value={form.route} onChange={(e) => updateField("route", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent">
                <option value="">Select</option>
                <option value="oral">Oral</option>
                <option value="topical">Topical</option>
                <option value="sublingual">Sublingual</option>
                <option value="vaginal">Vaginal</option>
                <option value="rectal">Rectal</option>
                <option value="nasal">Nasal</option>
                <option value="ophthalmic">Ophthalmic</option>
                <option value="otic">Otic</option>
                <option value="injectable">Injectable</option>
                <option value="inhalation">Inhalation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default BUD (days)</label>
              <input type="number" value={form.defaultBudDays}
                onChange={(e) => updateField("defaultBudDays", e.target.value)}
                placeholder="e.g. 180"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Storage Conditions</label>
              <input type="text" value={form.storageConditions}
                onChange={(e) => updateField("storageConditions", e.target.value)}
                placeholder="e.g. Room temp, Refrigerate"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isSterile}
                  onChange={(e) => updateField("isSterile", e.target.checked)}
                  className="w-4 h-4 text-[#40721D] border-gray-300 rounded focus:ring-[#40721D]" />
                <span className="text-sm text-gray-700">Sterile Preparation</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            After creating the formula, you'll be able to add ingredients, compounding steps, and versioning from the formula detail page.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? "Creating..." : "Create Formula"}
          </button>
        </div>
      </form>
    </div>
  );
}
