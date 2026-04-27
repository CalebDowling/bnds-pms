"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { getReorderStatus } from "@/lib/inventory/reorder-check";
import { getQueueCounts, getRecentActivity, type RecentActivityItem } from "@/app/(dashboard)/dashboard/actions";
import type { DashboardData } from "@/components/dashboard/CardGrid";
import DashboardPhoneWidget from "@/components/dashboard/DashboardPhoneWidget";

interface WorkflowItemProps {
  label: string;
  count: number;
  href: string;
  statusColor: string;
  hot?: boolean;
  isLast?: boolean;
}

// Workflow Queue row per design-reference/dashboard.jsx — dot + label + count + chevron only.
// No icon, no badge pill — design is type-led, with the dot carrying the module color.
function WorkflowItem({ label, count, href, statusColor, hot, isLast }: WorkflowItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 no-underline transition-colors"
      style={{
        padding: "9px 14px",
        borderBottom: isLast ? "none" : "1px solid #e3ddd1",
        backgroundColor: hot ? "rgba(201,138,20,0.06)" : "transparent",
        color: "#14201a",
      }}
      onMouseEnter={(e) => {
        if (!hot) (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f8f0";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = hot ? "rgba(201,138,20,0.06)" : "transparent";
      }}
    >
      <span
        className="flex-shrink-0"
        style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: statusColor }}
      />
      <span
        className="flex-1 truncate"
        style={{
          fontSize: 13,
          color: count > 0 ? "#14201a" : "#3a4a42",
          fontWeight: hot ? 500 : 400,
        }}
      >
        {label}
      </span>
      <span
        className="tabular-nums"
        style={{
          fontSize: 13,
          fontWeight: count > 0 ? 600 : 400,
          color: hot ? "#c98a14" : count > 0 ? "#14201a" : "#a3aea7",
          minWidth: 18,
          textAlign: "right",
        }}
      >
        {count}
      </span>
      <ChevronRight size={12} style={{ color: "#a3aea7" }} />
    </Link>
  );
}

interface QuickTileProps {
  label: string;
  sub: string;
  href: string;
}

// Quick Access tile — Style A "minimal" type-led variant per design default.
// Serif label (17px, weight 500), 12px sub-text in --ink-3, no icon, white surface,
// hover lifts to forest border + paper background.
function QuickTile({ label, sub, href }: QuickTileProps) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 no-underline transition-colors"
      style={{
        padding: "14px 16px",
        background: "#ffffff",
        border: "1px solid #e3ddd1",
        borderRadius: 8,
        textAlign: "left",
        alignItems: "flex-start",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#1f5a3a";
        el.style.background = "#faf8f4";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#e3ddd1";
        el.style.background = "#ffffff";
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-serif), 'Source Serif 4', Georgia, serif",
          fontSize: 17,
          fontWeight: 500,
          color: "#14201a",
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </span>
      <span
        className="tabular-nums"
        style={{ fontSize: 12, color: "#6b7a72" }}
      >
        {sub}
      </span>
    </Link>
  );
}

interface ReorderItem {
  itemId: string;
  itemName: string;
  ndc?: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  severity: "critical" | "low";
}

// Workflow queue per design-reference/dashboard.jsx WORKFLOW_QUEUE constant.
// Heritage palette dots — leaf #5aa845, info #2b6c9b, danger #b8442e, forest #1f5a3a,
// warn #c98a14, mochi #8b5cf6 — replacing the previous Tailwind rainbow.
const QUEUE_CONFIG: { status: string; label: string; color: string }[] = [
  { status: "intake", label: "Intake", color: "#5aa845" },
  { status: "sync", label: "Sync", color: "#2b6c9b" },
  { status: "reject", label: "Reject", color: "#b8442e" },
  { status: "print", label: "Print", color: "#1f5a3a" },
  { status: "scan", label: "Scan", color: "#5aa845" },
  { status: "verify", label: "Verify", color: "#c98a14" },
  { status: "oos", label: "Out of Stock", color: "#c98a14" },
  { status: "waiting_bin", label: "Waiting Bin", color: "#c98a14" },
  { status: "renewals", label: "Renewals", color: "#5aa845" },
  { status: "todo", label: "Todo", color: "#2b6c9b" },
  { status: "price_check", label: "Price Check", color: "#b8442e" },
  { status: "prepay", label: "Prepay", color: "#5aa845" },
  { status: "ok_to_charge", label: "OK to Charge", color: "#1f5a3a" },
  { status: "decline", label: "Decline", color: "#b8442e" },
  { status: "ok_to_charge_clinic", label: "OK to Charge Clinic", color: "#5aa845" },
  { status: "mochi", label: "Mochi", color: "#8b5cf6" },
];

