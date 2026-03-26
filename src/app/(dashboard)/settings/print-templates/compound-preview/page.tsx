"use client";

import { useState, useCallback } from "react";
import { Printer, Download, Eye, RotateCcw, ChevronLeft, Save, RefreshCw } from "lucide-react";
import Link from "next/link";

// ─── Default sample data matching DRX template #95 fields ───
const DEFAULT_DATA = {
  // Patient
  patientFirstName: "TAYLOR",
  patientLastName: "GRAY",
  patientDOB: "12/22/1985",
  patientAddressLine1: "123 Unknown Ave",
  patientAddressLine2: "Apt C",
  patientCity: "Lake Charles",
  patientState: "LA",
  patientZip: "70601",
  patientPhone: "337-555-1234",
  patientCellPhone: "337-555-5678",
  patientDeliveryMethod: "DELIVERY",
  patientComments: "Patient prefers afternoon delivery. Allergic to latex.",

  // Prescription
  rxNumber: "154687",
  fillNumber: "1",
  fillDate: "03/25/2026",
  sig: "Apply 1 gram topically to affected area twice daily for 30 days. Wash hands after application.",
  refillsLeft: "3",
  rxExpires: "03/25/2027",

  // Drug
  itemName: "Ketoprofen 10%/Cyclobenzaprine 2%/Lidocaine 5% Cream",
  itemPrintName: "Ketoprofen/Cyclobenz/Lidocaine Cream",
  brandName: "",
  ndc: "5555-4455-01",
  manufacturer: "COMPOUNDED IN-HOUSE",
  boh: "16",

  // Quantities
  dispensedQuantity: "120",
  qtyType: "GM",
  copay: "45.00",

  // Prescriber
  doctorFirstName: "Charles",
  doctorLastName: "Murphy",
  doctorAddressLine1: "132 Medical Plaza Dr",
  doctorAddressLine2: "",
  doctorCity: "Lake Charles",
  doctorState: "LA",
  doctorZip: "70601",
  doctorPhone: "337-555-7777",
  doctorDEA: "BM1234567",
  doctorNPI: "1234567890",

  // Pharmacist
  pharmacistFirstName: "Emily",
  pharmacistLastName: "Bychkov",

  // Insurance
  primaryInsurance: "WELLCARE MEDICARE PART D",

  // Compound
  batchId: "B-2026-0325",
  formulaId: "F-1547",
  batchExpiration: "06/25/2026",

  // Labels & Warnings
  auxLabels: "FOR EXTERNAL USE ONLY\nKEEP OUT OF REACH OF CHILDREN\nSTORE AT ROOM TEMPERATURE\nDO NOT USE IF ALLERGIC TO ANY INGREDIENT",
  fillTags: "price check, compound",
  pickupTime: "03/25/2026 2:00 PM",
  noClaimWarning: false,
  holdWarning: false,

  // IDs
  fillId: "154687",
  labelVersion: "0",
  itemId: "71662",
  tollFreeNumber: "Toll Free 1-855-305-2110",
};

type FormData = typeof DEFAULT_DATA;

