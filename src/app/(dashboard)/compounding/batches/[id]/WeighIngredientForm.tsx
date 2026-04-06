"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addBatchIngredient } from "@/app/(dashboard)/compounding/actions";
import { getErrorMessage } from "@/lib/errors";

type AvailableLot = {
  id: string;
  lotNumber: string;
  quantityOnHand: number;
  expirationDate: string;
};

export default function WeighIngredientForm({
  batchId,
  ingredientName,
  expectedQty,
  expectedUnit,
  itemId,
  lots,
}: {
  batchId: string;
  ingredientName: string;
  expectedQty: number;
  expectedUnit: string;
  itemId: string;
  lots: AvailableLot[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  const [selectedLot, setSelectedLot] = useState("");
  const [quantity, setQuantity] = useState(expectedQty.toString());

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(d => {
      if (d.userId) setUserId(d.userId);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setError("User session not found"); return; }
    if (!selectedLot) { setError("Select a lot"); return; }
    setLoading(true);
    setError(null);

    try {
      await addBatchIngredient(batchId, {
        itemLotId: selectedLot,
        quantityUsed: parseFloat(quantity),
        unit: expectedUnit,
      }, userId);

      setOpen(false);
      router.refresh();
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally { setLoading(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-xs text-[#40721D] font-medium hover:underline">Weigh</button>
    );
  }

  return (
    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <p className="text-xs font-semibold text-gray-700 mb-2">Weigh: {ingredientName} (expect {expectedQty} {expectedUnit})</p>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Lot</label>
          <select value={selectedLot} onChange={(e) => setSelectedLot(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg">
            <option value="">Select lot...</option>
            {lots.map(l => (
              <option key={l.id} value={l.id}>
                {l.lotNumber} — {Number(l.quantityOnHand)} on hand — exp {l.expirationDate}
              </option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <label className="block text-xs text-gray-500 mb-1">Actual Qty</label>
          <input type="number" step="0.0001" value={quantity} onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg" />
        </div>
        <button type="submit" disabled={loading}
          className="px-3 py-1.5 bg-[#40721D] text-white text-xs font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50">
          {loading ? "..." : "Record"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </form>
    </div>
  );
}
