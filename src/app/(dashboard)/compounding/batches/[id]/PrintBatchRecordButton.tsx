"use client";

import { useState } from "react";

export default function PrintBatchRecordButton({ batchId }: { batchId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePrint = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/compounding/batch-record/${batchId}`);

      if (!response.ok) {
        throw new Error("Failed to generate batch record");
      }

      // Create a blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `batch-record-${batchId}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error downloading batch record:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handlePrint}
        disabled={isLoading}
        className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#305817] disabled:opacity-50 transition-colors"
      >
        {isLoading ? "Generating..." : "📄 Print Batch Record"}
      </button>
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </>
  );
}
