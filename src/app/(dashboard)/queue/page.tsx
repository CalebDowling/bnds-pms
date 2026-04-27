import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getQueueFills } from "./actions";
import { getQueueCounts } from "../dashboard/actions";
import {
  QUEUE_LABELS,
  PRIMARY_QUEUE_KEYS,
  SECONDARY_QUEUE_KEYS,
} from "./constants";
import Pagination from "@/components/ui/Pagination";
import QueueTable from "./QueueTable";
import QueuePollingWrapper from "./QueuePollingWrapper";
import QueueMoreDropdown from "./QueueMoreDropdown";
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
// Only the primary daily-workflow stages are shown as pills. Secondary
// stages (renewals, todo, ok-to-charge, etc.) live behind a single
// "More" dropdown so the header stays scannable.
async function QueuePills({ activeStatus }: { activeStatus: string }) {
  const counts = await getQueueCounts();

  const renderPill = (key: string) => {
    const qLabel = QUEUE_LABELS[key] ?? key;
    const count = counts[key as keyof typeof counts] ?? 0;
    const isActive = activeStatus === key;
    return (
      <Link
        key={key}
        href={`/queue?status=${key}`}
        className="inline-flex items-center gap-1.5 font-medium rounded-md no-underline transition-colors"
        style={{
          backgroundColor: isActive ? "#1f5a3a" : "#ffffff",
          color: isActive ? "#ffffff" : "#3a4a3c",
          border: isActive ? "1px solid #1f5a3a" : "1px solid #d9d2c2",
          padding: "5px 11px",
          fontSize: 12,
        }}
      >
        {qLabel}
        <span
          className="inline-flex items-center justify-center tabular-nums"
          style={{
            minWidth: 18,
            height: 18,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            padding: "0 5px",
            backgroundColor: isActive
              ? "rgba(255,255,255,0.22)"
              : count > 0
              ? "rgba(90,168,69,0.18)"
              : "rgba(122,138,120,0.14)",
            color: isActive ? "#ffffff" : count > 0 ? "#2d6a1f" : "#7a8a78",
          }}
        >
          {count}
        </span>
      </Link>
    );
  };

  // Build the "More" dropdown payload from secondary keys + their counts.
  const moreItems = SECONDARY_QUEUE_KEYS.map((key) => ({
    key,
    label: QUEUE_LABELS[key] ?? key,
    count: counts[key as keyof typeof counts] ?? 0,
  }));

  return (
    <>
      {PRIMARY_QUEUE_KEYS.map(renderPill)}
      <QueueMoreDropdown items={moreItems} activeStatus={activeStatus} />
    </>
  );
}

function QueuePillsFallback() {
  return (
    <>
      {PRIMARY_QUEUE_KEYS.map((key) => (
        <span
          key={key}
          className="rounded-md"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #d9d2c2",
            color: "#7a8a78",
            padding: "5px 11px",
            fontSize: 12,
          }}
        >
          {QUEUE_LABELS[key] ?? key}
        </span>
      ))}
      <span
        className="rounded-md"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #d9d2c2",
          color: "#7a8a78",
          padding: "5px 11px",
          fontSize: 12,
        }}
      >
        More
      </span>
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
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        {/* Live count */}
        <div className="px-4 py-2" style={{ borderBottom: "1px solid #ede6d6" }}>
          <p style={{ color: "#7a8a78", fontSize: 12 }}>
            {total} fill{total !== 1 ? "s" : ""} in {label}
            <span className="ml-2" style={{ color: "#a3a89c" }}>
              (status: {drxStatus})
            </span>
          </p>
        </div>

        {fills.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg mb-2" style={{ color: "#7a8a78" }}>
              No fills in {label} queue
            </p>
            <p style={{ color: "#a3a89c", fontSize: 13 }}>
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
      eyebrow="Workflow"
      title={`${label} Queue`}
      subtitle="Prescriptions waiting in this workflow stage"
      actions={
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-md font-medium no-underline transition-colors"
          style={{
            border: "1px solid #d9d2c2",
            color: "#3a4a3c",
            backgroundColor: "#ffffff",
            padding: "7px 13px",
            fontSize: 13,
          }}
        >
          <ArrowLeft size={14} strokeWidth={2} /> Dashboard
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
