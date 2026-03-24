"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export interface VirtualColumn<T> {
  key: string;
  header: string;
  width?: string;
  render: (item: T) => React.ReactNode;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: VirtualColumn<T>[];
  rowHeight?: number;
  maxHeight?: number;
  getRowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export default function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 44,
  maxHeight = 600,
  getRowKey,
  onRowClick,
  className = "",
}: VirtualizedTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(maxHeight);

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(Math.min(data.length * rowHeight, maxHeight));
    }
  }, [data.length, rowHeight, maxHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (data.length === 0) return null;

  // For small datasets, render normally
  if (data.length <= 50) {
    return (
      <div className={className}>
        <div className="flex items-center bg-gray-50 border-b border-gray-200">
          {columns.map((col) => (
            <div
              key={col.key}
              className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
              style={{ width: col.width || "auto", flex: col.width ? "none" : "1" }}
            >
              {col.header}
            </div>
          ))}
        </div>
        {data.map((item) => (
          <div
            key={getRowKey(item)}
            className={`flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors ${
              onRowClick ? "cursor-pointer" : ""
            }`}
            style={{ height: rowHeight }}
            onClick={() => onRowClick?.(item)}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className="px-4 text-sm"
                style={{ width: col.width || "auto", flex: col.width ? "none" : "1" }}
              >
                {col.render(item)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Virtual scrolling for large datasets
  const totalHeight = data.length * rowHeight;
  const overscan = 5;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    data.length,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );
  const visibleItems = data.slice(startIndex, endIndex);
  const offsetY = startIndex * rowHeight;

  return (
    <div className={className}>
      {/* Sticky Header */}
      <div className="flex items-center bg-gray-50 border-b border-gray-200">
        {columns.map((col) => (
          <div
            key={col.key}
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
            style={{ width: col.width || "auto", flex: col.width ? "none" : "1" }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Scrollable body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ height: containerHeight, overflow: "auto" }}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ position: "absolute", top: offsetY, left: 0, right: 0 }}>
            {visibleItems.map((item) => (
              <div
                key={getRowKey(item)}
                className={`flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                style={{ height: rowHeight }}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className="px-4 text-sm"
                    style={{ width: col.width || "auto", flex: col.width ? "none" : "1" }}
                  >
                    {col.render(item)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
