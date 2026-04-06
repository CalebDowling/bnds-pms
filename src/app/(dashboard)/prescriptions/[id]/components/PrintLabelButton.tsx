"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";

export default function PrintLabelButton({
  fillId,
  rxNumber,
  fillNumber,
}: {
  fillId: string;
  rxNumber: string;
  fillNumber: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePrintLabel() {
    setLoading(true);
    setError(null);

    try {
      // Fetch the label PDF
      const response = await fetch(`/api/labels/${fillId}`);

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Fill not found"
            : "Failed to generate label"
        );
      }

      // Get the PDF as a blob
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const url = URL.createObjectURL(blob);

      // Open in a new window/tab (browser will trigger print dialog)
      const windowRef = window.open(url, "_blank");

      if (windowRef) {
        // Set up print dialog when the PDF loads
        windowRef.addEventListener("load", () => {
          windowRef.print();
        });
      } else {
        throw new Error("Could not open PDF. Check popup blockers.");
      }

      // Clean up the object URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 5000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handlePrintLabel}
        disabled={loading}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          <>
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
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4H9a2 2 0 00-2 2v2a2 2 0 002 2h6a2 2 0 002-2v-2a2 2 0 00-2-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v8m0 0H9"
              />
            </svg>
            Print Label
          </>
        )}
      </button>
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
