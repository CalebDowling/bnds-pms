"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createFill } from "@/app/(dashboard)/prescriptions/actions";

type LotOption = {
  id: string;
  lotNumber: string;
  quantityOnHand: number;
  expirationDate: string;
};

type BatchOption = {
  id: string;
  batchNumber: string;
  quantityPrepared: number;
  status: string;
};

export default function FillForm({
  prescriptionId,
  isCompound,
  itemId,
  formulaId,
  quantityPrescribed,
  daysSupply,
  lots,
  batches,
  allergies = [],
}: {
  prescriptionId: string;
  isCompound: boolean;
  itemId: string | null;
  formulaId: string | null;
  quantityPrescribed: number | null;
  daysSupply: number | null;
  lots: LotOption[];
  batches: BatchOption[];
  allergies?: { allergen: string; severity: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedLot, setSelectedLot] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [quantity, setQuantity] = useState(quantityPrescribed?.toString() || "");
  const [days, setDays] = useState(daysSupply?.toString() || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quantity || parseFloat(quantity) <= 0) { setError("Quantity is required"); return; }
    if (!isCompound && lots.length > 0 && !selectedLot) { setError("Select an inventory lot before filling"); return; }
    if (isCompound && batches.length > 0 && !selectedBatch) { setError("Select a compounding batch before filling"); return; }
    setLoading(true);
    setError(null);

    try {
      await createFill(prescriptionId, {
        quantity: parseFloat(quantity),
        daysSupply: days ? parseInt(days) : undefined,
        itemId: itemId || undefined,
        itemLotId: selectedLot || undefined,
        batchId: selectedBatch || undefined,
      });

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create fill");
    } finally { setLoading(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
        Fill Prescription
      </button>
    );
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent";

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        {isCompound ? "Fill from Compounding Batch" : "Fill from Inventory Lot"}
      </h3>
      {allergies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <p className="text-xs font-bold text-red-800 mb-1">⚠ ALLERGY CHECK — Verify before dispensing:</p>
          <div className="flex flex-wrap gap-1">
            {allergies.map((a, i) => (
              <span key={i} className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${
                a.severity === "life_threatening" || a.severity === "severe"
                  ? "bg-red-200 text-red-900" : "bg-red-100 text-red-700"
              }`}>{a.allergen} ({a.severity.replace("_", " ")})</span>
            ))}
          </div>
        </div>
      )}
      {error && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg mb-3 border border-red-200">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isCompound ? (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Batch</label>
              {batches.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
                  No verified or completed batches available.{" "}
                  {formulaId && (
                    <Link href={`/compounding?formulaId=${formulaId}`} className="underline font-medium text-yellow-900 hover:text-yellow-700">
                      Start a new batch →
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className={inputClass}>
                    <option value="">Select batch...</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} — {Number(b.quantityPrepared)} prepared — {b.status === "verified" ? "✓ Verified" : b.status}
                      </option>
                    ))}
                  </select>
                  {selectedBatch && batches.find(b => b.id === selectedBatch)?.status !== "verified" && (
                    <p className="text-xs text-yellow-700 mt-1">⚠ This batch is not yet verified by a pharmacist. Verification is recommended before dispensing.</p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Lot</label>
              {lots.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
                  No available inventory lots for this item.{" "}
                  {itemId && (
                    <Link href={`/inventory/${itemId}`} className="underline font-medium text-yellow-900 hover:text-yellow-700">
                      Receive new stock →
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <select value={selectedLot} onChange={(e) => setSelectedLot(e.target.value)} className={inputClass}>
                    <option value="">Select lot...</option>
                    {lots.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.lotNumber} — {l.quantityOnHand} on hand — exp {l.expirationDate}
                      </option>
                    ))}
                  </select>
                  {selectedLot && quantity && (() => {
                    const lot = lots.find(l => l.id === selectedLot);
                    return lot && parseFloat(quantity) > lot.quantityOnHand ? (
                      <p className="text-xs text-red-700 mt-1">⚠ Fill quantity ({quantity}) exceeds available quantity ({lot.quantityOnHand})</p>
                    ) : null;
                  })()}
                </>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
            <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)}
              required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Days Supply</label>
            <input type="number" value={days} onChange={(e) => setDays(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button type="button" onClick={() => { setOpen(false); setError(null); }}
            className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button type="submit" disabled={loading}
            className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
            {loading ? "Filling..." : "Create Fill"}
          </button>
        </div>
      </form>
    </div>
  );
}
