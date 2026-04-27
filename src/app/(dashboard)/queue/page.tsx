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
// BNDS PMS Redesign: render as a segmented control (paper-2 container, white
// surface for the active stage with shadow-1) matching the Toolbar pattern in
// `design-reference/screens/_shared.jsx`. Only the primary daily-workflow
// stages are surfaced; secondary stages (renewals, todo, ok-to-charge, etc.)
// live behind a single "More" dropdown so the header stays scannable.
async function QueuePills({ activeStatus }: { activeStatus: string }) {
  const counts = await getQueueCounts();

  const renderTab = (key: string) => {
    const qLabel = QUEUE_LABELS[key] ?? key;
    const count = counts[key as keyof typeof counts] ?? 0;
    const isActive = activeStatus === key;
    return (
      <Link
        key={key}
        href={`/queue?status=${key}`}
        className="inline-flex items-center no-underline transition-all"
        style={{
          gap: 6,
          padding: "6px 12px",
          fontSize: 12.5,
          fontWeight: isActive ? 600 : 500,
          color: isActive ? "#14201a" : "#6b7a72",
          backgroundColor: isActive ? "#ffffff" : "transparent",
          borderRadius: 6,
          boxShadow: isActive
            ? "0 1px 0 rgba(20,32,26,0.04), 0 1px 2px rgba(20,32,26,0.04)"
            : "none",
        }}
      >
        {qLabel}
        {count > 0 && (
          <span
            style={{
              fontSize: 11,
              padding: "0 5px",
              borderRadius: 999,
              backgroundColor: isActive ? "#f3efe7" : "transparent",
              color: "#6b7a72",
              fontWeight: 500,
            }}
          >
            {count}
          </span>
        )}
      </Link>
    );
  };

  const moreItems = SECONDARY_QUEUE_KEYS.map((key) => ({
    key,
    label: QUEUE_LABELS[key] ?? key,
    count: counts[key as keyof typeof counts] ?? 0,
  }));

  return (
    <div
      className="inline-flex items-center flex-wrap"
      style={{
        gap: 2,
        padding: 3,
        backgroundColor: "#f3efe7",
        borderRadius: 8,
        border: "1px solid #e3ddd1",
      }}
    >
      {PRIMARY_QUEUE_KEYS.map(renderTab)}
      <QueueMoreDropdown items={moreItems} activeStatus={activeStatus} />
    </div>
  );
}

function QueuePillsFallback() {
  return (
    <div
      className="inline-flex items-center flex-wrap"
      style={{
        gap: 2,
        padding: 3,
        backgroundColor: "#f3efe7",
        borderRadius: 8,
        border: "1px solid #e3ddd1",
      }}
    >
      {PRIMARY_QUEUE_KEYS.map((key) => (
        <span
          key={key}
          className="inline-flex items-center"
          style={{
            padding: "6px 12px",
            fontSize: 12.5,
            fontWeight: 500,
            color: "#6b7a72",
            borderRadius: 6,
          }}
        >
          {QUEUE_LABELS[key] ?? key}
        </span>
      ))}
      <span
        className="inline-flex items-center"
        style={{
          padding: "6px 12px",
          fontSize: 12.5,
          fontWeight: 500,
          color: "#6b7a72",
          borderRadius: 6,
        }}
      >
        More
      </span>
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
