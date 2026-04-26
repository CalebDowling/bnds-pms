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

// Queue items mirror the original DRX queue bar — same options, same order.
// Counts now come from the local prescription_fills table; see env.isDrxEnabled
// for the DRX integration status.
const defaultQueueItems: QueueItem[] = [
  { label: "Intake", status: "intake", count: 0, tooltip: "View Intake Queue" },
  { label: "Sync", status: "sync", count: 0, tooltip: "View Adjudication Queue" },
  { label: "Reject", status: "reject", count: 0, tooltip: "View Rejected Claims" },
  { label: "Print", status: "print", count: 0, tooltip: "View Print Queue" },
  { label: "Scan", status: "scan", count: 0, tooltip: "View Scan Queue" },
  { label: "Verify", status: "verify", count: 0, tooltip: "View Verification Queue" },
  // Per pharmacist review: pharmacist-rejected fills get their own queue so they
  // don't get lost in Print on high-volume days.
  { label: "RPh Rejected", status: "rph_rejected", count: 0, tooltip: "Rx rejected by pharmacist" },
  { label: "OOS", status: "oos", count: 0, tooltip: "View Out of Stock" },
  { label: "Waiting Bin", status: "waiting_bin", count: 0, tooltip: "View Waiting Bin" },
  { label: "Renewals", status: "renewals", count: 0, tooltip: "View Renewals" },
  { label: "Todo", status: "todo", count: 0, tooltip: "View Todo Queue" },
  { label: "Price Check", status: "price_check", count: 0, tooltip: "View Price Check Queue" },
  { label: "Prepay", status: "prepay", count: 0, tooltip: "View Prepay Queue" },
  { label: "OK to Charge", status: "ok_to_charge", count: 0, tooltip: "View OK to Charge Queue" },
  // Per pharmacist review: "Decline" is for *payment-declined* prescriptions,
  // not patient-declined.
  { label: "Decline", status: "decline", count: 0, tooltip: "Rx where payment was declined" },
  { label: "OK to Charge Clinic", status: "ok_to_charge_clinic", count: 0, tooltip: "View OK to Charge Clinic" },
  // Per pharmacist review: this is the RPh QA/QC queue for compounds finalized
  // by compounding technicians, not a generic catch-all. Replaced the legacy
  // "Mochi" label/key so the queue intent is clear.
  { label: "Compound QA", status: "compound_qa", count: 0, tooltip: "RPh QA/QC for finished compounds" },
  // Centralized telehealth queue (Lumi, Mochi, etc. — single queue, source-tagged).
  { label: "Telehealth", status: "telehealth", count: 0, tooltip: "Lumi / Mochi / other telehealth Rx" },
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
