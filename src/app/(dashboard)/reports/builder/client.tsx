"use client";

import { useState } from "react";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

type DataSource = "Patients" | "Prescriptions" | "Fills" | "Inventory" | "Claims" | "Sales";

const DATA_SOURCES: DataSource[] = ["Patients", "Prescriptions", "Fills", "Inventory", "Claims", "Sales"];

type Filter = {
  field: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "startsWith";
  value: string;
};

interface ReportConfig {
  dataSource: DataSource;
  columns: string[];
  filters: Filter[];
  sortField?: string;
  sortDirection?: "asc" | "desc";
}

export function ReportBuilderPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [dataSource, setDataSource] = useState<DataSource | "">("");
  const [availableFields, setAvailableFields] = useState<Array<{ name: string; type: string }>>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [reportName, setReportName] = useState("");

  const handleDataSourceSelect = async (source: DataSource) => {
    setDataSource(source);
    try {
      const res = await fetch("/api/reports/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSource: source }),
      });
      if (!res.ok) throw new Error("Failed");
      const fields = await res.json();
      setAvailableFields(fields);
    } catch (error) {
      console.error("Failed to load fields:", error);
    }
    setSelectedColumns([]);
    setFilters([]);
    setSortField("");
    setStep(2);
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
    );
  };

  const handleAddFilter = () => {
    setFilters([...filters, { field: "", operator: "=", value: "" }]);
  };

  const handleFilterChange = (index: number, field: keyof Filter, value: string) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleGeneratePreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/reports/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataSource: dataSource as DataSource,
          columns: selectedColumns,
          filters,
          sort: sortField ? { field: sortField, direction: sortDirection } : undefined,
          limit: 25,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const results = await res.json();
      setPreviewData(results);
      setStep(5);
    } catch (error) {
      console.error("Failed to generate preview:", error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      alert("Please enter a report name");
      return;
    }

    const config: ReportConfig = {
      dataSource: dataSource as DataSource,
      columns: selectedColumns,
      filters,
      sortField,
      sortDirection,
    };

    try {
      const res = await fetch("/api/reports/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: reportName, config }),
      });
      if (!res.ok) throw new Error("Failed");

      setShowSaveDialog(false);
      setReportName("");
      alert("Report saved successfully!");
      loadSavedReports();
    } catch (error) {
      console.error("Failed to save report:", error);
      alert("Failed to save report");
    }
  };

  const loadSavedReports = async () => {
    try {
      const res = await fetch("/api/reports/list");
      if (!res.ok) throw new Error("Failed");
      const reports = await res.json();
      setSavedReports(reports);
    } catch (error) {
      console.error("Failed to load saved reports:", error);
    }
  };

  const handleLoadSavedReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      if (!res.ok) throw new Error("Failed");
      const config = await res.json();

      setDataSource(config.dataSource);
      setSelectedColumns(config.columns);
      setFilters(config.filters || []);
      setSortField(config.sortField || "");
      setSortDirection(config.sortDirection || "asc");

      const fieldsRes = await fetch("/api/reports/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSource: config.dataSource }),
      });
      if (!fieldsRes.ok) throw new Error("Failed");
      const fields = await fieldsRes.json();
      setAvailableFields(fields);
      setStep(2);
    } catch (error) {
      console.error("Failed to load report:", error);
    }
  };

  return (
    <PermissionGuard resource="reports" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Custom Report Builder</h1>
            <p className="text-sm text-gray-500 mt-1">Build queries without SQL</p>
          </div>
          <button
            onClick={loadSavedReports}
            className="px-4 py-2 bg-[#40721D] text-white rounded-lg hover:bg-[#2D5114] text-sm font-medium"
          >
            View Saved Reports
          </button>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Select Data Source</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {DATA_SOURCES.map((source) => (
                  <button
                    key={source}
                    onClick={() => handleDataSourceSelect(source)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#40721D] hover:bg-green-50 transition-colors text-sm font-medium text-gray-900"
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && dataSource && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Select Columns</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {availableFields.map((field) => (
                  <label
                    key={field.name}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(field.name)}
                      onChange={() => handleColumnToggle(field.name)}
                      className="rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {field.name}
                      <span className="text-xs text-gray-400 ml-1">({field.type})</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedColumns.length === 0}
                  className="px-4 py-2 bg-[#40721D] text-white rounded-lg hover:bg-[#2D5114] disabled:opacity-50 text-sm font-medium"
                >
                  Next: Add Filters
                </button>
              </div>
            </div>
          )}

          {step === 3 && dataSource && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Add Filters (Optional)</h2>
              <div className="space-y-3 mb-6">
                {filters.map((filter, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={filter.field}
                      onChange={(e) => handleFilterChange(idx, "field", e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select field...</option>
                      {availableFields.map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filter.operator}
                      onChange={(e) => handleFilterChange(idx, "operator", e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="=">=</option>
                      <option value="!=">!=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                      <option value="contains">contains</option>
                      <option value="startsWith">startsWith</option>
                    </select>

                    <input
                      type="text"
                      value={filter.value}
                      onChange={(e) => handleFilterChange(idx, "value", e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />

                    <button
                      onClick={() => handleRemoveFilter(idx)}
                      className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddFilter}
                className="mb-6 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                + Add Filter
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-4 py-2 bg-[#40721D] text-white rounded-lg hover:bg-[#2D5114] text-sm font-medium"
                >
                  Next: Sort
                </button>
              </div>
            </div>
          )}

          {step === 4 && dataSource && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 4: Sort (Optional)</h2>
              <div className="flex gap-3 mb-6">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">No sorting</option>
                  {selectedColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>

                <select
                  value={sortDirection}
                  onChange={(e) => setSortDirection(e.target.value as "asc" | "desc")}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleGeneratePreview}
                  disabled={loadingPreview}
                  className="px-4 py-2 bg-[#40721D] text-white rounded-lg hover:bg-[#2D5114] disabled:opacity-50 text-sm font-medium"
                >
                  {loadingPreview ? "Generating..." : "Next: Preview"}
                </button>
              </div>
            </div>
          )}

          {step === 5 && previewData !== null && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 5: Preview & Export</h2>

              <div className="mb-6 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {selectedColumns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-left"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 25).map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        {selectedColumns.map((col) => (
                          <td key={col} className="px-4 py-2 text-sm text-gray-700">
                            {String(row[col] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-500 mb-6">
                Showing {Math.min(previewData.length, 25)} of {previewData.length} results
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(4)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    const csv = [
                      selectedColumns.join(","),
                      ...previewData.map((row) =>
                        selectedColumns.map((col) => `"${row[col] ?? ""}"`).join(",")
                      ),
                    ].join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `report-${Date.now()}.csv`;
                    a.click();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="px-4 py-2 bg-[#40721D] text-white rounded-lg hover:bg-[#2D5114] text-sm font-medium"
                >
                  Save Report
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Report</h3>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Report name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 text-sm"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReport}
                  className="flex-1 px-4 py-2 bg-[#40721D] text-white rounded-lg hover:bg-[#2D5114] text-sm font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
