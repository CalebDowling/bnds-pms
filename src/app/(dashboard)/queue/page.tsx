import Link from "next/link";
import { getQueueFills, QUEUE_LABELS } from "./actions";
import Pagination from "@/components/ui/Pagination";
import { Suspense } from "react";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

async function QueueContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "print";
  const page = parseInt(params.page || "1", 10);
  const limit = 50;

  const { fills, total, drxStatus, label } = await getQueueFills({ status, page, limit });
  const pages = Math.ceil(total / limit);

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
            <p className="text-sm text-gray-500 mt-1">
              {total} fill{total !== 1 ? "s" : ""} in {label}
              <span className="text-gray-400 ml-2">
                (Live from DRX &middot; status: {drxStatus})
              </span>
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            &larr; Dashboard
          </Link>
        </div>

        {/* Queue selector pills */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(QUEUE_LABELS).map(([key, qLabel]) => (
              <Link
                key={key}
                href={`/queue?status=${key}`}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  status === key
                    ? "bg-[#40721D] text-white border-[#40721D]"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {qLabel}
              </Link>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200">
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fill #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rx #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Medication</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">NDC</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Refill #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fill Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fills.map((fill) => (
                    <tr key={fill.fillId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-semibold text-gray-700">{fill.fillId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-[#40721D]">{fill.rxId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">{fill.patientName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{fill.itemName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-gray-400">{fill.ndc || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{fill.quantity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{fill.daysSupply ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{fill.refillNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{formatDate(fill.fillDate)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                          {fill.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <div className="px-4 pb-4">
              <Suspense fallback={null}>
                <Pagination total={total} pages={pages} page={page} basePath="/queue" />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  return <QueueContent searchParams={searchParams} />;
}
