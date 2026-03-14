"use client";

import { useState, useRef } from "react";
import { downloadCSV, downloadExcel } from "@/lib/export";

interface ReportsExportButtonProps {
  tab: "fills" | "inventory" | "batches";
  date?: string;
  startDate?: string;
  endDate?: string;
}

export default function ReportsExportButton({
  tab,
  date,
  startDate,
  endDate,
}: ReportsExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);

      // Fetch data based on tab
      let endpoint = "";
      let filename = `report_${tab}_${new Date().toISOString().split("T")[0]}`;

      if (tab === "fills" && date) {
        endpoint = `/api/export/reports/fills?date=${date}`;
      } else if (tab === "inventory") {
        endpoint = "/api/export/reports/inventory";
      } else if (tab === "batches" && startDate && endDate) {
        endpoint = `/api/export/reports/batches?startDate=${startDate}&endDate=${endDate}`;
      }

      if (!endpoint) {
        alert("Please select date range for export");
        return;
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();
      downloadCSV(data, filename);
      setIsOpen(false);
    } catch (error) {
      console.error("CSV export failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to export CSV. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);

      // Fetch data based on tab
      let endpoint = "";
      let filename = `report_${tab}_${new Date().toISOString().split("T")[0]}`;
      let sheetName = tab.charAt(0).toUpperCase() + tab.slice(1);

      if (tab === "fills" && date) {
        endpoint = `/api/export/reports/fills?date=${date}`;
      } else if (tab === "inventory") {
        endpoint = "/api/export/reports/inventory";
      } else if (tab === "batches" && startDate && endDate) {
        endpoint = `/api/export/reports/batches?startDate=${startDate}&endDate=${endDate}`;
      }

      if (!endpoint) {
        alert("Please select date range for export");
        return;
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();
      await downloadExcel(data, filename, sheetName);
      setIsOpen(false);
    } catch (error) {
      console.error("Excel export failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to export to Excel. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef} onClick={handleClickOutside}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          isExporting
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-[#40721D] text-white hover:bg-[#2D5114] active:scale-95"
        }`}
        title="Export report data"
      >
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
        {isExporting ? "Exporting..." : "Export"}
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

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-10 overflow-hidden">
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
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
            disabled={isExporting}
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
        </div>
      )}
    </div>
  );
}