export default function DashboardCommandCenter({ data }: { data: DashboardData }) {
  const [stockAlerts, setStockAlerts] = useState<{ critical: ReorderItem[]; low: ReorderItem[] }>({ critical: [], low: [] });
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  useEffect(() => {
    getReorderStatus()
      .then((result) => setStockAlerts({ critical: result.critical.slice(0, 3), low: result.low.slice(0, 4) }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    getQueueCounts()
      .then((counts) => setQueueCounts(counts as Record<string, number>))
      .catch(() => {});
    getRecentActivity(8)
      .then((items) => setRecentActivity(items))
      .catch(() => {});
    const interval = setInterval(() => {
      getQueueCounts()
        .then((counts) => setQueueCounts(counts as Record<string, number>))
        .catch(() => {});
      getRecentActivity(8)
        .then((items) => setRecentActivity(items))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const allAlerts = [...stockAlerts.critical, ...stockAlerts.low];

  return (
    <div className="px-6 pb-6">
      {/* Three-column dashboard grid per design-reference/dashboard.jsx:
          300px workflow queue | 1fr quick access + phone | 320px activity + alerts */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "300px 1fr 320px", alignItems: "start" }}
      >
        {/* Column 1: Workflow Queue */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
        >
          <div
            className="flex items-center justify-between"
            style={{ padding: "12px 14px", borderBottom: "1px solid #e3ddd1" }}
          >
            <span
              className="text-[11px] font-semibold uppercase"
              style={{ color: "#6b7a72", letterSpacing: "0.12em" }}
            >
              Workflow Queue
            </span>
            <Link
              href="/queue"
              className="hover:underline no-underline"
              style={{ fontSize: 11.5, color: "#1f5a3a", fontWeight: 500 }}
            >
              Open Queue
            </Link>
          </div>
          <div>
            {QUEUE_CONFIG.map((q, i) => {
              const count = queueCounts[q.status] ?? 0;
              const hot = q.status === "waiting_bin" && count > 10;
              return (
                <WorkflowItem
                  key={q.status}
                  label={q.label}
                  count={count}
                  href={`/queue?status=${q.status}`}
                  statusColor={q.color}
                  hot={hot}
                  isLast={i === QUEUE_CONFIG.length - 1}
                />
              );
            })}
          </div>
        </div>

        {/* Column 2: Quick Access + Phone System */}
        <div className="flex flex-col gap-4">
          {/* Quick Access — Style A "minimal" type-led tiles, 3 columns per design default */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
          >
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e3ddd1" }}>
              <span
                className="text-[11px] font-semibold uppercase"
                style={{ color: "#6b7a72", letterSpacing: "0.12em" }}
              >
                Quick Access
              </span>
            </div>
            <div
              className="grid"
              style={{ padding: 14, gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}
            >
              <QuickTile label="Patient" sub={`${data.patientsToday} today`} href="/patients" />
              <QuickTile label="Rx" sub={`${data.rxToday} today`} href="/prescriptions" />
              <QuickTile label="Item" sub={`${data.activeItems.toLocaleString()} items`} href="/inventory" />
              <QuickTile label="Prescriber" sub={`${data.doctorsOnFile.toLocaleString()} on file`} href="/prescriptions/prescribers" />
              <QuickTile label="Compound" sub={`${data.pendingBatches} pend`} href="/compounding" />
              <QuickTile label="Inventory" sub={`${data.lowStockItems} low`} href="/inventory/reorder" />
              <QuickTile label="Sales" sub={`${data.salesToday} today`} href="/pos" />
              <QuickTile label="Claims" sub={`${data.rejectedClaims} rej`} href="/billing/claims" />
              <QuickTile label="System" sub="Admin" href="/settings" />
            </div>
          </div>

          {/* Live Phone System */}
          <DashboardPhoneWidget />
        </div>

        {/* Column 3: Activity & Alerts */}
        <div className="flex flex-col gap-4">
          {/* Recent Activity — live FillEvent feed (refreshes every 30s) */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
          >
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #e3ddd1" }}>
              <span
                className="text-[11px] font-semibold uppercase"
                style={{ color: "#6b7a72", letterSpacing: "0.12em" }}
              >
                Recent Activity
              </span>
            </div>
            <div>
              {recentActivity.length === 0 ? (
                <div
                  className="text-center italic"
                  style={{ padding: "16px 14px", fontSize: 11, color: "#6b7a72" }}
                >
                  No recent activity yet
                </div>
              ) : (
                recentActivity.map((item, i) => (
                  <Link
                    key={item.fillId}
                    href={`/queue/process/${item.fillId}`}
                    className="block no-underline transition-colors"
                    style={{
                      padding: "10px 14px",
                      borderBottom: i < recentActivity.length - 1 ? "1px solid #e3ddd1" : undefined,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f8f0"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                  >
                    <div className="flex justify-between items-baseline">
                      <span
                        className="tabular-nums"
                        style={{
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          fontSize: 11,
                          color: "#6b7a72",
                        }}
                      >
                        Ref# {item.rxNum}
                      </span>
                      <span style={{ fontSize: 11, color: "#6b7a72" }}>
                        {item.minutesAgo < 60 ? `${item.minutesAgo}m` : `${Math.floor(item.minutesAgo / 60)}h`}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#14201a", marginTop: 2 }}>
                      {item.patient}
                    </div>
                    <div
                      className="flex justify-between items-center"
                      style={{ marginTop: 1, fontSize: 11, color: "#6b7a72" }}
                    >
                      <span className="truncate">
                        {item.eventLabel}
                        {item.performer && item.performer !== "—" && (
                          <span> · {item.performer}</span>
                        )}
                      </span>
                      {item.copay && (
                        <span
                          className="tabular-nums flex-shrink-0"
                          style={{ color: "#1f5a3a", fontWeight: 500 }}
                        >
                          {item.copay}
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Stock Alerts */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: "12px 14px", borderBottom: "1px solid #e3ddd1" }}
            >
              <span
                className="text-[11px] font-semibold uppercase"
                style={{ color: "#6b7a72", letterSpacing: "0.12em" }}
              >
                Stock Alerts
              </span>
              <Link
                href="/inventory"
                className="hover:underline no-underline"
                style={{ fontSize: 11.5, color: "#1f5a3a", fontWeight: 500 }}
              >
                View All
              </Link>
            </div>
            {allAlerts.length > 0 ? (
              <div>
                {allAlerts.map((item, i) => (
                  <Link
                    key={item.itemId}
                    href={`/inventory/${item.itemId}`}
                    className="block no-underline transition-colors"
                    style={{
                      padding: "10px 14px",
                      borderBottom: i < allAlerts.length - 1 ? "1px solid #e3ddd1" : undefined,
                      borderLeft: item.severity === "critical" ? "2px solid #b8442e" : "2px solid transparent",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f8f0"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                  >
                    <div
                      className="truncate"
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: item.severity === "critical" ? "#b8442e" : "#14201a",
                      }}
                    >
                      {item.itemName}
                    </div>
                    <div
                      className="tabular-nums"
                      style={{ fontSize: 11, color: "#6b7a72", marginTop: 1 }}
                    >
                      {item.currentStock} in stock
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div
                className="text-center"
                style={{ padding: 16, fontSize: 11, color: "#6b7a72" }}
              >
                All stock levels healthy
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
