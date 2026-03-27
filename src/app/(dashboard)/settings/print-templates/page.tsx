"use client";

import { useState } from "react";
import { Printer, FileText, Package, FlaskConical, Receipt, ClipboardList, Tag, Search, ChevronDown } from "lucide-react";
import Link from "next/link";

// ─── All templates from DRX ─────────────────────
interface PrintTemplate {
  id: number;
  name: string;
  size: string;
  type: "Rx Label" | "Batch" | "Register Receipt" | "Pull Cash" | "Daily Summary" | "Packing List" | "Package" | "MAR" | "SUB TEMPLATE";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ALL_TEMPLATES: PrintTemplate[] = [
  // New Test Label — compound label from DRX template #95
  { id: 999, name: "New Test Label", size: '4" X 8"', type: "Rx Label", isActive: false, createdAt: "3/25/2026", updatedAt: "3/25/2026" },
  // Rx Labels
  { id: 95, name: "Boudreaux CMPD-CA COPY", size: '4" X 8"', type: "Rx Label", isActive: false, createdAt: "3/12/2026", updatedAt: "3/12/2026" },
  { id: 94, name: "Boudreaux CMPD spacing updates", size: '4" X 8"', type: "Rx Label", isActive: true, createdAt: "3/5/2026", updatedAt: "3/24/2026" },
  { id: 93, name: "Boudreaux CMPD COPY-NY COPY", size: '4" X 8"', type: "Rx Label", isActive: false, createdAt: "2/26/2026", updatedAt: "3/12/2026" },
  { id: 91, name: "New Label Template 1ce9f", size: '4" X 6"', type: "Package", isActive: false, createdAt: "2/2/2026", updatedAt: "2/2/2026" },
  { id: 90, name: "New Label Template 6991a", size: '4" X 6"', type: "Rx Label", isActive: false, createdAt: "12/8/2025", updatedAt: "12/8/2025" },
  { id: 89, name: "New Label Template e9d8d", size: '4" X 6"', type: "Rx Label", isActive: false, createdAt: "12/8/2025", updatedAt: "12/8/2025" },
  { id: 88, name: "New Label Template 638b2", size: '4" X 6"', type: "Rx Label", isActive: false, createdAt: "12/8/2025", updatedAt: "12/8/2025" },
  { id: 86, name: "Boudreaux CMPD-CA", size: '4" X 8"', type: "Rx Label", isActive: false, createdAt: "8/15/2025", updatedAt: "3/12/2026" },
  { id: 32, name: "Boudreaux CMPD COPY-NY", size: '4" X 8"', type: "Rx Label", isActive: false, createdAt: "9/26/2024", updatedAt: "2/26/2026" },
  { id: 31, name: "Boudreaux CMPD-NY", size: '4" X 8"', type: "Rx Label", isActive: false, createdAt: "9/26/2024", updatedAt: "9/26/2024" },
  { id: 30, name: "Boudreaux CMPD V2", size: '4" X 8"', type: "Rx Label", isActive: true, createdAt: "8/27/2024", updatedAt: "3/24/2026" },
  { id: 3, name: "Boudreaux REG", size: '4" X 8"', type: "Rx Label", isActive: false, createdAt: "5/6/2023", updatedAt: "12/11/2023" },
  { id: 2, name: "Boudreaux v2", size: '4" X 8"', type: "Rx Label", isActive: false, createdAt: "4/11/2022", updatedAt: "12/11/2023" },
  { id: 1, name: "Boudreaux CMPD", size: '4" X 8"', type: "Rx Label", isActive: false, createdAt: "4/11/2022", updatedAt: "2/25/2026" },

  // Batch Templates
  { id: 29, name: "COMPOUND BATCH v3", size: '2" X 2.5"', type: "Batch", isActive: true, createdAt: "5/15/2024", updatedAt: "5/15/2024" },
  { id: 27, name: "COMPOUND BATCH v2", size: '6.25" X 2.5"', type: "Batch", isActive: false, createdAt: "5/3/2024", updatedAt: "5/15/2024" },
  { id: 16, name: "Compound BATCH", size: '3.13" X 1"', type: "Batch", isActive: false, createdAt: "11/30/2023", updatedAt: "3/4/2024" },

  // Register Receipt
  { id: 23, name: "POS MAIN 80 MM", size: '3.15" X 18"', type: "Register Receipt", isActive: false, createdAt: "12/5/2023", updatedAt: "12/8/2023" },
  { id: 22, name: "POS MAIN 72 MM", size: '2.83" X 16"', type: "Register Receipt", isActive: true, createdAt: "12/5/2023", updatedAt: "12/8/2023" },
  { id: 13, name: "POS MAIN 80 MM (legacy)", size: '3.15" X 18"', type: "Register Receipt", isActive: false, createdAt: "12/5/2023", updatedAt: "12/8/2023" },
  { id: 12, name: "POS MAIN 72 MM (legacy)", size: '2.83" X 16"', type: "Register Receipt", isActive: false, createdAt: "12/5/2023", updatedAt: "12/19/2023" },

  // Pull Cash
  { id: 15, name: "PULL CASH 80 MM", size: '3.15" X 6"', type: "Pull Cash", isActive: false, createdAt: "12/6/2023", updatedAt: "12/6/2023" },
  { id: 14, name: "PULL CASH 72 MM", size: '2.83" X 6"', type: "Pull Cash", isActive: true, createdAt: "12/6/2023", updatedAt: "12/6/2023" },
  { id: 5, name: "PULL CASH 80 MM (legacy)", size: '3.15" X 6"', type: "Pull Cash", isActive: false, createdAt: "12/6/2023", updatedAt: "12/6/2023" },
  { id: 4, name: "PULL CASH 72 MM (legacy)", size: '2.83" X 6"', type: "Pull Cash", isActive: false, createdAt: "12/6/2023", updatedAt: "12/6/2023" },

  // Daily Summary
  { id: 8, name: "SUMMARY 80 MM", size: '3.15" X 7"', type: "Daily Summary", isActive: false, createdAt: "12/8/2023", updatedAt: "12/8/2023" },
  { id: 7, name: "SUMMARY 72 MM", size: '2.83" X 7"', type: "Daily Summary", isActive: true, createdAt: "12/6/2023", updatedAt: "12/8/2023" },

  // Packing List
  { id: 11, name: "Packing List 8.5x11", size: '8.5" X 11"', type: "Packing List", isActive: true, createdAt: "11/30/2023", updatedAt: "11/30/2023" },
  { id: 20, name: "Packing List Receipt 80 MM", size: '3.15" X 12"', type: "Packing List", isActive: false, createdAt: "12/6/2023", updatedAt: "12/6/2023" },
  { id: 19, name: "Packing List Receipt 72 MM", size: '2.83" X 12"', type: "Packing List", isActive: false, createdAt: "12/6/2023", updatedAt: "12/6/2023" },
  { id: 10, name: "Packing List Receipt 80 MM (legacy)", size: '3.15" X 12"', type: "Packing List", isActive: false, createdAt: "12/6/2023", updatedAt: "12/6/2023" },
  { id: 9, name: "Packing List Receipt 72 MM (legacy)", size: '2.83" X 12"', type: "Packing List", isActive: false, createdAt: "12/6/2023", updatedAt: "12/6/2023" },

  // MAR Templates
  { id: 84, name: "Dispill-Letter", size: '8.5" X 11"', type: "MAR", isActive: false, createdAt: "7/14/2025", updatedAt: "7/14/2025" },
  { id: 76, name: "Worksheet-Example", size: '8.5" X 11"', type: "MAR", isActive: false, createdAt: "7/9/2025", updatedAt: "7/9/2025" },
  { id: 72, name: "Omnicell-Example Condensed-N-ONLY", size: '9.5" X 16"', type: "MAR", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 71, name: "Omnicell-Example Condensed-M-ONLY", size: '9.5" X 16"', type: "MAR", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 70, name: "Omnicell-Example Condensed-M-E", size: '9.5" X 16"', type: "MAR", isActive: false, createdAt: "7/9/2025", updatedAt: "7/10/2025" },
  { id: 69, name: "Omnicell-Example Condensed M-B", size: '9.5" X 16"', type: "MAR", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 68, name: "Omnicell-Example Condensed-E-ONLY", size: '9.5" X 16"', type: "MAR", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 67, name: "Omnicell-Example Condensed-B-ONLY", size: '9.5" X 16"', type: "MAR", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 66, name: "Omnicell-Example", size: '9.5" X 16"', type: "MAR", isActive: false, createdAt: "7/7/2025", updatedAt: "7/7/2025" },
  { id: 40, name: "Mar Example-Physician Order", size: '8.5" X 11"', type: "MAR", isActive: false, createdAt: "6/13/2025", updatedAt: "7/11/2025" },
  { id: 39, name: "Mar Example-Phoenix", size: '8.5" X 11"', type: "MAR", isActive: false, createdAt: "6/30/2025", updatedAt: "7/11/2025" },

  // Sub Templates
  { id: 85, name: "Dispill-Sync-Items", size: '4.1" X 0.35"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/14/2025", updatedAt: "7/14/2025" },
  { id: 83, name: "Dispill-Days", size: '8.5" X 1"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/14/2025", updatedAt: "7/14/2025" },
  { id: 82, name: "Dispill-DayItemsNoon", size: '2" X 0.12"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/14/2025", updatedAt: "7/14/2025" },
  { id: 81, name: "Dispill-DayItemsMorning", size: '2" X 0.12"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/14/2025", updatedAt: "7/14/2025" },
  { id: 80, name: "Dispill-DayItemsEvening", size: '2" X 0.12"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/14/2025", updatedAt: "7/14/2025" },
  { id: 79, name: "Dispill-DayItemsBedtime", size: '2" X 0.12"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/14/2025", updatedAt: "7/14/2025" },
  { id: 78, name: "Worksheet-SyncItems", size: '4.1" X 0.35"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/9/2025", updatedAt: "7/9/2025" },
  { id: 77, name: "Worksheet-MarComments", size: '8" X 1"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/9/2025", updatedAt: "7/9/2025" },
  { id: 75, name: "Sync Items-Physician Order", size: '8" X 1"', type: "SUB TEMPLATE", isActive: false, createdAt: "6/13/2025", updatedAt: "6/30/2025" },
  { id: 74, name: "Sync Items-Phoenix", size: '8" X 1"', type: "SUB TEMPLATE", isActive: false, createdAt: "6/30/2025", updatedAt: "7/11/2025" },
  { id: 73, name: "Omnicell-Sync Items", size: '0.65" X 4"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/5/2025", updatedAt: "7/17/2025" },
  { id: 65, name: "Omnicell-Days-N4", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 64, name: "Omnicell-Days-N3", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 63, name: "Omnicell-Days-N2", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 62, name: "Omnicell-Days-N1", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 61, name: "Omnicell-Days-M4", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 60, name: "Omnicell-Days-M3", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 59, name: "Omnicell-Days-M2", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 58, name: "Omnicell-Days-M1", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 57, name: "Omnicell-Days-E4", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 56, name: "Omnicell-Days-E3", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 55, name: "Omnicell-Days-E2", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 54, name: "Omnicell-Days-E1", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 53, name: "Omnicell-Days CondensedTop-M-B", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 52, name: "Omnicell-Days CondensedTop", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/9/2025", updatedAt: "7/10/2025" },
  { id: 51, name: "Omnicell-Days CondensedBottom-M-B", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 50, name: "Omnicell-Days CondensedBottom", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/9/2025", updatedAt: "7/10/2025" },
  { id: 49, name: "Omnicell-Days-B4", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 48, name: "Omnicell-Days-B3", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 47, name: "Omnicell-Days-B2", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 46, name: "Omnicell-Days-B1", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/10/2025", updatedAt: "7/10/2025" },
  { id: 45, name: "Omnicell-Days", size: '1.4" X 8"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/6/2025", updatedAt: "7/8/2025" },
  { id: 44, name: "Omnicell-DayItemsNoon", size: '0.12" X 2"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/8/2025", updatedAt: "7/8/2025" },
  { id: 43, name: "Omnicell-DayItemsMorning", size: '0.12" X 2"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/8/2025", updatedAt: "7/8/2025" },
  { id: 42, name: "Omnicell-DayItemsEvening", size: '0.12" X 2"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/8/2025", updatedAt: "7/8/2025" },
  { id: 41, name: "Omnicell-DayItemsBedtime", size: '0.12" X 2"', type: "SUB TEMPLATE", isActive: false, createdAt: "7/8/2025", updatedAt: "7/8/2025" },
  { id: 38, name: "Administration Times-Physician Order", size: '1" X 0.18"', type: "SUB TEMPLATE", isActive: false, createdAt: "6/16/2025", updatedAt: "7/1/2025" },
  { id: 37, name: "Administration Times-Phoenix", size: '1" X 0.18"', type: "SUB TEMPLATE", isActive: false, createdAt: "6/30/2025", updatedAt: "7/12/2025" },
];

// ─── Active assignments (from DRX Print Templates config) ───
const ACTIVE_ASSIGNMENTS = {
  primaryRxLabel: 94,
  secondaryRxLabel: 30,
  registerReceipt: 22,
  pullCash: 14,
  dailySummary: 7,
  packingList: 11,
  batchTemplate: 29,
  credentialLabel: null as number | null,
  backtagTemplate: null as number | null,
  itemLabelTemplate: null as number | null,
};

const TYPE_COLORS: Record<string, string> = {
  "Rx Label": "bg-blue-100 text-blue-800",
  "Batch": "bg-green-100 text-green-800",
  "Register Receipt": "bg-orange-100 text-orange-800",
  "Pull Cash": "bg-gray-700 text-white",
  "Daily Summary": "bg-teal-100 text-teal-800",
  "Packing List": "bg-pink-100 text-pink-800",
  "Package": "bg-gray-100 text-gray-700",
  "MAR": "bg-yellow-100 text-yellow-800",
  "SUB TEMPLATE": "bg-cyan-100 text-cyan-800",
};

const TYPE_ICONS: Record<string, typeof Printer> = {
  "Rx Label": Tag,
  "Batch": FlaskConical,
  "Register Receipt": Receipt,
  "Pull Cash": Receipt,
  "Daily Summary": ClipboardList,
  "Packing List": Package,
  "Package": Package,
  "MAR": FileText,
  "SUB TEMPLATE": FileText,
};

const TEMPLATE_TYPES = ["All", "Rx Label", "Batch", "Register Receipt", "Pull Cash", "Daily Summary", "Packing List", "MAR", "SUB TEMPLATE"];

export default function PrintTemplatesPage() {
  const [assignments, setAssignments] = useState(ACTIVE_ASSIGNMENTS);
  const [filterType, setFilterType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filtered = ALL_TEMPLATES.filter((t) => {
    if (filterType !== "All" && t.type !== filterType) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getTemplatesForType = (type: string) => ALL_TEMPLATES.filter((t) => t.type === type);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/print-templates/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignments),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Print template assignments saved" });
    } catch {
      setMessage({ type: "error", text: "Failed to save assignments" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-xs text-gray-400 mb-4">
        <Link href="/settings" className="hover:text-gray-600">Settings</Link>
        <span className="mx-1.5">&gt;</span>
        <span className="text-gray-700">Print Templates</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Print Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Configure label, receipt, and report templates — migrated from DRX</p>
        </div>
        <button onClick={handleSave} disabled={isSaving}
          className="px-5 py-2 bg-[#40721D] text-white rounded-lg text-sm font-medium hover:bg-[#2D5114] disabled:opacity-50">
          {isSaving ? "Saving..." : "Save Assignments"}
        </button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>{message.text}</div>
      )}

      {/* Active Assignments Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Template Assignments</h2>
        <p className="text-xs text-gray-400 mb-4">Select which template to use for each print job type</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Primary Rx Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Rx Label</label>
            <select value={assignments.primaryRxLabel || ""}
              onChange={(e) => setAssignments({ ...assignments, primaryRxLabel: Number(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
              <option value="">— None —</option>
              {getTemplatesForType("Rx Label").map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Secondary Rx Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Secondary Rx Label</label>
            <select value={assignments.secondaryRxLabel || ""}
              onChange={(e) => setAssignments({ ...assignments, secondaryRxLabel: Number(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
              <option value="">— None —</option>
              {getTemplatesForType("Rx Label").map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Register Receipt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Register Receipt</label>
            <select value={assignments.registerReceipt || ""}
              onChange={(e) => setAssignments({ ...assignments, registerReceipt: Number(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
              <option value="">— None —</option>
              {getTemplatesForType("Register Receipt").map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Pull Cash */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pull Cash Template</label>
            <select value={assignments.pullCash || ""}
              onChange={(e) => setAssignments({ ...assignments, pullCash: Number(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
              <option value="">— None —</option>
              {getTemplatesForType("Pull Cash").map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Daily Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Daily Summary</label>
            <select value={assignments.dailySummary || ""}
              onChange={(e) => setAssignments({ ...assignments, dailySummary: Number(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
              <option value="">— None —</option>
              {getTemplatesForType("Daily Summary").map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Packing List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Packing List</label>
            <select value={assignments.packingList || ""}
              onChange={(e) => setAssignments({ ...assignments, packingList: Number(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
              <option value="">— None —</option>
              {getTemplatesForType("Packing List").map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Batch Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch Template</label>
            <select value={assignments.batchTemplate || ""}
              onChange={(e) => setAssignments({ ...assignments, batchTemplate: Number(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
              <option value="">— None —</option>
              {getTemplatesForType("Batch").map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Credential Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Credential Label</label>
            <select value={assignments.credentialLabel || ""}
              onChange={(e) => setAssignments({ ...assignments, credentialLabel: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
              <option value="">— None —</option>
              {getTemplatesForType("Rx Label").map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Backtag */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Backtag Template</label>
            <select value={assignments.backtagTemplate || ""}
              onChange={(e) => setAssignments({ ...assignments, backtagTemplate: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
              <option value="">— None —</option>
              {ALL_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Item Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Label Template</label>
            <select value={assignments.itemLabelTemplate || ""}
              onChange={(e) => setAssignments({ ...assignments, itemLabelTemplate: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
              <option value="">— None —</option>
              {ALL_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Template Library */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Template Library</h2>
          <span className="text-xs text-gray-400">{ALL_TEMPLATES.length} templates from DRX</span>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none" />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {TEMPLATE_TYPES.map((type) => (
              <button key={type} onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filterType === type
                    ? "bg-[#40721D] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {type} {type !== "All" && `(${ALL_TEMPLATES.filter((t) => t.type === type).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-20"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Size</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Modified</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm">No templates match your filters</td></tr>
              ) : (
                filtered.map((t) => {
                  const Icon = TYPE_ICONS[t.type] || FileText;
                  const isAssigned = Object.values(assignments).includes(t.id);
                  return (
                    <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${isAssigned ? "bg-[#40721D]/[0.04]" : ""}`}>
                      <td className="px-4 py-3">
                        <Link href={`/settings/print-templates/${t.id}/preview`}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-[#40721D] bg-[#40721D]/5 rounded hover:bg-[#40721D]/10 transition-colors">
                          Edit
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Icon size={15} className="text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">{t.size}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${TYPE_COLORS[t.type] || "bg-gray-100 text-gray-700"}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{t.updatedAt}</td>
                      <td className="px-4 py-3">
                        {isAssigned ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                        ) : (
                          <span className="text-xs text-gray-400">Available</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
