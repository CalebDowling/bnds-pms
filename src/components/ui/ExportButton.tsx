"use client";

import { useState, useRef } from "react";
import { useExport } from "@/hooks/useExport";

interface ExportButtonProps {
  /** API endpoint to fetch data from (e.g., /api/export/patients) */
  endpoint: string;
  /** Filename for the exported file (without extension) */
  filename: string;
  /** Sheet name for Excel exports */
  sheetName?: string;
  /** Additional query parameters to pass to the API */
  params?: Record<string, string>;
  /** For backward compatibility: inline data if no endpoint provided */
  data?: Record<string, any>[];
}

export default function ExportButton({
  endpoint,
  filename,
  sheetName = "Sheet1",
  params = {},
  data = [],
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isLoading, error, exportToCSV, exportToExcel } = useExport();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleExportCSV = async () => {
    try {
      await exportToCSV({ endpoint, filename, params });
      setIsOpen(false);
    } catch (error) {
      console.error("CSV export failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to export CSV. Please try again."
      );
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportToExcel({ endpoint, filename, sheetName, params });
      setIsOpen(false);
    } catch (error) {
      console.error("Excel export failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to export to Excel. Please try again."
      );
    }
  };

  // Close menu when clicking outside
  const handleClickOutside = (e: React.MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  const isDisabled = isLoading || (data.length === 0 && !endpoint);

  return (
    <div className="relative" ref={menuRef} onClick={handleClickOutside}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          isDisabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-[#40721D] text-white hover:bg-[#2D5114] active:scale-95"
        }`}
        title={
          isDisabled
            ? isLoading
              ? "Exporting..."
              : "No data to export"
            : "Export data"
        }
      >
        {/* Download icon */}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19v-7m0 0V5m0 7H5m7 0h7"
          />
        </svg>
        {isLoading ? "Exporting..." : "Export"}
        {/* Dropdown indicator */}
        <svg
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-10 overflow-hidden">
          <button
            onClick={handleExportCSV}
            disabled={isLoading}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 text-gray-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">Export CSV</p>
              <p className="text-xs text-gray-500">Comma-separated values</p>
            </div>
          </button>

          <div className="border-t border-gray-100" />

          <button
            onClick={handleExportExcel}
            disabled={isLoading}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 text-green-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">Export Excel</p>
              <p className="text-xs text-gray-500">Excel spreadsheet</p>
            </div>
          </button>

          {error && (
            <>
              <div className="border-t border-gray-100" />
              <div className="px-4 py-2 text-xs text-red-600 bg-red-50">
                {error}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
