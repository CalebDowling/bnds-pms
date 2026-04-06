import { useState, useCallback } from "react";
import { downloadCSV, downloadExcel } from "@/lib/export";

interface UseExportOptions {
  endpoint: string;
  filename: string;
  sheetName?: string;
  params?: Record<string, string>;
}

interface UseExportState {
  isLoading: boolean;
  error: string | null;
}

export function useExport() {
  const [state, setState] = useState<UseExportState>({
    isLoading: false,
    error: null,
  });

  const exportToCSV = useCallback(
    async ({ endpoint, filename, params = {} }: UseExportOptions) => {
      setState({ isLoading: true, error: null });
      try {
        // Build query string
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        // Fetch data
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const data = await response.json();

        // Download as CSV
        downloadCSV(data, filename);
        setState({ isLoading: false, error: null });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        setState({ isLoading: false, error: message });
        throw error;
      }
    },
    []
  );

  const exportToExcel = useCallback(
    async ({
      endpoint,
      filename,
      sheetName = "Sheet1",
      params = {},
    }: UseExportOptions) => {
      setState({ isLoading: true, error: null });
      try {
        // Build query string
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        // Fetch data
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const data = await response.json();

        // Download as Excel
        await downloadExcel(data, filename, sheetName);
        setState({ isLoading: false, error: null });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        setState({ isLoading: false, error: message });
        throw error;
      }
    },
    []
  );

  return {
    isLoading: state.isLoading,
    error: state.error,
    exportToCSV,
    exportToExcel,
  };
}
