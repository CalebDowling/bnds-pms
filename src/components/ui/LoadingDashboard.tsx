"use client";

import {
  SkeletonCard,
  SkeletonStat,
  SkeletonPipeline,
  SkeletonText,
} from "./Skeleton";

export function LoadingDashboard() {
  return (
    <div>
      {/* Breadcrumb placeholder */}
      <div className="px-6 py-2.5 text-xs text-gray-400 flex items-center gap-1.5">
        <div className="h-3 bg-gray-200 rounded w-12 animate-pulse" />
        <span className="text-gray-300">&rsaquo;</span>
        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
      </div>

      {/* Pinned actions placeholder */}
      <div className="px-6 py-4">
        <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
      </div>

      <div className="flex px-6 pt-3 pb-6 gap-6">
        <div className="flex-1">
          {/* Main content area */}
          <div className="space-y-6">
            {/* Pipeline section */}
            <div>
              <div className="h-5 bg-gray-200 rounded w-32 mb-3 animate-pulse" />
              <SkeletonPipeline />
            </div>

            {/* Stats grid - 3 columns */}
            <div>
              <div className="h-5 bg-gray-200 rounded w-40 mb-3 animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={`stat-card-${i}`} />
                ))}
              </div>
            </div>

            {/* Large section - 2x2 grid */}
            <div>
              <div className="h-5 bg-gray-200 rounded w-44 mb-3 animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={`card-${i}`} />
                ))}
              </div>
            </div>

            {/* Full-width section */}
            <div>
              <div className="h-5 bg-gray-200 rounded w-36 mb-3 animate-pulse" />
              <SkeletonCard />
            </div>
          </div>
        </div>

        {/* Right rail - 280px */}
        <div className="w-[280px] flex-shrink-0 space-y-4">
          {/* Phone dialer placeholder */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 h-64 animate-pulse" />

          {/* Right rail items */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={`rail-${i}`}
              className="bg-white rounded-xl border border-gray-200 p-4 h-40 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
