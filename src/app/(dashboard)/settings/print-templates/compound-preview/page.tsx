"use client";

import { useState } from "react";
import { Printer, Download, Eye, RotateCcw, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function CompoundLabelPreviewPage() {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fillId, setFillId] = useState("");

  const generateSampleLabel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/labels/compound?sample=true");
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
      win.addEventListener("load", () => {
        win.print();
      });
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
            <Link
              href="/settings/print-templates"
              className="text-[var(--green-700)] hover:text-[var(--green-800)] inline-flex items-center gap-1 text-sm no-underline"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Link>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              New Test Label
            </h1>
            <span className="text-xs bg-[var(--green-50)] text-[var(--green-700)] px-2 py-0.5 rounded-full font-medium">
              4&quot; x 8&quot; Compound
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={generateSampleLabel}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--green-700)] text-white rounded-md text-sm font-medium hover:bg-[var(--green-800)] disabled:opacity-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {loading ? "Generating..." : "Preview Sample Label"}
            </button>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter Fill ID..."
                value={fillId}
                onChange={(e) => setFillId(e.target.value)}
                className="px-3 py-2 border border-[var(--border)] rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
              />
              <button
                onClick={generateFromFill}
                disabled={loading || !fillId.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--green-700)] text-[var(--green-700)] rounded-md text-sm font-medium hover:bg-[var(--green-50)] disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Generate from Fill
              </button>
            </div>

            {pdfUrl && (
              <>
                <div className="h-6 w-px bg-[var(--border)]" />
                <button
                  onClick={downloadPdf}
                  className="inline-flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md text-sm hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={printPdf}
                  className="inline-flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md text-sm hover:bg-gray-50 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Label Info */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4 mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Label Template Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-[var(--text-muted)] block">Template Source</span>
              <span className="text-[var(--text-primary)] font-medium">DRX Template #95</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block">Page Size</span>
              <span className="text-[var(--text-primary)] font-medium">4&quot; x 8&quot;</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block">Label Groups</span>
              <span className="text-[var(--text-primary)] font-medium">7 groups, 84 elements</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block">Orientation</span>
              <span className="text-[var(--text-primary)] font-medium">Portrait, -90&deg; text rotation</span>
            </div>
          </div>
        </div>

        {/* PDF Preview */}
        {pdfUrl ? (
          <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">PDF Preview</span>
              <span className="text-xs text-[var(--text-muted)]">4&quot; x 8&quot; (288pt x 576pt)</span>
            </div>
            <div className="flex justify-center p-6 bg-gray-100">
              <iframe
                src={pdfUrl}
                className="bg-white shadow-lg"
                style={{ width: "400px", height: "800px", border: "none" }}
                title="Compound Label Preview"
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[var(--border)] p-12 text-center">
            <Printer className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
            <p className="text-[var(--text-muted)] text-sm">
              Click &quot;Preview Sample Label&quot; to generate a compound label preview,<br />
              or enter a Fill ID to generate from real prescription data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
