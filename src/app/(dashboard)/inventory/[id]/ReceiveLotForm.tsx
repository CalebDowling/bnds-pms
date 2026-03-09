"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addLot } from "@/app/(dashboard)/inventory/actions";

export default function ReceiveLotForm({ itemId, unitOfMeasure }: { itemId: string; unitOfMeasure: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    lotNumber: "", expirationDate: "", quantityReceived: "",
    unitCost: "", dateReceived: new Date().toISOString().split("T")[0],
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!form.lotNumber.trim()) throw new Error("Lot number is required");
      if (!form.expirationDate) throw new Error("Expiration date is required");
      if (!form.quantityReceived || parseFloat(form.quantityReceived) <= 0) throw new Error("Quantity must be > 0");

      const qty = parseFloat(form.quantityReceived);

      await addLot({
        itemId,
        lotNumber: form.lotNumber,
        expirationDate: form.expirationDate,
        quantityReceived: qty,
        quantityOnHand: qty,
        unit: unitOfMeasure || "each",
        unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined,
        dateReceived: form.dateReceived,
      });

      setForm({ lotNumber: "", expirationDate: "", quantityReceived: "", unitCost: "", dateReceived: new Date().toISOString().split("T")[0] });
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to receive lot");
    } finally { setLoading(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="px-4 py-2 bg-[#1B4F72] text-white text-sm font-medium rounded-lg hover:bg-[#154360] transition-colors">
        + Receive Lot
      </button>
    );
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent";

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Receive New Lot</h3>
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-3 border border-red-200">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lot # *</label>
            <input type="text" value={form.lotNumber} onChange={(e) => updateField("lotNumber", e.target.value)}
              required placeholder="e.g. ABC12345" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Expiration *</label>
            <input type="date" value={form.expirationDate} onChange={(e) => updateField("expirationDate", e.target.value)}
              required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Qty Received *</label>
            <input type="number" step="0.01" value={form.quantityReceived} onChange={(e) => updateField("quantityReceived", e.target.value)}
              required placeholder={unitOfMeasure || "qty"} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unit Cost ($)</label>
            <input type="number" step="0.0001" value={form.unitCost} onChange={(e) => updateField("unitCost", e.target.value)}
              placeholder="per unit" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date Received</label>
            <input type="date" value={form.dateReceived} onChange={(e) => updateField("dateReceived", e.target.value)}
              className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button type="button" onClick={() => { setOpen(false); setError(null); }}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button type="submit" disabled={loading}
            className="px-4 py-1.5 bg-[#1B4F72] text-white text-sm font-medium rounded-lg hover:bg-[#154360] disabled:opacity-50 transition-colors">
            {loading ? "Saving..." : "Receive"}
          </button>
        </div>
      </form>
    </div>
  );
}
