import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getQueueFills } from "./actions";
import { getQueueCounts } from "../dashboard/actions";
import { QUEUE_LABELS } from "./constants";
import Pagination from "@/components/ui/Pagination";
import QueueTable from "./QueueTable";
import QueuePollingWrapper from "./QueuePollingWrapper";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import { Suspense } from "react";

// ─── Loading skeleton shown while queue data loads ───
function QueueSkeleton() {
  return (
    <div
      className="rounded-xl animate-pulse overflow-hidden"
      style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
    >
      <div className="px-4 py-2" style={{ borderBottom: "1px solid var(--border-light)" }}>
        <div className="h-3 bg-gray-200 rounded w-32" />
      </div>
      <div className="px-4 py-3 flex gap-4" style={{ borderBottom: "1px solid var(--border-light)" }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded w-16" />
        ))}
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-4" style={{ borderBottom: "1px solid var(--border-light)" }}>
          {Array.from({ length: 9 }).map((_, j) => (
            <div key={j} className="h-3 bg-gray-100 rounded" style={{ width: `${40 + (j * 7) % 40}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Queue selector pills (live counts) — rendered inside a FilterBar ───
async function QueuePills({ activeStatus }: { activeStatus: string }) {
  const counts = await getQueueCounts();

  return (
    <>
      {Object.entries(QUEUE_LABELS).map(([key, qLabel]) => {
        const count = counts[key as keyof typeof counts] ?? 0;
        const isActive = activeStatus === key;

        return (
          <Link
            key={key}
            href={`/queue?status=${key}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border no-underline transition-colors"
            style={{
              backgroundColor: isActive ? "var(--color-primary)" : "transparent",
              color: isActive ? "#fff" : "var(--text-secondary)",
              borderColor: isActive ? "var(--color-primary)" : "var(--border)",
            }}
          >
            {qLabel}
            <span
              className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[11px] font-bold tabular-nums px-1"
              style={{
                backgroundColor: isActive
                  ? "rgba(255,255,255,0.22)"
                  : count > 0
                  ? "var(--green-100)"
                  : "var(--green-50)",
                color: isActive
                  ? "#fff"
                  : count > 0
                  ? "var(--green-700)"
                  : "var(--text-muted)",
              }}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </>
  );
}

function QueuePillsFallback() {
  return (
    <>
      {Object.entries(QUEUE_LABELS).map(([key, qLabel]) => (
        <span
          key={key}
          className="px-3 py-1 text-xs rounded-full border"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          {qLabel}
        </span>
      ))}
    </>
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
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        {/* Live count */}
        <div className="px-4 py-2" style={{ borderBottom: "1px solid var(--border-light)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {total} fill{total !== 1 ? "s" : ""} in {label}
            <span className="ml-2" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
              (status: {drxStatus})
            </span>
          </p>
        </div>

        {fills.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg mb-2" style={{ color: "var(--text-muted)" }}>
              No fills in {label} queue
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)", opacity: 0.75 }}>
              {total === 0
                ? "No fills are currently in this stage."
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

// ─── Page ───
export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "print";
  const label = QUEUE_LABELS[status] || status;

  return (
    <PageShell
      title={`${label} Queue`}
      subtitle="Prescriptions waiting in this workflow stage"
      actions={
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg no-underline transition-colors"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--card-bg)",
          }}
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
      }
      toolbar={
        <FilterBar
          filters={
            <Suspense fallback={<QueuePillsFallback />}>
              <QueuePills activeStatus={status} />
            </Suspense>
          }
        />
      }
    >
      <Suspense fallback={<QueueSkeleton />}>
        <QueueContent searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
