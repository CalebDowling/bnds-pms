"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getSigCodes,
  getSigCategories,
  createSigCode,
  updateSigCode,
  deleteSigCode,
} from "./actions";

type SigCode = {
  id: string;
  code: string;
  expansion: string;
  category: string;
  route: string | null;
  frequency: string | null;
  isActive: boolean;
  isCustom: boolean;
  sortOrder: number;
  usageCount: number;
};

type CategoryCount = { category: string; count: number };

const CATEGORY_LABELS: Record<string, string> = {
  common: "Common (Tablet/Capsule)",
  frequency: "Frequency",
  route: "Route",
  liquid: "Liquid/Oral",
  topical: "Topical",
  ophthalmic: "Ophthalmic (Eye)",
  otic: "Otic (Ear)",
  inhalation: "Inhalation",
  nasal: "Nasal",
  rectal: "Rectal",
  vaginal: "Vaginal",
  injection: "Injection",
  compound: "Compound",
  general: "General",
  custom: "Custom",
};

const ROUTE_OPTIONS = ["PO", "TOP", "INH", "SL", "PR", "IM", "IV", "SC", "OPH", "OT", "NAS", "VAG", "BUCC", "TD"];
const FREQ_OPTIONS = ["QD", "BID", "TID", "QID", "Q4H", "Q6H", "Q8H", "Q12H", "QHS", "QAM", "QPM", "PRN", "QOD", "QWK", "QMON", "STAT"];

export default function SigCodesPage() {
  const [codes, setCodes] = useState<SigCode[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<SigCode | null>(null);
  const [formData, setFormData] = useState({
    code: "", expansion: "", category: "custom", route: "", frequency: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [codesData, catsData] = await Promise.all([
      getSigCodes({ search, category: filterCat, showInactive }),
      getSigCategories(),
    ]);
    setCodes(codesData);
    setCategories(catsData);
    setLoading(false);
  }, [search, filterCat, showInactive]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingCode(null);
    setFormData({ code: "", expansion: "", category: "custom", route: "", frequency: "" });
    setError("");
    setShowModal(true);
  }

  function openEdit(sig: SigCode) {
    setEditingCode(sig);
    setFormData({
      code: sig.code,
      expansion: sig.expansion,
      category: sig.category,
      route: sig.route || "",
      frequency: sig.frequency || "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (!formData.code.trim()) throw new Error("Code is required");
      if (!formData.expansion.trim()) throw new Error("Expansion text is required");

      if (editingCode) {
        await updateSigCode(editingCode.id, formData);
      } else {
        await createSigCode(formData);
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(sig: SigCode) {
    await updateSigCode(sig.id, { isActive: !sig.isActive });
    load();
  }

  async function handleDelete(sig: SigCode) {
    if (!confirm(`Delete sig code "${sig.code}"? This cannot be undone.`)) return;
    await deleteSigCode(sig.id);
    load();
  }

  const totalActive = codes.filter((c) => c.isActive).length;
  const totalCustom = codes.filter((c) => c.isCustom).length;

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-6 py-2.5 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
        <Link href="/dashboard" className="text-[var(--green-700)] no-underline font-medium hover:underline">Home</Link>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <Link href="/prescriptions" className="text-[var(--green-700)] no-underline font-medium hover:underline">Prescriptions</Link>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <span className="text-[var(--text-secondary)] font-semibold">Sig Codes</span>
      </div>

      <div className="px-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sig Codes Library</h1>
            <p className="text-sm text-gray-500 mt-1">
              {codes.length} codes shown &middot; {totalActive} active &middot; {totalCustom} custom
            </p>
          </div>
          <button onClick={openCreate}
            className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors">
            + New Sig Code
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code or expansion text..."
                className={inputClass} />
            </div>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className={`${inputClass} w-auto`}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category}>
                  {CATEGORY_LABELS[c.category] || c.category} ({c.count})
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 text-[#40721D] border-gray-300 rounded focus:ring-[#40721D]" />
              Show Inactive
            </label>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setFilterCat("")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              !filterCat ? "bg-[#40721D] text-white border-[#40721D]" : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}>
            All
          </button>
          {categories.map((c) => (
            <button key={c.category} onClick={() => setFilterCat(c.category)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filterCat === c.category ? "bg-[#40721D] text-white border-[#40721D]" : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}>
              {CATEGORY_LABELS[c.category] || c.category} ({c.count})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading sig codes...</div>
          ) : codes.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-lg mb-2">No sig codes found</p>
              <p className="text-gray-400 text-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Expansion (Directions)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Route</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Freq</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Uses</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((sig) => (
                  <tr key={sig.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!sig.isActive ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-[#40721D] bg-green-50 px-2 py-0.5 rounded text-xs">
                        {sig.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-md">{sig.expansion}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {CATEGORY_LABELS[sig.category] || sig.category}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{sig.route || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{sig.frequency || "—"}</td>
                    <td className="px-4 py-3 text-center text-gray-400 tabular-nums text-xs">{sig.usageCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sig.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {sig.isActive ? "Active" : "Inactive"}
                      </span>
                      {sig.isCustom && (
                        <span className="ml-1 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(sig)}
                          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleToggleActive(sig)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            sig.isActive ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"
                          }`}>
                          {sig.isActive ? "Disable" : "Enable"}
                        </button>
                        {sig.isCustom && (
                          <button onClick={() => handleDelete(sig)}
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCode ? "Edit Sig Code" : "New Sig Code"}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={formData.code}
                    onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. 1TPOBID" className={`${inputClass} font-mono`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                    className={inputClass}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expansion (Full Directions) <span className="text-red-500">*</span>
                </label>
                <textarea value={formData.expansion}
                  onChange={(e) => setFormData((p) => ({ ...p, expansion: e.target.value }))}
                  rows={2} placeholder="e.g. Take 1 tablet by mouth twice daily"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#40721D]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                  <select value={formData.route}
                    onChange={(e) => setFormData((p) => ({ ...p, route: e.target.value }))}
                    className={inputClass}>
                    <option value="">None</option>
                    {ROUTE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select value={formData.frequency}
                    onChange={(e) => setFormData((p) => ({ ...p, frequency: e.target.value }))}
                    className={inputClass}>
                    <option value="">None</option>
                    {FREQ_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50">
                {saving ? "Saving..." : editingCode ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