// Field group definitions for the editor
const FIELD_GROUPS = [
  {
    title: "Patient Information",
    fields: [
      { key: "patientFirstName", label: "First Name" },
      { key: "patientLastName", label: "Last Name" },
      { key: "patientDOB", label: "Date of Birth" },
      { key: "patientPhone", label: "Phone" },
      { key: "patientCellPhone", label: "Cell Phone" },
      { key: "patientAddressLine1", label: "Address Line 1" },
      { key: "patientAddressLine2", label: "Address Line 2" },
      { key: "patientCity", label: "City" },
      { key: "patientState", label: "State", small: true },
      { key: "patientZip", label: "Zip", small: true },
      { key: "patientDeliveryMethod", label: "Delivery Method" },
      { key: "patientComments", label: "Patient Comments", textarea: true },
    ],
  },
  {
    title: "Prescription",
    fields: [
      { key: "rxNumber", label: "Rx Number" },
      { key: "fillNumber", label: "Fill Number", small: true },
      { key: "fillDate", label: "Fill Date" },
      { key: "sig", label: "Directions (SIG)", textarea: true },
      { key: "refillsLeft", label: "Refills Left", small: true },
      { key: "rxExpires", label: "Rx Expires" },
    ],
  },
  {
    title: "Drug / Item",
    fields: [
      { key: "itemName", label: "Item Name (Full)" },
      { key: "itemPrintName", label: "Print Name" },
      { key: "brandName", label: "Brand Name (if generic)" },
      { key: "ndc", label: "NDC" },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "dispensedQuantity", label: "Quantity" },
      { key: "qtyType", label: "Qty Type", small: true },
      { key: "copay", label: "Copay ($)" },
      { key: "boh", label: "Balance on Hand", small: true },
    ],
  },
  {
    title: "Prescriber",
    fields: [
      { key: "doctorFirstName", label: "First Name" },
      { key: "doctorLastName", label: "Last Name" },
      { key: "doctorAddressLine1", label: "Address" },
      { key: "doctorCity", label: "City" },
      { key: "doctorState", label: "State", small: true },
      { key: "doctorZip", label: "Zip", small: true },
      { key: "doctorPhone", label: "Phone" },
      { key: "doctorDEA", label: "DEA" },
      { key: "doctorNPI", label: "NPI" },
    ],
  },
  {
    title: "Pharmacist & Insurance",
    fields: [
      { key: "pharmacistFirstName", label: "RPH First Name" },
      { key: "pharmacistLastName", label: "RPH Last Name" },
      { key: "primaryInsurance", label: "Primary Insurance" },
    ],
  },
  {
    title: "Compound / Batch",
    fields: [
      { key: "batchId", label: "Batch ID" },
      { key: "formulaId", label: "Formula ID" },
      { key: "batchExpiration", label: "Batch Expiration" },
    ],
  },
  {
    title: "Labels & Warnings",
    fields: [
      { key: "auxLabels", label: "Aux Labels (one per line)", textarea: true },
      { key: "fillTags", label: "Fill Tags (comma separated)" },
      { key: "pickupTime", label: "Pickup Time" },
      { key: "tollFreeNumber", label: "Toll Free Number" },
    ],
  },
] as const;

