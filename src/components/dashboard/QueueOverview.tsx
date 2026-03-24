"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getQueueCounts } from "@/app/(dashboard)/dashboard/actions";

const QUEUE_GROUPS = [
  {
    title: "Workflow",
    queues: [
      { key: "intake", label: "Intake", color: "#40721D" },
      { key: "sync", label: "Sync", color: "#3b82f6" },
      { key: "print", label: "Print", color: "#6366f1" },
      { key: "scan", label: "Scan", color: "#8b5cf6" },
      { key: "verify", label: "Verify", color: "#10b981" },
    ],
  },
  {
    title: "Attention Needed",
    queues: [
      { key: "reject", label: "Reject", color: "#ef4444" },
      { key: "oos", label: "OOS", color: "#f59e0b" },
      { key: "decline", label: "Decline", color: "#ef4444" },
    ],
  },
  {
    title: "Custom Queues",
    queues: [
      { key: "price_check", label: "Price Check", color: "#f97316" },
      { key: "prepay", label: "Prepay", color: "#14b8a6" },
      { key: "ok_to_charge", label: "OK to Charge", color: "#40721D" },
      { key: "ok_to_charge_clinic", label: "Clinic Charge", color: "#40721D" },
      { key: "mochi", label: "Mochi", color: "#6366f1" },
    ],
  },
  {
    title: "Holding",
    queues: [
      { key: "waiting_bin", label: "Waiting Bin", color: "#64748b" },
      { key: "renewals", label: "Renewals", color: "#a855f7" },
    ],
  },
];

export default function QueueOverview() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQueueCounts().then((c) => {
      setCounts(c);
      setLoading(false);
    });
  }, []);

  const totalActive = Object.values(counts).reduce((sum, v) => sum + v, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#40721D] to-[#65a30d] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Queue Overview</h2>
            <p className="text-[10px] text-gray-400">
              {loading ? "Loading..." : `${totalActive} total fills across all queues`}
            </p>
          </div>
        </div>
        <Link
          href="/queue?status=intake"
          className="text-xs font-semibold text-[#40721D] hover:underline no-underline"
        >
          Open Queues &rarr;
        </Link>
      </div>

      {/* Queue groups */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUEUE_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{group.title}</h3>
            <div className="space-y-1">
              {group.queues.map((q) => {
                const count = counts[q.key] ?? 0;
                const hasItems = count > 0;

                return (
                  <Link
                    key={q.key}
                    href={`/queue?status=${q.key}`}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all no-underline group ${
                      hasItems
                        ? "hover:bg-gray-50 cursor-pointer"
                        : "opacity-50 cursor-pointer hover:opacity-70"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: hasItems ? q.color : "#d1d5db" }}
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{q.label}</span>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        hasItems ? "text-gray-900" : "text-gray-300"
                      }`}
                      style={hasItems ? { color: q.color } : undefined}
                    >
                      {loading ? (
                        <span className="inline-block w-6 h-3 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        count
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Top queues quick-jump bar */}
      {!loading && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(counts)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([key, count]) => {
                const q = QUEUE_GROUPS.flatMap(g => g.queues).find(q => q.key === key);
                if (!q) return null;
                return (
                  <Link
                    key={key}
                    href={`/queue?status=${key}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors no-underline hover:shadow-sm"
                    style={{
                      borderColor: q.color + "40",
                      color: q.color,
                      backgroundColor: q.color + "08",
                    }}
                  >
                    {q.label}
                    <span className="font-bold">{count}</span>
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
