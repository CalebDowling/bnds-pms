"use client";

// Compact "More queues" dropdown — surfaces the secondary queue list
// without cluttering the header with 19 pills. Reuses the same
// pill-style trigger so it visually fits with the primary tabs.

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface MoreItem {
  key: string;
  label: string;
  count: number;
}

export default function QueueMoreDropdown({
  items,
  activeStatus,
}: {
  items: MoreItem[];
  activeStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click so the menu doesn't linger when the user
  // clicks elsewhere on the page.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // If the active queue is one of the items in this dropdown, treat the
  // whole "More" pill as active so the user can see at a glance that they
  // are inside a non-primary queue.
  const activeItem = items.find((i) => i.key === activeStatus);
  const isActive = !!activeItem;

  // Total of pending items across all secondary queues — surfaced as a
  // small counter on the trigger so badges aren't lost behind the menu.
  const totalCount = items.reduce((acc, item) => acc + item.count, 0);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border transition-colors"
        style={{
          backgroundColor: isActive ? "var(--color-primary)" : "transparent",
          color: isActive ? "#fff" : "var(--text-secondary)",
          borderColor: isActive ? "var(--color-primary)" : "var(--border)",
        }}
      >
        {activeItem ? activeItem.label : "More"}
        <span
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[11px] font-bold tabular-nums px-1"
          style={{
            backgroundColor: isActive
              ? "rgba(255,255,255,0.22)"
              : totalCount > 0
              ? "var(--green-100)"
              : "var(--green-50)",
            color: isActive
              ? "#fff"
              : totalCount > 0
              ? "var(--green-700)"
              : "var(--text-muted)",
          }}
        >
          {activeItem ? activeItem.count : totalCount}
        </span>
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className="absolute z-50 right-0 top-9 min-w-[220px] rounded-lg shadow-lg overflow-hidden"
          style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          {items.length === 0 ? (
            <div className="px-3 py-2 text-xs italic" style={{ color: "var(--text-muted)" }}>
              No additional queues
            </div>
          ) : (
            items.map((item) => {
              const isItemActive = item.key === activeStatus;
              return (
                <Link
                  key={item.key}
                  href={`/queue?status=${item.key}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-xs no-underline border-b last:border-b-0 transition-colors"
                  style={{
                    backgroundColor: isItemActive
                      ? "var(--green-50)"
                      : "var(--card-bg)",
                    color: isItemActive
                      ? "var(--green-700)"
                      : "var(--text-secondary)",
                    borderColor: "var(--border-light)",
                    fontWeight: isItemActive ? 600 : 500,
                  }}
                >
                  <span>{item.label}</span>
                  <span
                    className="inline-flex items-center justify-center min-w-[20px] h-[18px] rounded-full text-[11px] font-bold tabular-nums px-1.5"
                    style={{
                      backgroundColor:
                        item.count > 0 ? "var(--green-100)" : "var(--green-50)",
                      color:
                        item.count > 0 ? "var(--green-700)" : "var(--text-muted)",
                    }}
                  >
                    {item.count}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
