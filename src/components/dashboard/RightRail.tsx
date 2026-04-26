"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReorderStatus } from "@/lib/inventory/reorder-check";
import { getRecentActivity, type RecentActivityItem } from "@/app/(dashboard)/dashboard/actions";
import { formatDrugName } from "@/lib/utils/formatters";

interface ReorderItem {
  itemId: string;
  itemName: string;
  ndc?: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  severity: "critical" | "low";
}

function getRelativeTime(minutesAgo: number): { text: string; isRecent: boolean } {
  if (minutesAgo < 5) return { text: `${minutesAgo}m ago`, isRecent: true };
  if (minutesAgo < 60) return { text: `${minutesAgo}m ago`, isRecent: false };
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return { text: `${hoursAgo}h ago`, isRecent: false };
  const daysAgo = Math.floor(hoursAgo / 24);
  return { text: `${daysAgo}d ago`, isRecent: false };
}

function PulsingDot() {
  return (
    <span className="inline-block w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
  );
}

function VerifiedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function RightRail() {
  const [lowStockItems, setLowStockItems] = useState<ReorderItem[]>([]);
  const [criticalItems, setCriticalItems] = useState<ReorderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Live recent-activity feed — was hardcoded before, so it never showed
  // what was actually happening. Refreshes on the same cadence as the
  // dashboard command center.
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  useEffect(() => {
    const loadReorderStatus = async () => {
      try {
        const result = await getReorderStatus();
        setCriticalItems(result.critical.slice(0, 2));
        setLowStockItems(result.low.slice(0, 3));
      } catch (error) {
        console.error("Failed to load reorder status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const loadActivity = async () => {
      try {
        const items = await getRecentActivity(5);
        setRecentActivity(items);
      } catch {
        // non-critical — fall back to empty list
      }
    };

    loadReorderStatus();
    loadActivity();
    // Refresh every 5 minutes (stock) — recent activity gets a faster 30s tick
    const stockInterval = setInterval(loadReorderStatus, 5 * 60 * 1000);
    const activityInterval = setInterval(loadActivity, 30 * 1000);
    return () => {
      clearInterval(stockInterval);
      clearInterval(activityInterval);
    };
  }, []);

  const allStockAlerts = [...criticalItems, ...lowStockItems];

  return (
    <div>
      {/* Recent Activity */}
      <div className="card-gradient-border bg-[var(--card-bg)] rounded-[10px] border border-[var(--border)] mb-4 overflow-hidden" style={{ "--card-accent": "#10b981" } as React.CSSProperties}>
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-500 px-4 pt-3.5 pb-2">
          Recent Activity
          <span className="text-[10px] bg-[var(--green-100)] text-[var(--green-700)] px-1.5 py-px rounded font-semibold">{recentActivity.length}</span>
        </div>
        <div className="divide-y divide-[var(--border-light)]">
          {recentActivity.length === 0 ? (
            <div className="px-4 py-4 text-center text-[11px] italic text-[var(--text-muted)]">
              No recent activity yet
            </div>
          ) : (
            recentActivity.map((item) => {
              const timeInfo = getRelativeTime(item.minutesAgo);
              return (
                <Link
                  key={item.fillId}
                  href={`/queue/process/${item.fillId}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors group no-underline"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="activity-icon" style={{
                        background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)"
                      }}>
                        <VerifiedIcon />
                      </div>
                      <div className="text-[11px] font-semibold text-[var(--green-700)] font-tabular">Rx# {item.rxNum}</div>
                    </div>
                    {timeInfo.isRecent && <PulsingDot />}
                  </div>
                  <div className="text-[13px] font-semibold text-[var(--text-primary)] mb-1.5">{item.patient}</div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="truncate">
                      {item.eventLabel}
                      {item.performer && item.performer !== "—" && (
                        <span className="ml-1 text-gray-400">· {item.performer}</span>
                      )}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{timeInfo.text}</span>
                  </div>
                  {item.copay && (
                    <div className="text-[11px] text-[var(--text-muted)] font-tabular mt-0.5">
                      {item.copay}
                    </div>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Stock Alerts */}
      {!isLoading && allStockAlerts.length > 0 && (
        <div className="bg-[var(--card-bg)] rounded-[10px] border border-[var(--border)] overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-500 px-4 pt-3.5 pb-2">
            Stock Alerts
            <Link
              href="/inventory"
              className="text-[10px] font-semibold text-[#40721D] hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-[var(--border-light)]">
            {/* Critical Items */}
            {criticalItems.map((item) => (
              <Link
                key={item.itemId}
                href={`/inventory/${item.itemId}`}
                className="px-4 py-3 border-l-[3px] border-l-red-500 cursor-pointer hover:bg-red-50 transition-colors group block"
              >
                <div className="text-[13px] font-semibold text-red-600 mb-1.5 truncate group-hover:text-red-700">
                  {formatDrugName(item.itemName)}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] group-hover:text-red-700 transition-colors">
                  <span className="font-tabular">0</span> in stock · Reorder <span className="font-tabular">{item.reorderQuantity.toFixed(0)}</span>
                </div>
              </Link>
            ))}

            {/* Low Stock Items */}
            {lowStockItems.map((item) => (
              <Link
                key={item.itemId}
                href={`/inventory/${item.itemId}`}
                className="px-4 py-3 border-l-[3px] border-l-amber-500 cursor-pointer hover:bg-amber-50 transition-colors group block"
              >
                <div className="text-[13px] font-semibold text-[var(--amber-600)] mb-1.5 truncate group-hover:text-amber-700">
                  {formatDrugName(item.itemName)}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] group-hover:text-amber-700 transition-colors">
                  <span className="font-tabular">{item.currentStock.toFixed(0)}</span> remaining · Reorder at <span className="font-tabular">{item.reorderPoint.toFixed(0)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && allStockAlerts.length === 0 && (
        <div className="bg-[var(--card-bg)] rounded-[10px] border border-[var(--border)] overflow-hidden p-4">
          <div className="text-center">
            <div className="text-2xl mb-2">✓</div>
            <p className="text-sm text-[var(--text-muted)]">All stock levels are healthy</p>
          </div>
        </div>
      )}
    </div>
  );
}
