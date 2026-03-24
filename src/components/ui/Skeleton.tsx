"use client";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div
      className={`glass-card rounded-xl p-4 space-y-3 relative overflow-hidden ${className}`}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded-md w-24 skeleton-shimmer" />
          <div className="h-3 bg-gray-100 rounded-md w-32 skeleton-shimmer" />
        </div>
        <div className="w-11 h-11 bg-gray-200 rounded-lg skeleton-shimmer" />
      </div>

      {/* Main content skeleton */}
      <div className="space-y-2 py-2">
        <div className="h-8 bg-gray-200 rounded-md w-16 skeleton-shimmer" />
        <div className="h-3 bg-gray-100 rounded-md w-20 skeleton-shimmer" />
      </div>

      {/* Footer skeleton */}
      <div className="pt-2 border-t border-gray-100/50">
        <div className="h-8 bg-gray-100 rounded-lg w-full skeleton-shimmer" />
        <div className="mt-2 space-y-1.5">
          <div className="h-6 bg-gray-50 rounded w-full skeleton-shimmer" />
          <div className="h-6 bg-gray-50 rounded w-3/4 skeleton-shimmer" />
        </div>
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
    <div className={`glass-card rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200/50 px-4 py-3 flex gap-4 bg-gray-50/50">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className="flex-1">
            <div
              className="h-4 bg-gray-200 rounded-md skeleton-shimmer"
              style={{ width: `${60 + Math.random() * 40}%` }}
            />
          </div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="border-b border-gray-100/50 px-4 py-3 flex gap-4"
          style={{ opacity: 1 - rowIdx * 0.08 }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div key={`cell-${rowIdx}-${colIdx}`} className="flex-1">
              <div
                className="h-4 bg-gray-200 rounded-md skeleton-shimmer"
                style={{
                  width: `${70 + Math.random() * 30}%`,
                  animationDelay: `${(rowIdx * columns + colIdx) * 50}ms`,
                }}
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
          className="h-4 bg-gray-200 rounded-md skeleton-shimmer"
          style={{
            width: i === lines - 1 ? width : "100%",
            animationDelay: `${i * 80}ms`,
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
    <div className={`glass-stat rounded-xl p-4 space-y-3 ${className}`}>
      {showLabel && <div className="h-3 bg-gray-200 rounded-md w-20 skeleton-shimmer" />}
      <div className="h-10 bg-gray-200 rounded-md w-32 skeleton-shimmer" />
      <div className="h-3 bg-gray-100 rounded-md w-24 skeleton-shimmer" />
    </div>
  );
}

interface SkeletonPipelineProps {
  className?: string;
}

export function SkeletonPipeline({ className = "" }: SkeletonPipelineProps) {
  return (
    <div className={`glass-card rounded-xl p-4 ${className}`}>
      <div className="h-4 bg-gray-200 rounded-md w-32 mb-4 skeleton-shimmer" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`stage-${i}`} className="flex items-center gap-3">
            <div className="w-3 h-3 bg-gray-200 rounded-full flex-shrink-0 skeleton-shimmer" />
            <div
              className="flex-1 h-3 bg-gray-100 rounded-md skeleton-shimmer"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Dashboard skeleton with glassmorphism grid */
export function SkeletonDashboardGrid({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: 9 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
