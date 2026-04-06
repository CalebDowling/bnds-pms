"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getQueueCounts } from "@/app/(dashboard)/dashboard/actions";

interface QueueItem {
  label: string;
  status: string;
  count: number;
  tooltip: string;
  href?: string;
}

// Queue items match DRX queue bar — same options, same order
const defaultQueueItems: QueueItem[] = [
  { label: "Intake", status: "intake", count: 0, tooltip: "View Intake Queue" },
  { label: "Sync", status: "sync", count: 0, tooltip: "View Sync Queue" },
  { label: "Reject", status: "reject", count: 0, tooltip: "View Rejected Claims" },
  { label: "Print", status: "print", count: 0, tooltip: "View Print Queue" },
  { label: "Scan", status: "scan", count: 0, tooltip: "View Scan Queue" },
  { label: "Verify", status: "verify", count: 0, tooltip: "View Verification Queue" },
  { label: "OOS", status: "oos", count: 0, tooltip: "View Out of Stock" },
  { label: "Waiting Bin", status: "waiting_bin", count: 0, tooltip: "View Waiting Bin" },
  { label: "Renewals", status: "renewals", count: 0, tooltip: "View Renewals" },
  { label: "Todo", status: "todo", count: 0, tooltip: "View Todo Queue" },
  { label: "price check", status: "price_check", count: 0, tooltip: "View Price Check Queue" },
  { label: "prepay", status: "prepay", count: 0, tooltip: "View Prepay Queue" },
  { label: "ok to charge", status: "ok_to_charge", count: 0, tooltip: "View OK to Charge Queue" },
  { label: "Decline", status: "decline", count: 0, tooltip: "View Decline Queue" },
  { label: "ok to charge clinic", status: "ok_to_charge_clinic", count: 0, tooltip: "View OK to Charge Clinic" },
  { label: "mochi", status: "mochi", count: 0, tooltip: "View Mochi Queue" },
];

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
    <div className="bg-[var(--card-bg)] px-6 py-3 border-b border-[var(--border)] flex items-center gap-4 overflow-x-auto relative card-gradient-border mobile-scroll-x" style={{ "--card-accent": "#40721d" } as React.CSSProperties}>
      <style>{`
        .queue-bar-label,
        .queue-bar-count {
          color: #000000 !important;
        }
        [data-theme="dark"] .queue-bar-label,
        [data-theme="dark"] .queue-bar-count {
          color: #ffffff !important;
        }
        .queue-bar-header {
          color: #000000 !important;
        }
        [data-theme="dark"] .queue-bar-header {
          color: #ffffff !important;
        }
      `}</style>
      <div className="queue-bar-header text-[11px] font-bold uppercase tracking-wide mr-2 whitespace-nowrap">
        Queues
      </div>
      <div className="flex items-center gap-4">
        {queueItems.map((item, i) => {
          return (
            <div key={item.status} className="flex items-center gap-2 relative">
              {i > 0 && <div className="h-[1px] w-8 absolute -left-6" style={{ background: "rgba(0,0,0,0.3)" }} />}
              <div className="relative group">
                <Link
                  href={item.href || `/queue?status=${item.status}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[20px] text-xs font-semibold cursor-pointer transition-all whitespace-nowrap no-underline"
                >
                  <span className="queue-bar-count inline-flex items-center justify-center min-w-[24px] h-[24px] rounded-full text-[11px] font-mono tabular-nums font-bold px-1.5 transition-all">
                    {item.count}
                  </span>
                  <span className="queue-bar-label text-xs font-semibold tracking-wide">
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
