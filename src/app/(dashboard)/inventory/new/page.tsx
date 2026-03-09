"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createItem } from "@/app/(dashboard)/inventory/actions";

export default function NewItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    ndc: "", name: "", genericName: "", brandName: "", strength: "", dosageForm: "",
    route: "", manufacturer: "", unitOfMeasure: "", packageSize: "", awp: "",
    acquisitionCost: "", reorderPoint: "", reorderQuantity: "", deaSchedule: "",
    isCompoundIngredient: false, isRefrigerated: false, isControlled: false, isOtc: false,
  });

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!form.name.trim()) throw new Error("Item name is required");

      const item = await createItem({
        ndc: form.ndc || undefined,
        name: form.name,
        genericName: form.genericName || undefined,
        brandName: form.brandName || undefined,
        strength: form.strength || undefined,
        dosageForm: form.dosageForm || undefined,
        route: form.route || undefined,
        manufacturer: form.manufacturer || undefined,
        unitOfMeasure: form.unitOfMeasure || undefined,
        packageSize: form.packageSize || undefined,
        awp: form.awp ? parseFloat(form.awp) : undefined,
        acquisitionCost: form.acquisitionCost ? parseFloat(form.acquisitionCost) : undefined,
        reorderPoint: form.reorderPoint ? parseFloat(form.reorderPoint) : undefined,
        reorderQuantity: form.reorderQuantity ? parseFloat(form.reorderQuantity) : undefined,
        deaSchedule: form.deaSchedule || undefined,
        isCompoundIngredient: form.isCompoundIngredient,
        isRefrigerated: form.isRefrigerated,
        isControlled: form.isControlled,
        isOtc: form.isOtc,
      });

      router.push(`/inventory/${item.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Inventory Item</h1>
        <p className="text-sm text-gray-500 mt-1">Add a drug, chemical, or supply to the catalog</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>
        )}

        {/* Drug Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NDC</label>
              <input type="text" value={form.ndc} onChange={(e) => updateField("ndc", e.target.value)}
                placeholder="00000-0000-00" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)}
                required placeholder="Brand or display name" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generic Name</label>
              <input type="text" value={form.genericName} onChange={(e) => updateField("genericName", e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
              <input type="text" value={form.brandName} onChange={(e) => updateField("brandName", e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Strength</label>
              <input type="text" value={form.strength} onChange={(e) => updateField("strength", e.target.value)}
                placeholder="e.g. 200mg, 10mg/mL" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage Form</label>
              <select value={form.dosageForm} onChange={(e) => updateField("dosageForm", e.target.value)} className={inputClass}>
                <option value="">Select</option>
                <option value="capsule">Capsule</option>
                <option value="tablet">Tablet</option>
                <option value="cream">Cream</option>
                <option value="ointment">Ointment</option>
                <option value="solution">Solution</option>
                <option value="suspension">Suspension</option>
                <option value="powder">Powder (bulk)</option>
                <option value="injection">Injection</option>
                <option value="gel">Gel</option>
                <option value="suppository">Suppository</option>
                <option value="drops">Drops</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
              <select value={form.route} onChange={(e) => updateField("route", e.target.value)} className={inputClass}>
                <option value="">Select</option>
                <option value="oral">Oral</option>
                <option value="topical">Topical</option>
                <option value="injectable">Injectable</option>
                <option value="vaginal">Vaginal</option>
                <option value="rectal">Rectal</option>
                <option value="nasal">Nasal</option>
                <option value="ophthalmic">Ophthalmic</option>
                <option value="otic">Otic</option>
                <option value="inhalation">Inhalation</option>
                <option value="sublingual">Sublingual</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <input type="text" value={form.manufacturer} onChange={(e) => updateField("manufacturer", e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
              <input type="text" value={form.unitOfMeasure} onChange={(e) => updateField("unitOfMeasure", e.target.value)}
                placeholder="e.g. each, mL, g" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Size</label>
              <input type="text" value={form.packageSize} onChange={(e) => updateField("packageSize", e.target.value)}
                placeholder="e.g. 100ct, 500g" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Stock</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AWP ($)</label>
              <input type="number" step="0.01" value={form.awp} onChange={(e) => updateField("awp", e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Cost ($)</label>
              <input type="number" step="0.01" value={form.acquisitionCost} onChange={(e) => updateField("acquisitionCost", e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DEA Schedule</label>
              <select value={form.deaSchedule} onChange={(e) => updateField("deaSchedule", e.target.value)} className={inputClass}>
                <option value="">Non-controlled</option>
                <option value="2">Schedule II</option>
                <option value="3">Schedule III</option>
                <option value="4">Schedule IV</option>
                <option value="5">Schedule V</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
              <input type="number" step="0.01" value={form.reorderPoint} onChange={(e) => updateField("reorderPoint", e.target.value)}
                placeholder="Alert when stock falls below" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Quantity</label>
              <input type="number" step="0.01" value={form.reorderQuantity} onChange={(e) => updateField("reorderQuantity", e.target.value)}
                className={inputClass} />
            </div>
          </div>
          <div className="flex flex-wrap gap-6 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isCompoundIngredient}
                onChange={(e) => updateField("isCompoundIngredient", e.target.checked)}
                className="w-4 h-4 text-[#1B4F72] border-gray-300 rounded focus:ring-[#1B4F72]" />
              <span className="text-sm text-gray-700">Compound Ingredient</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isRefrigerated}
                onChange={(e) => updateField("isRefrigerated", e.target.checked)}
                className="w-4 h-4 text-[#1B4F72] border-gray-300 rounded focus:ring-[#1B4F72]" />
              <span className="text-sm text-gray-700">Requires Refrigeration</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isControlled}
                onChange={(e) => updateField("isControlled", e.target.checked)}
                className="w-4 h-4 text-[#1B4F72] border-gray-300 rounded focus:ring-[#1B4F72]" />
              <span className="text-sm text-gray-700">Controlled Substance</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isOtc}
                onChange={(e) => updateField("isOtc", e.target.checked)}
                className="w-4 h-4 text-[#1B4F72] border-gray-300 rounded focus:ring-[#1B4F72]" />
              <span className="text-sm text-gray-700">OTC</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-[#1B4F72] text-white text-sm font-medium rounded-lg hover:bg-[#154360] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? "Saving..." : "Add Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