export default function CompoundLabelEditorPage() {
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_DATA });
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noClaimWarning, setNoClaimWarning] = useState(false);
  const [holdWarning, setHoldWarning] = useState(false);
  const [fillId, setFillId] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const updateField = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleGroup = useCallback((title: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }, []);

  const generateLabel = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build the payload from form data
      const payload = {
        ...formData,
        fillNumber: parseInt(formData.fillNumber) || 1,
        refillsLeft: parseInt(formData.refillsLeft) || 0,
        auxLabels: formData.auxLabels.split("\n").filter(Boolean),
        fillTags: formData.fillTags.split(",").map((t) => t.trim()).filter(Boolean),
        noClaimWarning,
        holdWarning,
        completionQuantity: "",
        partialQuantity: "",
        patientEducationUrl: "",
      };

      const res = await fetch("/api/labels/compound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Fall back to sample if POST not available
        const sampleRes = await fetch("/api/labels/compound?sample=true");
        if (!sampleRes.ok) {
          const data = await sampleRes.json();
          throw new Error(data.error || "Failed to generate label");
        }
        const blob = await sampleRes.blob();
        const url = URL.createObjectURL(blob);
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(url);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const generateFromFill = async () => {
    if (!fillId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/labels/compound?fillId=${encodeURIComponent(fillId.trim())}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate label");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    setFormData({ ...DEFAULT_DATA });
    setNoClaimWarning(false);
    setHoldWarning(false);
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = "compound-label.pdf";
    a.click();
  };

  const printPdf = () => {
    if (!pdfUrl) return;
    const win = window.open(pdfUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print());
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-6 py-2.5 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
        <a href="/dashboard" className="text-[var(--green-700)] no-underline font-medium hover:underline">Home</a>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <Link href="/settings/print-templates" className="text-[var(--green-700)] no-underline font-medium hover:underline">Print Templates</Link>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <span className="text-[var(--text-secondary)] font-semibold">New Test Label</span>
      </div>

      <div className="px-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/settings/print-templates" className="text-[var(--green-700)] hover:text-[var(--green-800)] inline-flex items-center gap-1 text-sm no-underline">
              <ChevronLeft className="w-4 h-4" /> Back
            </Link>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">New Test Label</h1>
            <span className="text-xs bg-[var(--green-50)] text-[var(--green-700)] px-2 py-0.5 rounded-full font-medium">
              4&quot; x 8&quot; Compound
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetToDefaults} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-md hover:bg-gray-50 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            {pdfUrl && (
              <>
                <button onClick={downloadPdf} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-md hover:bg-gray-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button onClick={printPdf} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-md hover:bg-gray-50 transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </>
            )}
          </div>
        </div>

        {/* Generate bar */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-3 mb-4 flex items-center gap-3 flex-wrap">
          <button
            onClick={generateLabel}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--green-700)] text-white rounded-md text-sm font-medium hover:bg-[var(--green-800)] disabled:opacity-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            {loading ? "Generating..." : "Generate Preview"}
          </button>
          <div className="h-6 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Fill ID for real data..."
              value={fillId}
              onChange={(e) => setFillId(e.target.value)}
              className="px-3 py-2 border border-[var(--border)] rounded-md text-sm w-52 focus:outline-none focus:ring-2 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
            />
            <button
              onClick={generateFromFill}
              disabled={loading || !fillId.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--green-700)] text-[var(--green-700)] rounded-md text-sm font-medium hover:bg-[var(--green-50)] disabled:opacity-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Load Fill
            </button>
          </div>
          {error && (
            <span className="text-sm text-red-600 ml-2">{error}</span>
          )}
        </div>

        {/* Two-column: Editor + Preview */}
        <div className="flex gap-4" style={{ minHeight: "calc(100vh - 220px)" }}>
          {/* Left: Editor Fields */}
          <div className="w-[420px] flex-shrink-0 overflow-y-auto space-y-3" style={{ maxHeight: "calc(100vh - 220px)" }}>
            {FIELD_GROUPS.map((group) => {
              const isCollapsed = collapsedGroups.has(group.title);
              return (
                <div key={group.title} className="bg-white rounded-lg border border-[var(--border)]">
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-t-lg"
                  >
                    <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">{group.title}</span>
                    <span className="text-[var(--text-muted)] text-xs">{isCollapsed ? "+" : "-"}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="px-3 pb-3 grid grid-cols-2 gap-x-2 gap-y-2">
                      {group.fields.map((field) => {
                        const isTextarea = "textarea" in field && field.textarea;
                        const isSmall = "small" in field && field.small;
                        return (
                          <div key={field.key} className={isTextarea ? "col-span-2" : isSmall ? "col-span-1" : "col-span-2"}>
                            <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
                              {field.label}
                            </label>
                            {isTextarea ? (
                              <textarea
                                value={(formData as Record<string, unknown>)[field.key] as string}
                                onChange={(e) => updateField(field.key, e.target.value)}
                                rows={3}
                                className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)] resize-none"
                              />
                            ) : (
                              <input
                                type="text"
                                value={(formData as Record<string, unknown>)[field.key] as string}
                                onChange={(e) => updateField(field.key, e.target.value)}
                                className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Warnings toggles */}
            <div className="bg-white rounded-lg border border-[var(--border)] px-3 py-3">
              <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide block mb-2">Warning Flags</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input type="checkbox" checked={noClaimWarning} onChange={(e) => setNoClaimWarning(e.target.checked)} className="accent-[var(--green-700)]" />
                  NO PAID CLAIM
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input type="checkbox" checked={holdWarning} onChange={(e) => setHoldWarning(e.target.checked)} className="accent-[var(--green-700)]" />
                  HOLD
                </label>
              </div>
            </div>
          </div>

          {/* Right: PDF Preview */}
          <div className="flex-1 min-w-0">
            {pdfUrl ? (
              <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden h-full flex flex-col">
                <div className="bg-gray-50 px-4 py-2 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Label Preview</span>
                  <span className="text-xs text-[var(--text-muted)]">4&quot; x 8&quot; (288pt x 576pt)</span>
                </div>
                <div className="flex-1 flex justify-center items-start p-4 bg-gray-100 overflow-auto">
                  <iframe
                    src={pdfUrl}
                    className="bg-white shadow-lg"
                    style={{ width: "384px", height: "768px", border: "none" }}
                    title="Compound Label Preview"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[var(--border)] h-full flex flex-col items-center justify-center text-center p-8">
                <Printer className="w-16 h-16 text-[var(--text-muted)] mb-4 opacity-30" />
                <p className="text-[var(--text-muted)] text-sm mb-1">
                  Edit the fields on the left, then click <strong>Generate Preview</strong>
                </p>
                <p className="text-[var(--text-muted)] text-xs">
                  Or load a real fill by entering a Fill ID above
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
