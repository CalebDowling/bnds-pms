"use client";

import Link from "next/link";

const queueItems = [
  { label: "Intake", status: "intake", count: 20, tooltip: "View Intake Queue" },
  { label: "Sync", status: "sync", count: 0, tooltip: "View Sync Queue" },
  { label: "Reject", status: "reject", count: 0, tooltip: "View Rejected Items" },
  { label: "Print", status: "print", count: 129, tooltip: "View Print Queue" },
  { label: "Scan", status: "scan", count: 273, tooltip: "View Scan Queue" },
  { label: "Verify", status: "verify", count: 347, tooltip: "View Verification Queue" },
  { label: "OOS", status: "oos", count: 29, tooltip: "View Out of Stock Items" },
  { label: "Waiting", status: "waiting", count: 235, tooltip: "View Waiting Bin" },
  { label: "Renewals", status: "renewals", count: 0, tooltip: "View Renewal Requests" },
  { label: "Todo", status: "todo", count: 0, tooltip: "View Todo List" },
];

function getPillStyle(item: { label: string; count: number }) {
  if (item.label === "OOS" && item.count > 0) return "alert";
  if (item.count > 100) return "high";
  if (item.count > 0) return "active";
  return "default";
}

const pillStyles = {
  default: {
    pill: "bg-[var(--border-light)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--green-100)]",
    count: "bg-[var(--border)] text-[var(--text-secondary)]",
  },
  active: {
    pill: "bg-[var(--green-100)] text-[var(--green-900)] border-[#b8e0c4] hover:bg-[#d4f0dd] hover:border-[#8fd4a4]",
    count: "bg-[var(--green-700)] text-white animate-[pulse-ring_2s_ease-out_infinite]",
  },
  high: {
    pill: "bg-[#d4f0dd] text-[var(--green-900)] border-[#8fd4a4] hover:bg-[#c0e8cc]",
    count: "bg-[var(--green-900)] text-white animate-[pulse-ring_2s_ease-out_infinite]",
  },
  alert: {
    pill: "bg-[var(--red-100)] text-[#991b1b] border-[var(--red-border)] hover:bg-[#fee2e2] hover:border-[#f87171]",
    count: "bg-[var(--red-600)] text-white animate-[pulse-ring-red_1.5s_ease-out_infinite]",
  },
};

export default function QueueBar() {
  return (
    <div className="bg-[var(--card-bg)] px-6 py-2.5 border-b border-[var(--border)] flex items-center gap-[5px] overflow-x-auto">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] mr-2 whitespace-nowrap">
        Workflow
      </div>
      {queueItems.map((item, i) => {
        const style = getPillStyle(item);
        const s = pillStyles[style];
        return (
          <div key={item.status} className="flex items-center gap-[5px]">
            {i > 0 && <span className="text-[#b8d4be] text-base mx-px">&rsaquo;</span>}
            <div className="relative group">
              <Link
                href={`/prescriptions?status=${item.status}`}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[20px] text-xs font-semibold cursor-pointer transition-all whitespace-nowrap border ${s.pill} hover:-translate-y-px no-underline`}
              >
                <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-[11px] text-[11px] font-bold px-[5px] ${s.count}`}>
                  {item.count}
                </span>
                <span>{item.label}</span>
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
  );
}
