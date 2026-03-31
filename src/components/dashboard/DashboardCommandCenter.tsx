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
  FileX,
  ChevronRight,
  Zap,
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

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(n);
}

function KPIPill({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
      alert
        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
        : "bg-gray-50 dark:bg-gray-800 text-[var(--text-primary)] border border-[var(--border)] dark:border-gray-700"
    }`}>
      <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[9px] font-bold">{label}</span>
      <span className="tabular-nums font-bold">{value}</span>
    </div>
  );
}

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
      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors no-underline group"
    >
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">{icon}</span>
      <span className="text-[12px] font-medium text-[var(--text-primary)] dark:text-gray-300 flex-1 truncate group-hover:text-[var(--green-700)] dark:group-hover:text-emerald-400 transition-colors">
        {label}
      </span>
      <span className={`text-[11px] font-bold tabular-nums px-1.5 py-px rounded ${
        count > 0
          ? "bg-[var(--green-100)] dark:bg-emerald-900/40 text-[var(--green-700)] dark:text-emerald-400"
          : "text-gray-300 dark:text-gray-600"
      }`}>
        {count}
      </span>
      <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors" />
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
      className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg border border-[var(--border)] dark:border-gray-700 hover:border-[var(--green-700)] dark:hover:border-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all no-underline group"
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center text-white mb-0.5"
        style={{ backgroundColor: accentColor }}
      >
        {icon}
      </div>
      <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 text-center leading-tight group-hover:text-[var(--green-700)] dark:group-hover:text-emerald-400 transition-colors">
        {title}
      </span>
      <span className="text-[10px] font-bold tabular-nums text-gray-400 dark:text-gray-500">
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
  { status: "intake", label: "Intake", icon: <Inbox size={13} />, color: "#3b82f6" },
  { status: "sync", label: "Sync", icon: <ArrowDownUp size={13} />, color: "#06b6d4" },
  { status: "reject", label: "Reject", icon: <XCircle size={13} />, color: "#ef4444" },
  { status: "print", label: "Print", icon: <Printer size={13} />, color: "#a855f7" },
  { status: "scan", label: "Scan", icon: <ScanLine size={13} />, color: "#6366f1" },
  { status: "verify", label: "Verify", icon: <CheckCircle2 size={13} />, color: "#10b981" },
  { status: "oos", label: "Out of Stock", icon: <AlertTriangle size={13} />, color: "#f97316" },
  { status: "waiting_bin", label: "Waiting Bin", icon: <Clock size={13} />, color: "#f59e0b" },
  { status: "renewals", label: "Renewals", icon: <RefreshCw size={13} />, color: "#14b8a6" },
  { status: "todo", label: "Todo", icon: <ListTodo size={13} />, color: "#8b5cf6" },
  { status: "price_check", label: "Price Check", icon: <BadgeDollarSign size={13} />, color: "#ec4899" },
  { status: "prepay", label: "Prepay", icon: <CreditCard size={13} />, color: "#0ea5e9" },
  { status: "ok_to_charge", label: "OK to Charge", icon: <DollarSign size={13} />, color: "#22c55e" },
  { status: "decline", label: "Decline", icon: <ThumbsDown size={13} />, color: "#dc2626" },
  { status: "ok_to_charge_clinic", label: "OK to Charge Clinic", icon: <Building2 size={13} />, color: "#16a34a" },
  { status: "mochi", label: "Mochi", icon: <Cherry size={13} />, color: "#d946ef" },
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
      {/* KPI Strip */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <KPIPill label="Rx" value={data.rxToday} />
        <KPIPill label="Patients" value={data.patientsToday} />
        <KPIPill label="Revenue" value={formatCurrency(data.revenueToday)} />
        <KPIPill label="Sales" value={data.salesToday} />
        <KPIPill label="Active Items" value={data.activeItems.toLocaleString()} />
        <KPIPill label="Prescribers" value={data.doctorsOnFile.toLocaleString()} />
        <KPIPill label="Batches" value={data.pendingBatches} />
        <KPIPill label="Low Stock" value={data.lowStockItems} alert={data.lowStockItems > 0} />
        <KPIPill label="Rejected" value={data.rejectedClaims} alert={data.rejectedClaims > 0} />
        <KPIPill label="Refills" value={data.pendingRefills} />
        <KPIPill label="Expiring" value={data.expiringLots} />
      </div>

      {/* Three Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Workflow Queue — matches master QueueBar */}
        <div className="bg-[var(--card-bg)] dark:bg-gray-800/60 rounded-lg border border-[var(--border)] dark:border-gray-700 overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-[var(--border-light)] dark:border-gray-700 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Workflow Queue
            </span>
            <Link href="/queue" className="text-[9px] font-semibold text-[#40721D] dark:text-emerald-400 hover:underline">
              Open Queue
            </Link>
          </div>
          <div className="py-1 max-h-[520px] overflow-y-auto">
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
          <div className="bg-[var(--card-bg)] dark:bg-gray-800/60 rounded-lg border border-[var(--border)] dark:border-gray-700 overflow-hidden">
            <div className="px-3 pt-3 pb-2 border-b border-[var(--border-light)] dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Quick Access
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              <ModuleCardMini title="Patient" stat={`${data.patientsToday} today`} icon={<Users size={13} />} accentColor="#10b981" href="/patients" />
              <ModuleCardMini title="Rx" stat={`${data.rxToday} today`} icon={<Pill size={13} />} accentColor="#3b82f6" href="/prescriptions" />
              <ModuleCardMini title="Item" stat={`${data.activeItems}`} icon={<Package size={13} />} accentColor="#a855f7" href="/inventory" />
              <ModuleCardMini title="Prescriber" stat={`${data.doctorsOnFile}`} icon={<Cross size={13} />} accentColor="#f97316" href="/prescriptions/prescribers" />
              <ModuleCardMini title="Compound" stat={`${data.pendingBatches} pend`} icon={<FlaskConical size={13} />} accentColor="#f43f5e" href="/compounding" />
              <ModuleCardMini title="Inventory" stat={`${data.lowStockItems} low`} icon={<AlertTriangle size={13} />} accentColor="#f59e0b" href="/inventory" />
              <ModuleCardMini title="Sales" stat={`${data.salesToday} today`} icon={<DollarSign size={13} />} accentColor="#40721d" href="/pos" />
              <ModuleCardMini title="Claims" stat={`${data.rejectedClaims} rej`} icon={<ClipboardCheck size={13} />} accentColor="#6366f1" href="/billing/claims" />
              <ModuleCardMini title="System" stat="Admin" icon={<Settings size={13} />} accentColor="#14b8a6" href="/settings" />
            </div>
          </div>

          {/* Phone Dialer */}
          <PhoneDialer />
        </div>

        {/* Column 3: Activity & Alerts */}
        <div className="space-y-4">
          {/* Recent Activity */}
          <div className="bg-[var(--card-bg)] dark:bg-gray-800/60 rounded-lg border border-[var(--border)] dark:border-gray-700 overflow-hidden">
            <div className="px-3 pt-3 pb-2 border-b border-[var(--border-light)] dark:border-gray-700">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Recent Activity
              </span>
            </div>
            <div className="divide-y divide-[var(--border-light)] dark:divide-gray-700">
              {recentActivity.map((item) => (
                <div key={item.rxNum} className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[var(--green-700)] dark:text-emerald-400 tabular-nums">
                      Rx# {item.rxNum}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {item.minutesAgo < 60 ? `${item.minutesAgo}m` : `${Math.floor(item.minutesAgo / 60)}h`}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-[var(--text-primary)] dark:text-gray-300">
                    {item.patient}
                  </div>
                  <div className="text-[10px] text-gray-400 tabular-nums">{item.copay}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Alerts */}
          <div className="bg-[var(--card-bg)] dark:bg-gray-800/60 rounded-lg border border-[var(--border)] dark:border-gray-700 overflow-hidden">
            <div className="px-3 pt-3 pb-2 border-b border-[var(--border-light)] dark:border-gray-700 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Stock Alerts
              </span>
              <Link href="/inventory" className="text-[9px] font-semibold text-[#40721D] dark:text-emerald-400 hover:underline">
                View All
              </Link>
            </div>
            {allAlerts.length > 0 ? (
              <div className="divide-y divide-[var(--border-light)] dark:divide-gray-700">
                {allAlerts.map((item) => (
                  <Link
                    key={item.itemId}
                    href={`/inventory/${item.itemId}`}
                    className={`block px-3 py-2 no-underline border-l-[3px] hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      item.severity === "critical" ? "border-l-red-500" : "border-l-amber-500"
                    }`}
                  >
                    <div className={`text-[11px] font-semibold truncate ${
                      item.severity === "critical" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {item.itemName}
                    </div>
                    <div className="text-[10px] text-gray-400 tabular-nums">
                      {item.currentStock} in stock
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-[11px] text-gray-400 dark:text-gray-500">
                All stock levels healthy
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
