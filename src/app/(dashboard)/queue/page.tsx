import Link from "next/link";
import { getQueueFills } from "./actions";
import { getQueueCounts } from "../dashboard/actions";
import { QUEUE_LABELS } from "./constants";
import Pagination from "@/components/ui/Pagination";
import QueueTable from "./QueueTable";
import QueuePollingWrapper from "./QueuePollingWrapper";
import { Suspense } from "react";

// ─── Loading skeleton shown while queue data loads ───
function QueueSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 animate-pulse">
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="h-3 bg-gray-200 rounded w-32" />
      </div>
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded w-16" />
        ))}
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-4 border-b border-gray-100">
          {Array.from({ length: 9 }).map((_, j) => (
            <div key={j} className="h-3 bg-gray-100 rounded" style={{ width: `${40 + (j * 7) % 40}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Queue pills with live count badges ───
async function QueuePills({ activeStatus }: { activeStatus: string }) {
  const counts = await getQueueCounts();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(QUEUE_LABELS).map(([key, qLabel]) => {
          const count = counts[key as keyof typeof counts] ?? 0;
          const isActive = activeStatus === key;

          return (
            <Link
              key={key}
              href={`/queue?status=${key}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-colors ${
                isActive
                  ? "bg-[#40721D] text-white border-[#40721D]"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {qLabel}
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[11px] font-bold tabular-nums px-1 ${
                  isActive
                    ? "bg-white/20 text-white"
                    : count > 0
                    ? "bg-[#40721D]/10 text-[#40721D]"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Async table content — streams in after data fetches ───
async function QueueContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "print";
  const page = parseInt(params.page || "1", 10);
  const limit = 100;

  const { fills, total, drxStatus, label } = await getQueueFills({ status, page, limit });
  const pages = Math.ceil(total / limit);

  return (
    <QueuePollingWrapper>
      <div className="bg-white rounded-b-xl border-x border-b border-gray-200">
        {/* Live count */}
        <div className="px-4 py-2 border-b border-gray-100">
          <p className="text-xs text-gray-500">
            {total} fill{total !== 1 ? "s" : ""} in {label}
            <span className="text-gray-400 ml-2">
              (Live from DRX &middot; status: {drxStatus})
            </span>
          </p>
        </div>

        {fills.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">No fills in {label} queue</p>
            <p className="text-gray-400 text-sm">
              {total === 0
                ? "This queue is currently empty in DRX."
                : `${total} fills total — navigate pages to view more.`}
            </p>
          </div>
        ) : (
          <QueueTable fills={fills} />
        )}
        {pages > 1 && (
          <div className="px-4 pb-4">
            <Suspense fallback={null}>
              <Pagination total={total} pages={pages} page={page} basePath="/queue" />
            </Suspense>
          </div>
        )}
      </div>
    </QueuePollingWrapper>
  );
}

// ─── Page shell — renders instantly (breadcrumb, title, pills) ───
export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "print";
  const label = QUEUE_LABELS[status] || status;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-6 py-2.5 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
        <Link href="/dashboard" className="text-[var(--green-700)] no-underline font-medium hover:underline">Home</Link>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <span className="text-[var(--text-secondary)] font-semibold">{label} Queue</span>
      </div>

      <div className="px-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{label} Queue</h1>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            &larr; Dashboard
          </Link>
        </div>

        {/* Queue selector pills with count badges */}
        <Suspense fallback={
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(QUEUE_LABELS).map(([key, qLabel]) => (
                <span key={key} className="px-3 py-1 text-xs rounded-full border border-gray-200 text-gray-400">
                  {qLabel}
                </span>
              ))}
            </div>
          </div>
        }>
          <QueuePills activeStatus={status} />
        </Suspense>

        {/* Table — streamed in with skeleton fallback */}
        <Suspense fallback={<QueueSkeleton />}>
          <QueueContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
