"use client";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-4 space-y-3 ${className}`}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-32 animate-pulse" />
        </div>
        <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* Main content skeleton */}
      <div className="space-y-2 py-2">
        <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
        <div className="h-3 bg-gray-100 rounded w-20 animate-pulse" />
      </div>

      {/* Footer skeleton */}
      <div className="pt-2 border-t border-gray-100">
        <div className="h-3 bg-gray-100 rounded w-24 animate-pulse" />
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 6,
  className = "",
}: SkeletonTableProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 flex gap-4 bg-gray-50">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className="flex-1">
            <div
              className="h-4 bg-gray-200 rounded animate-pulse"
              style={{ width: `${60 + Math.random() * 40}%` }}
            />
          </div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="border-b border-gray-100 px-4 py-3 flex gap-4 hover:bg-gray-50"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div key={`cell-${rowIdx}-${colIdx}`} className="flex-1">
              <div
                className="h-4 bg-gray-200 rounded animate-pulse"
                style={{ width: `${70 + Math.random() * 30}%` }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  width?: string;
  className?: string;
}

export function SkeletonText({
  lines = 1,
  width = "100%",
  className = "",
}: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={`line-${i}`}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{
            width: i === lines - 1 ? width : "100%",
          }}
        />
      ))}
    </div>
  );
}

interface SkeletonStatProps {
  showLabel?: boolean;
  className?: string;
}

export function SkeletonStat({
  showLabel = true,
  className = "",
}: SkeletonStatProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {showLabel && <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />}
      <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
      <div className="h-3 bg-gray-100 rounded w-24 animate-pulse" />
    </div>
  );
}

interface SkeletonPipelineProps {
  className?: string;
}

export function SkeletonPipeline({ className = "" }: SkeletonPipelineProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
      <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`stage-${i}`} className="flex items-center gap-3">
            <div className="w-3 h-3 bg-gray-200 rounded-full flex-shrink-0 animate-pulse" />
            <div className="flex-1 h-3 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
