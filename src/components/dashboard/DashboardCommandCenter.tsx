"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Pill,
  Users,
  DollarSign,
  Package,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FlaskConical,
  Cross,
  ClipboardCheck,
  Settings,
  Inbox,
  CheckCircle2,
  Printer,
  Clock,
  ScanLine,
  ChevronRight,
  CreditCard,
  BadgeDollarSign,
  ThumbsDown,
  Building2,
  Cherry,
  ListTodo,
  ArrowDownUp,
} from "lucide-react";
import { getReorderStatus } from "@/lib/inventory/reorder-check";
import { getQueueCounts, getRecentActivity, type RecentActivityItem } from "@/app/(dashboard)/dashboard/actions";
import type { DashboardData } from "@/components/dashboard/CardGrid";
import DashboardPhoneWidget from "@/components/dashboard/DashboardPhoneWidget";

interface WorkflowItemProps {
  label: string;
  count: number;
  href: string;
  statusColor: string;
  icon: React.ReactNode;
}

function WorkflowItem({ label, count, href, statusColor, icon }: WorkflowItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors no-underline group"
      style={{ color: "#14201a" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f8f0"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
    >
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
      <span style={{ color: "#7a8a78" }} className="flex-shrink-0">{icon}</span>
      <span
        className="text-[14px] flex-1 truncate"
        style={{
          color: "#14201a",
          fontFamily: "var(--font-inter), 'Inter Tight', Inter, system-ui, sans-serif",
          fontWeight: 500,
          letterSpacing: "-0.005em",
        }}
      >
        {label}
      </span>
      <span
        className="text-[13px] font-semibold tabular-nums px-1.5 py-px rounded"
        style={{
          backgroundColor: count > 0 ? "#e8f3e2" : "transparent",
          color: count > 0 ? "#174530" : "#7a8a78",
        }}
      >
        {count}
      </span>
      <ChevronRight size={12} style={{ color: "#cfc7b6" }} />
    </Link>
  );
}

interface ModuleCardMiniProps {
  title: string;
  stat: string | number;
  icon: React.ReactNode;
  accentColor: string;
  href: string;
}

// Edge-accent-stripe Quick Access tile per BNDS PMS Redesign (Style D).
// 3px left color bar tied to the module, monochrome ink icon, Inter Tight
// 13px label, 11.5px sub-text in --ink-3. Hover lifts the stripe to fill
// the tile and warms the background to the pale leaf surface.
function ModuleCardMini({ title, stat, icon, accentColor, href }: ModuleCardMiniProps) {
  return (
    <Link
      href={href}
      className="relative flex items-center gap-2.5 pl-3 pr-2.5 py-2.5 rounded-md transition-colors no-underline overflow-hidden"
      style={{
        border: "1px solid #e3ddd1",
        backgroundColor: "#ffffff",
        boxShadow: "0 1px 0 rgba(20, 32, 26, 0.02)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f8f0";
        (e.currentTarget as HTMLElement).style.borderColor = "#cfe0c0";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "#ffffff";
        (e.currentTarget as HTMLElement).style.borderColor = "#e3ddd1";
      }}
    >
      {/* Edge accent stripe */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: accentColor }}
      />
      <span
        className="flex items-center justify-center flex-shrink-0"
        style={{ color: "#14201a" }}
      >
        {icon}
      </span>
      <div className="flex flex-col min-w-0">
        <span
          className="leading-tight truncate"
          style={{
            fontFamily: "var(--font-inter), 'Inter Tight', Inter, system-ui, sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: "#14201a",
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </span>
        <span
          className="leading-tight tabular-nums truncate"
          style={{
            fontSize: "11.5px",
            fontWeight: 500,
            color: "#5a6b58",
          }}
        >
          {stat}
        </span>
      </div>
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

// Queue definition matching master QueueBar exactly
const QUEUE_CONFIG: { status: string; label: string; icon: React.ReactNode; color: string }[] = [
  { status: "intake", label: "Intake", icon: <Inbox size={15} />, color: "#3b82f6" },
  { status: "sync", label: "Sync", icon: <ArrowDownUp size={15} />, color: "#06b6d4" },
  { status: "reject", label: "Reject", icon: <XCircle size={15} />, color: "#ef4444" },
  { status: "print", label: "Print", icon: <Printer size={15} />, color: "#a855f7" },
  { status: "scan", label: "Scan", icon: <ScanLine size={15} />, color: "#6366f1" },
  { status: "verify", label: "Verify", icon: <CheckCircle2 size={15} />, color: "#10b981" },
  { status: "oos", label: "Out of Stock", icon: <AlertTriangle size={15} />, color: "#f97316" },
  { status: "waiting_bin", label: "Waiting Bin", icon: <Clock size={15} />, color: "#f59e0b" },
  { status: "renewals", label: "Renewals", icon: <RefreshCw size={15} />, color: "#14b8a6" },
  { status: "todo", label: "Todo", icon: <ListTodo size={15} />, color: "#8b5cf6" },
  { status: "price_check", label: "Price Check", icon: <BadgeDollarSign size={15} />, color: "#ec4899" },
  { status: "prepay", label: "Prepay", icon: <CreditCard size={15} />, color: "#0ea5e9" },
  { status: "ok_to_charge", label: "OK to Charge", icon: <DollarSign size={15} />, color: "#22c55e" },
  { status: "decline", label: "Decline", icon: <ThumbsDown size={15} />, color: "#dc2626" },
  { status: "ok_to_charge_clinic", label: "OK to Charge Clinic", icon: <Building2 size={15} />, color: "#16a34a" },
  { status: "mochi", label: "Mochi", icon: <Cherry size={15} />, color: "#d946ef" },
];

export default function DashboardCommandCenter({ data }: { data: DashboardData }) {
  const [stockAlerts, setStockAlerts] = useState<{ critical: ReorderItem[]; low: ReorderItem[] }>({ critical: [], low: [] });
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});
  // Real recent-activity feed — pulled from FillEvent rows so the dashboard
  // mirrors what's actually moving through the workflow. Previously this was
  // hardcoded with 4 fake rows that never updated.
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
      {/* Three Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Workflow Queue */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#faf8f4", border: "1px solid #e3ddd1" }}>
          <div className="px-3 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid #ece7da" }}>
            <span className="text-[11px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.12em" }}>
              Workflow Queue
            </span>
            <Link href="/queue" className="text-[11px] font-medium hover:underline" style={{ color: "#1f5a3a" }}>
              Open Queue
            </Link>
          </div>
          <div className="py-1">
            {QUEUE_CONFIG.map((q) => (
              <WorkflowItem
                key={q.status}
                label={q.label}
                count={queueCounts[q.status] ?? 0}
                href={`/queue?status=${q.status}`}
                statusColor={q.color}
                icon={q.icon}
              />
            ))}
          </div>
        </div>

        {/* Column 2: Quick Access + Phone System */}
        <div className="space-y-4">
          {/* Quick Access — Edge accent stripe tiles (BNDS PMS Redesign Style D).
              Brand colors aligned to forest+leaf palette so the modules read as
              part of the design system, not bootstrap rainbow chips. */}
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#faf8f4", border: "1px solid #e3ddd1" }}>
            <div className="px-3 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid #ece7da" }}>
              <span className="text-[11px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.12em" }}>
                Quick Access
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              <ModuleCardMini title="Patients" stat={`${data.patientsToday} today`} icon={<Users size={16} strokeWidth={1.75} />} accentColor="#1f5a3a" href="/patients" />
              <ModuleCardMini title="Prescriptions" stat={`${data.rxToday} today`} icon={<Pill size={16} strokeWidth={1.75} />} accentColor="#5aa845" href="/prescriptions" />
              <ModuleCardMini title="Inventory" stat={`${data.activeItems} items`} icon={<Package size={16} strokeWidth={1.75} />} accentColor="#7a8a78" href="/inventory" />
              <ModuleCardMini title="Prescribers" stat={`${data.doctorsOnFile} on file`} icon={<Cross size={16} strokeWidth={1.75} />} accentColor="#d4a02a" href="/prescriptions/prescribers" />
              <ModuleCardMini title="Compounding" stat={`${data.pendingBatches} pending`} icon={<FlaskConical size={16} strokeWidth={1.75} />} accentColor="#9c4a25" href="/compounding" />
              <ModuleCardMini title="Reorder" stat={`${data.lowStockItems} low`} icon={<AlertTriangle size={16} strokeWidth={1.75} />} accentColor="#c54b3b" href="/inventory/reorder" />
              <ModuleCardMini title="POS" stat={`${data.salesToday} today`} icon={<DollarSign size={16} strokeWidth={1.75} />} accentColor="#174530" href="/pos" />
              <ModuleCardMini title="Claims" stat={`${data.rejectedClaims} rejected`} icon={<ClipboardCheck size={16} strokeWidth={1.75} />} accentColor="#3a6a8c" href="/billing/claims" />
              <ModuleCardMini title="Settings" stat="Admin" icon={<Settings size={16} strokeWidth={1.75} />} accentColor="#0f2e1f" href="/settings" />
            </div>
          </div>

          {/* Live Phone System */}
          <DashboardPhoneWidget />
        </div>

        {/* Column 3: Activity & Alerts */}
        <div className="space-y-4">
          {/* Recent Activity — live FillEvent feed (refreshes every 30s) */}
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#faf8f4", border: "1px solid #e3ddd1" }}>
            <div className="px-3 pt-3 pb-2" style={{ borderBottom: "1px solid #ece7da" }}>
              <span className="text-[11px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.12em" }}>
                Recent Activity
              </span>
            </div>
            <div>
              {recentActivity.length === 0 ? (
                <div className="px-3 py-4 text-center text-[11px] italic" style={{ color: "#7a8a78" }}>
                  No recent activity yet
                </div>
              ) : (
                recentActivity.map((item, i) => (
                  <Link
                    key={item.fillId}
                    href={`/queue/process/${item.fillId}`}
                    className="block px-3 py-2 no-underline transition-colors"
                    style={{ borderTop: i > 0 ? "1px solid #ece7da" : undefined }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f8f0"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold tabular-nums" style={{ color: "#1f5a3a" }}>
                        Rx# {item.rxNum}
                      </span>
                      <span className="text-[10px]" style={{ color: "#7a8a78" }}>
                        {item.minutesAgo < 60 ? `${item.minutesAgo}m` : `${Math.floor(item.minutesAgo / 60)}h`}
                      </span>
                    </div>
                    <div className="text-[12px] font-medium" style={{ color: "#14201a" }}>
                      {item.patient}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] truncate" style={{ color: "#3a4a3c" }}>
                        {item.eventLabel}
                        {item.performer && item.performer !== "—" && (
                          <span className="ml-1" style={{ color: "#7a8a78" }}>
                            · {item.performer}
                          </span>
                        )}
                      </div>
                      {item.copay && (
                        <span className="text-[11px] tabular-nums flex-shrink-0" style={{ color: "#7a8a78" }}>
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
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#faf8f4", border: "1px solid #e3ddd1" }}>
            <div className="px-3 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid #ece7da" }}>
              <span className="text-[11px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.12em" }}>
                Stock Alerts
              </span>
              <Link href="/inventory" className="text-[11px] font-medium hover:underline" style={{ color: "#1f5a3a" }}>
                View All
              </Link>
            </div>
            {allAlerts.length > 0 ? (
              <div>
                {allAlerts.map((item, i) => (
                  <Link
                    key={item.itemId}
                    href={`/inventory/${item.itemId}`}
                    className="block px-3 py-2 no-underline transition-colors"
                    style={{
                      borderTop: i > 0 ? "1px solid #ece7da" : undefined,
                      borderLeft: `3px solid ${item.severity === "critical" ? "#c54b3b" : "#d4a02a"}`,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f8f0"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                  >
                    <div
                      className="text-[12px] font-semibold truncate"
                      style={{ color: item.severity === "critical" ? "#c54b3b" : "#9c6a14" }}
                    >
                      {item.itemName}
                    </div>
                    <div className="text-[11px] tabular-nums" style={{ color: "#7a8a78" }}>
                      {item.currentStock} in stock
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-[11px]" style={{ color: "#7a8a78" }}>
                All stock levels healthy
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
