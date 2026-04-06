"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReorderStatus } from "@/lib/inventory/reorder-check";

interface ReorderItem {
  itemId: string;
  itemName: string;
  ndc?: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  severity: "critical" | "low";
}

interface ReorderStatus {
  criticalCount: number;
  lowCount: number;
  totalCount: number;
  critical: ReorderItem[];
  low: ReorderItem[];
}

export default function ReorderAlerts() {
  const [status, setStatus] = useState<ReorderStatus>({
    criticalCount: 0,
    lowCount: 0,
    totalCount: 0,
    critical: [],
    low: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReorderStatus = async () => {
      try {
        const result = await getReorderStatus();
        setStatus(result);
      } catch (error) {
        console.error("Failed to load reorder status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReorderStatus();
    // Refresh every 5 minutes
    const interval = setInterval(loadReorderStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-[#e1e8e4] p-4">
        <div className="h-20 animate-pulse bg-gray-200 rounded" />
      </div>
    );
  }

  if (status.totalCount === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#e1e8e4] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Reorder Status</h3>
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-700 font-bold text-sm">✓</span>
          </div>
        </div>
        <p className="text-sm text-gray-600">All items are adequately stocked</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#e1e8e4] overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-[#e1e8e4]">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Reorder Alerts</h3>
          <Link
            href="/inventory"
            className="text-xs font-medium text-[#40721D] hover:underline"
          >
            View Inventory
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-[#e1e8e4]">
        {/* Critical Items */}
        {status.criticalCount > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
                <span className="text-red-700 font-bold text-xs">!</span>
              </div>
              <span className="text-sm font-semibold text-red-700">
                {status.criticalCount} Out of Stock
              </span>
            </div>
            <div className="space-y-2 mb-3">
              {status.critical.slice(0, 3).map((item) => (
                <Link
                  key={item.itemId}
                  href={`/inventory/${item.itemId}`}
                  className="block p-2 rounded hover:bg-red-50 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-red-700 truncate">
                        {item.itemName}
                      </p>
                      {item.ndc && (
                        <p className="text-xs text-gray-500">NDC: {item.ndc}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-red-600 ml-2 flex-shrink-0">
                      0 units
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            {status.criticalCount > 3 && (
              <p className="text-xs text-gray-500">
                +{status.criticalCount - 3} more items
              </p>
            )}
          </div>
        )}

        {/* Low Stock Items */}
        {status.lowCount > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100">
                <span className="text-amber-700 font-bold text-xs">⚠</span>
              </div>
              <span className="text-sm font-semibold text-amber-700">
                {status.lowCount} Low Stock
              </span>
            </div>
            <div className="space-y-2 mb-3">
              {status.low.slice(0, 3).map((item) => (
                <Link
                  key={item.itemId}
                  href={`/inventory/${item.itemId}`}
                  className="block p-2 rounded hover:bg-amber-50 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-amber-700 truncate">
                        {item.itemName}
                      </p>
                      {item.ndc && (
                        <p className="text-xs text-gray-500">NDC: {item.ndc}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-amber-600 ml-2 flex-shrink-0 whitespace-nowrap">
                      {item.currentStock}/{item.reorderPoint}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            {status.lowCount > 3 && (
              <p className="text-xs text-gray-500">
                +{status.lowCount - 3} more items
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-4 py-3 bg-gray-50 flex gap-2">
          <Link
            href="/inventory"
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors text-center"
          >
            Review Items
          </Link>
          <button
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-[#40721D] rounded hover:bg-[#365318] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
            title="Purchase order creation coming soon"
          >
            Generate PO
          </button>
        </div>
      </div>
    </div>
  );
}
