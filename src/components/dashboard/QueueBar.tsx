"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getQueueCounts } from "@/app/(dashboard)/dashboard/actions";

interface QueueItem {
  label: string;
  status: string;
  count: number;
  tooltip: string;
}

const defaultQueueItems: QueueItem[] = [
  { label: "Intake", status: "intake", count: 0, tooltip: "View Intake Queue" },
  { label: "Sync", status: "sync", count: 0, tooltip: "View Sync Queue" },
  { label: "Reject", status: "reject", count: 0, tooltip: "View Rejected Items" },
  { label: "Print", status: "print", count: 0, tooltip: "View Print Queue" },
  { label: "Scan", status: "scan", count: 0, tooltip: "View Scan Queue" },
  { label: "Verify", status: "verify", count: 0, tooltip: "View Verification Queue" },
  { label: "OOS", status: "oos", count: 0, tooltip: "View Out of Stock Items" },
  { label: "Waiting", status: "waiting", count: 0, tooltip: "View Waiting Bin" },
  { label: "Renewals", status: "renewals", count: 0, tooltip: "View Renewal Requests" },
  { label: "Todo", status: "todo", count: 0, tooltip: "View Todo List" },
];

// Removed pilStyle function and pillStyles - styles now applied inline based on item state

export default function QueueBar() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>(defaultQueueItems);

  useEffect(() => {
    getQueueCounts().then((counts) => {
      setQueueItems((prev) =>
        prev.map((item) => ({
          ...item,
          count: counts[item.status as keyof typeof counts] ?? 0,
        }))
      );
    });
  }, []);

  return (
    <div className="bg-[var(--card-bg)] px-6 py-3 border-b border-[var(--border)] flex items-center gap-4 overflow-x-auto relative card-gradient-border" style={{ "--card-accent": "#40721d" } as React.CSSProperties}>
      <style>{`
        @keyframes subtle-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(64, 114, 29, 0.4); }
          50% { box-shadow: 0 0 0 3px rgba(64, 114, 29, 0.1); }
        }
        @keyframes warning-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1); }
        }
      `}</style>
      <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] mr-2 whitespace-nowrap">
        Workflow
      </div>
      <div className="flex items-center gap-4">
        {queueItems.map((item, i) => {
          const isActive = item.count > 0;
          const isOOS = item.label === "OOS" && item.count > 0;
          const isIntake = item.label === "Intake" && item.count > 0;

          return (
            <div key={item.status} className="flex items-center gap-2 relative">
              {i > 0 && <div className="h-[1px] w-8 bg-gray-300 absolute -left-6" />}
              <div className="relative group">
                <Link
                  href={`/prescriptions?status=${item.status}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[20px] text-xs font-semibold cursor-pointer transition-all whitespace-nowrap no-underline"
                >
                  <span
                    className={`inline-flex items-center justify-center min-w-[24px] h-[24px] rounded-full text-[11px] font-mono tabular-nums font-bold px-1.5 transition-all ${
                      isOOS
                        ? "text-[#ef4444] animate-[warning-glow_2s_ease-out_infinite]"
                        : isIntake
                        ? "text-[#40721d] animate-[subtle-pulse_2s_ease-out_infinite]"
                        : "text-gray-400"
                    }`}
                  >
                    {item.count}
                  </span>
                  <span className={`text-xs font-semibold tracking-wide ${
                    isOOS
                      ? "text-[#ef4444]"
                      : isIntake
                      ? "text-[#40721d]"
                      : "text-gray-400"
                  }`}>
                    {item.label}
                  </span>
                </Link>
                <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-[var(--text-primary)] text-white text-[11px] font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[var(--text-primary)]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
