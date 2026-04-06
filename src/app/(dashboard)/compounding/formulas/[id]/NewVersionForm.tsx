"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createFormulaVersion } from "@/app/(dashboard)/compounding/actions";
import { searchItems } from "@/app/(dashboard)/inventory/actions";
import { getErrorMessage } from "@/lib/errors";
import type { ItemSearchResult } from "@/types";

type IngredientRow = {
  key: number;
  itemId: string;
  itemName: string;
  quantity: string;
  unit: string;
  isActiveIngredient: boolean;
};

type StepRow = {
  key: number;
  instruction: string;
  equipment: string;
  durationMinutes: string;
  requiresPharmacist: boolean;
};

export default function NewVersionForm({ formulaId, userId }: { formulaId: string; userId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { key: 1, itemId: "", itemName: "", quantity: "", unit: "g", isActiveIngredient: true },
  ]);

  const [steps, setSteps] = useState<StepRow[]>([
    { key: 1, instruction: "", equipment: "", durationMinutes: "", requiresPharmacist: false },
  ]);

  let nextKey = Math.max(...ingredients.map(i => i.key), ...steps.map(s => s.key)) + 1;

  // Ingredient search
  const [searchIdx, setSearchIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ItemSearchResult[]>([]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const results = await searchItems(searchQuery, true);
      setSearchResults(results);
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  function addIngredient() {
    setIngredients([...ingredients, { key: ++nextKey, itemId: "", itemName: "", quantity: "", unit: "g", isActiveIngredient: false }]);
  }

  function removeIngredient(key: number) {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter(i => i.key !== key));
  }

  function updateIngredient(key: number, field: string, value: string | boolean) {
    setIngredients(ingredients.map(i => i.key === key ? { ...i, [field]: value } : i));
  }

  function selectItem(key: number, item: ItemSearchResult) {
    updateIngredient(key, "itemId", item.id);
    updateIngredient(key, "itemName", `${item.name}${item.strength ? ` (${item.strength})` : ""}`);
    updateIngredient(key, "unit", item.unitOfMeasure || "g");
    setSearchIdx(null);
    setSearchQuery("");
    setSearchResults([]);
  }

  function addStep() {
    setSteps([...steps, { key: ++nextKey, instruction: "", equipment: "", durationMinutes: "", requiresPharmacist: false }]);
  }

  function removeStep(key: number) {
    if (steps.length <= 1) return;
    setSteps(steps.filter(s => s.key !== key));
  }

  function updateStep(key: number, field: string, value: string | boolean) {
    setSteps(steps.map(s => s.key === key ? { ...s, [field]: value } : s));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const validIngredients = ingredients.filter(i => i.itemId && i.quantity);
      const validSteps = steps.filter(s => s.instruction.trim());

      if (validIngredients.length === 0) throw new Error("At least one ingredient is required");
      if (validSteps.length === 0) throw new Error("At least one step is required");

      await createFormulaVersion(formulaId, {
        effectiveDate,
        price: price ? parseFloat(price) : undefined,
        notes: notes || undefined,
        ingredients: validIngredients.map((ing, idx) => ({
          itemId: ing.itemId,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit,
          isActiveIngredient: ing.isActiveIngredient,
          sortOrder: idx + 1,
        })),
        steps: validSteps.map((step, idx) => ({
          stepNumber: idx + 1,
          instruction: step.instruction,
          equipment: step.equipment || undefined,
          durationMinutes: step.durationMinutes ? parseInt(step.durationMinutes) : undefined,
          requiresPharmacist: step.requiresPharmacist,
        })),
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
        className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors">
        + New Version
      </button>
    );
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent";

  return (
    <div className="bg-white rounded-xl border-2 border-[#40721D] p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Create New Version</h2>
        <button onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-4 border border-red-200">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Version Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date *</label>
            <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Version notes..." className={inputClass} />
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 uppercase">Ingredients</h3>
            <button type="button" onClick={addIngredient} className="text-xs text-[#40721D] font-medium hover:underline">+ Add Ingredient</button>
          </div>
          <div className="space-y-2">
            {ingredients.map((ing, idx) => (
              <div key={ing.key} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-400 w-6">{idx + 1}.</span>

                {/* Item search */}
                <div className="relative flex-1">
                  {ing.itemId ? (
                    <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-sm text-gray-900">{ing.itemName}</span>
                      <button type="button" onClick={() => { updateIngredient(ing.key, "itemId", ""); updateIngredient(ing.key, "itemName", ""); }}
                        className="text-xs text-red-500 hover:underline ml-2">×</button>
                    </div>
                  ) : (
                    <>
                      <input type="text" value={searchIdx === ing.key ? searchQuery : ""}
                        onFocus={() => setSearchIdx(ing.key)}
                        onChange={(e) => { setSearchIdx(ing.key); setSearchQuery(e.target.value); }}
                        placeholder="Search inventory item..." className={inputClass} />
                      {searchIdx === ing.key && searchResults.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {searchResults.map((item) => (
                            <button key={item.id} type="button" onClick={() => selectItem(ing.key, item)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                              <span className="font-medium">{item.name}</span>
                              {item.strength && <span className="text-gray-400 ml-1">({item.strength})</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <input type="number" step="0.0001" value={ing.quantity}
                  onChange={(e) => updateIngredient(ing.key, "quantity", e.target.value)}
                  placeholder="Qty" className="w-24 px-2 py-2 text-sm border border-gray-300 rounded-lg" />

                <input type="text" value={ing.unit}
                  onChange={(e) => updateIngredient(ing.key, "unit", e.target.value)}
                  className="w-16 px-2 py-2 text-sm border border-gray-300 rounded-lg" />

                <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={ing.isActiveIngredient}
                    onChange={(e) => updateIngredient(ing.key, "isActiveIngredient", e.target.checked)}
                    className="w-3.5 h-3.5 text-[#40721D] border-gray-300 rounded" />
                  <span className="text-xs text-gray-500">Active</span>
                </label>

                <button type="button" onClick={() => removeIngredient(ing.key)}
                  className="text-gray-300 hover:text-red-500 text-lg leading-none" title="Remove">×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 uppercase">Compounding Steps</h3>
            <button type="button" onClick={addStep} className="text-xs text-[#40721D] font-medium hover:underline">+ Add Step</button>
          </div>
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div key={step.key} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-400 w-6 pt-2">{idx + 1}.</span>
                <div className="flex-1 space-y-2">
                  <textarea value={step.instruction}
                    onChange={(e) => updateStep(step.key, "instruction", e.target.value)}
                    rows={2} placeholder="Describe this step..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#40721D]" />
                  <div className="flex gap-2">
                    <input type="text" value={step.equipment}
                      onChange={(e) => updateStep(step.key, "equipment", e.target.value)}
                      placeholder="Equipment" className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg" />
                    <input type="number" value={step.durationMinutes}
                      onChange={(e) => updateStep(step.key, "durationMinutes", e.target.value)}
                      placeholder="Min" className="w-16 px-2 py-1.5 text-xs border border-gray-300 rounded-lg" />
                    <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                      <input type="checkbox" checked={step.requiresPharmacist}
                        onChange={(e) => updateStep(step.key, "requiresPharmacist", e.target.checked)}
                        className="w-3.5 h-3.5 text-[#40721D] border-gray-300 rounded" />
                      <span className="text-xs text-gray-500">RPh</span>
                    </label>
                  </div>
                </div>
                <button type="button" onClick={() => removeStep(step.key)}
                  className="text-gray-300 hover:text-red-500 text-lg leading-none pt-2" title="Remove">×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 transition-colors">
            {loading ? "Creating..." : "Create Version"}
          </button>
        </div>
      </form>
    </div>
  );
}
