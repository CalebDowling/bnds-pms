'use client';

import React, { useState } from 'react';

export const dynamic = 'force-dynamic';

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  lineTotal: number;
}

interface PricingData {
  ingredients: Ingredient[];
  laborRate: number; // $/hour
  laborMinutes: number;
  overhead: number; // percentage
  containerCost: number;
  dispensingFee: number;
  markupPercent: number;
  quantityMade: number;
  quantityUnit: string;
}

export interface Formula {
  id: string;
  name: string;
  formulaCode: string;
}

interface CompoundPricingPageProps {
  initialFormulas: Formula[];
}

export function CompoundPricingPage({ initialFormulas }: CompoundPricingPageProps) {
  const [formulas, setFormulas] = useState<Formula[]>(initialFormulas);
  const [selectedFormula, setSelectedFormula] = useState('custom');
  const [calculating, setCalculating] = useState(false);

  const [pricing, setPricing] = useState<PricingData>({
    ingredients: [{ id: '1', name: '', quantity: 0, unit: 'g', costPerUnit: 0, lineTotal: 0 }],
    laborRate: 50, // $50/hour default
    laborMinutes: 30,
    overhead: 30, // 30% default
    containerCost: 2.5,
    dispensingFee: 7.5,
    markupPercent: 100, // 100% markup
    quantityMade: 100,
    quantityUnit: 'mL',
  });

  const [results, setResults] = useState<any>(null);

  const updateIngredient = (id: string, field: string, value: any) => {
    setPricing((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing) => {
        if (ing.id !== id) return ing;

        const updated = { ...ing, [field]: value };
        if (field === 'quantity' || field === 'costPerUnit') {
          updated.lineTotal =
            parseFloat(String(updated.quantity)) *
            parseFloat(String(updated.costPerUnit));
        }
        return updated;
      }),
    }));
  };

  const addIngredient = () => {
    setPricing((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          id: Date.now().toString(),
          name: '',
          quantity: 0,
          unit: 'g',
          costPerUnit: 0,
          lineTotal: 0,
        },
      ],
    }));
  };

  const removeIngredient = (id: string) => {
    if (pricing.ingredients.length === 1) return;
    setPricing((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((ing) => ing.id !== id),
    }));
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const res = await fetch("/api/compounding/calculate-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: pricing.ingredients,
          laborRate: pricing.laborRate,
          laborMinutes: pricing.laborMinutes,
          overhead: pricing.overhead,
          containerCost: pricing.containerCost,
          dispensingFee: pricing.dispensingFee,
          markupPercent: pricing.markupPercent,
          quantityMade: pricing.quantityMade,
        }),
      });

      if (!res.ok) throw new Error("Calculation failed");

      const result = await res.json();
      setResults(result);
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveQuote = async () => {
    if (results) {
      try {
        const res = await fetch("/api/compounding/save-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formulaId: selectedFormula,
            data: {
              ...pricing,
              ...results,
            },
          }),
        });

        if (!res.ok) throw new Error("Save failed");

        alert('Quote saved successfully');
      } catch (error) {
        alert(`Error saving quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const ingredientSubtotal = pricing.ingredients.reduce(
    (sum, ing) => sum + ing.lineTotal,
    0
  );
  const laborCost = (pricing.laborRate / 60) * pricing.laborMinutes;
  const overheadCost = ingredientSubtotal * (pricing.overhead / 100);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Compound Pricing Calculator
        </h1>
        <p className="text-gray-600">
          Calculate ingredient costs and suggested retail prices
        </p>
      </div>

      {/* Formula Selector */}
      <div className="bg-white rounded-xl border border-option-b-border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Formula
        </label>
        <select
          value={selectedFormula}
          onChange={(e) => setSelectedFormula(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="custom">Custom / Ad-hoc</option>
          {formulas.map((formula) => (
            <option key={formula.id} value={formula.id}>
              {formula.name} ({formula.formulaCode})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingredients Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-option-b-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Ingredients</h2>
              <button
                onClick={addIngredient}
                className="flex items-center gap-1 text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                + Add Ingredient
              </button>
            </div>

            <div className="space-y-3">
              {pricing.ingredients.map((ing, idx) => (
                <div key={ing.id} className="grid grid-cols-12 gap-2 items-end">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) =>
                      updateIngredient(ing.id, 'name', e.target.value)
                    }
                    placeholder="Ingredient name"
                    className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={ing.quantity}
                    onChange={(e) =>
                      updateIngredient(ing.id, 'quantity', parseFloat(e.target.value))
                    }
                    placeholder="Qty"
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={ing.unit}
                    onChange={(e) =>
                      updateIngredient(ing.id, 'unit', e.target.value)
                    }
                    className="col-span-2 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="g">g</option>
                    <option value="mL">mL</option>
                    <option value="oz">oz</option>
                    <option value="unit">unit</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={ing.costPerUnit}
                    onChange={(e) =>
                      updateIngredient(ing.id, 'costPerUnit', parseFloat(e.target.value))
                    }
                    placeholder="$/unit"
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <div className="col-span-1">
                    <button
                      onClick={() => removeIngredient(ing.id)}
                      disabled={pricing.ingredients.length === 1}
                      className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Configuration */}
          <div className="bg-white rounded-xl border border-option-b-border p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Cost Configuration</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Labor Rate ($/hr)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pricing.laborRate}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      laborRate: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Labor Minutes
                </label>
                <input
                  type="number"
                  value={pricing.laborMinutes}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      laborMinutes: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overhead (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pricing.overhead}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      overhead: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Container Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pricing.containerCost}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      containerCost: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dispensing Fee
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pricing.dispensingFee}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      dispensingFee: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Markup (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pricing.markupPercent}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      markupPercent: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Made
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pricing.quantityMade}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      quantityMade: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={pricing.quantityUnit}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      quantityUnit: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary & Results */}
        <div className="space-y-4">
          {/* Cost Breakdown */}
          <div className="bg-white rounded-xl border border-option-b-border p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Cost Breakdown</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Ingredients:</span>
                <span className="font-medium">${ingredientSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">
                  Labor ({pricing.laborMinutes}min @ ${pricing.laborRate}/hr):
                </span>
                <span className="font-medium">${laborCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">
                  Overhead ({pricing.overhead}%):
                </span>
                <span className="font-medium">${overheadCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Container:</span>
                <span className="font-medium">${pricing.containerCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Dispensing Fee:</span>
                <span className="font-medium">${pricing.dispensingFee.toFixed(2)}</span>
              </div>
            </div>

            {results && (
              <div className="space-y-3 pt-2 border-t-2 border-gray-300">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total Cost:</span>
                  <span className="font-semibold text-lg">
                    ${results.totalCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Per Unit Cost:</span>
                  <span className="font-semibold text-lg">
                    ${results.perUnitCost.toFixed(2)}
                  </span>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-green-900">
                      Suggested Retail:
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      ${results.suggestedRetail.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-green-700">
                    ({pricing.markupPercent}% markup)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-option-b-light to-option-b-dark text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {calculating ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <span>Calculate</span>
              )}
            </button>

            {results && (
              <>
                <button
                  onClick={handleSaveQuote}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  💾 Save Quote
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
                >
                  🖨 Print
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
