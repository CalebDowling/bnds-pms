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
import { getQueueCounts } from "@/app/(dashboard)/dashboard/actions";
import type { DashboardData } from "@/components/dashboard/CardGrid";
import PhoneDialer from "@/components/dashboard/PhoneDialer";

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
      style={{ color: "var(--text-primary)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--green-50)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
    >
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
      <span style={{ color: "var(--text-muted)" }} className="flex-shrink-0">{icon}</span>
      <span className="text-[15px] font-medium flex-1 truncate" style={{ color: "var(--text-primary)" }}>
        {label}
      </span>
      <span
        className="text-[14px] font-bold tabular-nums px-1.5 py-px rounded"
        style={{
          backgroundColor: count > 0 ? "var(--green-100)" : undefined,
          color: count > 0 ? "var(--green-700)" : "var(--text-muted)",
        }}
      >
        {count}
      </span>
      <ChevronRight size={12} style={{ color: "var(--border)" }} />
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

function ModuleCardMini({ title, stat, icon, accentColor, href }: ModuleCardMiniProps) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg transition-all no-underline group"
      style={{ border: "1px solid var(--border)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-primary)";
        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--green-50)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.backgroundColor = "";
      }}
    >
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center text-white mb-0.5"
        style={{ backgroundColor: accentColor }}
      >
        {icon}
      </div>
      <span className="text-[12px] font-semibold text-center leading-tight" style={{ color: "var(--text-secondary)" }}>
        {title}
      </span>
      <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--text-muted)" }}>
        {stat}
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

  useEffect(() => {
    getReorderStatus()
      .then((result) => setStockAlerts({ critical: result.critical.slice(0, 3), low: result.low.slice(0, 4) }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    getQueueCounts()
      .then((counts) => setQueueCounts(counts as Record<string, number>))
      .catch(() => {});
    const interval = setInterval(() => {
      getQueueCounts()
        .then((counts) => setQueueCounts(counts as Record<string, number>))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const recentActivity = [
    { rxNum: "714367", patient: "Destini Broussard", copay: "$250.00", minutesAgo: 2 },
    { rxNum: "714360", patient: "Kayley Mancuso", copay: "$350.00", minutesAgo: 12 },
    { rxNum: "714355", patient: "Mary Johnson", copay: "$45.00", minutesAgo: 75 },
    { rxNum: "714348", patient: "John Davis", copay: "$120.00", minutesAgo: 130 },
  ];

  const allAlerts = [...stockAlerts.critical, ...stockAlerts.low];

  return (
    <div className="px-6 pb-6">
      {/* Three Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Workflow Queue */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}>
          <div className="px-3 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-light)" }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Workflow Queue
            </span>
            <Link href="/queue" className="text-[9px] font-semibold hover:underline" style={{ color: "var(--green-700)" }}>
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

        {/* Column 2: Quick Access + Phone Dialer */}
        <div className="space-y-4">
          {/* Quick Access Modules */}
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}>
            <div className="px-3 pt-3 pb-2" style={{ borderBottom: "1px solid var(--border-light)" }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Quick Access
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              <ModuleCardMini title="Patient" stat={`${data.patientsToday} today`} icon={<Users size={16} />} accentColor="#10b981" href="/patients" />
              <ModuleCardMini title="Rx" stat={`${data.rxToday} today`} icon={<Pill size={16} />} accentColor="#3b82f6" href="/prescriptions" />
              <ModuleCardMini title="Item" stat={`${data.activeItems}`} icon={<Package size={16} />} accentColor="#a855f7" href="/inventory" />
              <ModuleCardMini title="Prescriber" stat={`${data.doctorsOnFile}`} icon={<Cross size={16} />} accentColor="#f97316" href="/prescriptions/prescribers" />
              <ModuleCardMini title="Compound" stat={`${data.pendingBatches} pend`} icon={<FlaskConical size={16} />} accentColor="#f43f5e" href="/compounding" />
              <ModuleCardMini title="Inventory" stat={`${data.lowStockItems} low`} icon={<AlertTriangle size={16} />} accentColor="#f59e0b" href="/inventory" />
              <ModuleCardMini title="Sales" stat={`${data.salesToday} today`} icon={<DollarSign size={16} />} accentColor="#40721d" href="/pos" />
              <ModuleCardMini title="Claims" stat={`${data.rejectedClaims} rej`} icon={<ClipboardCheck size={16} />} accentColor="#6366f1" href="/billing/claims" />
              <ModuleCardMini title="System" stat="Admin" icon={<Settings size={16} />} accentColor="#14b8a6" href="/settings" />
            </div>
          </div>

          {/* Phone Dialer */}
          <PhoneDialer />
        </div>

        {/* Column 3: Activity & Alerts */}
        <div className="space-y-4">
          {/* Recent Activity */}
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}>
            <div className="px-3 pt-3 pb-2" style={{ borderBottom: "1px solid var(--border-light)" }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Recent Activity
              </span>
            </div>
            <div>
              {recentActivity.map((item, i) => (
                <div key={item.rxNum} className="px-3 py-2" style={{ borderTop: i > 0 ? "1px solid var(--border-light)" : undefined }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tabular-nums" style={{ color: "var(--green-700)" }}>
                      Rx# {item.rxNum}
                    </span>
                    <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                      {item.minutesAgo < 60 ? `${item.minutesAgo}m` : `${Math.floor(item.minutesAgo / 60)}h`}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                    {item.patient}
                  </div>
                  <div className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>{item.copay}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Alerts */}
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}>
            <div className="px-3 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-light)" }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Stock Alerts
              </span>
              <Link href="/inventory" className="text-[9px] font-semibold hover:underline" style={{ color: "var(--green-700)" }}>
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
                      borderTop: i > 0 ? "1px solid var(--border-light)" : undefined,
                      borderLeft: `3px solid ${item.severity === "critical" ? "#ef4444" : "#f59e0b"}`,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--green-50)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                  >
                    <div className={`text-[11px] font-semibold truncate ${
                      item.severity === "critical" ? "text-red-600" : "text-amber-600"
                    }`}>
                      {item.itemName}
                    </div>
                    <div className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {item.currentStock} in stock
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
                All stock levels healthy
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
