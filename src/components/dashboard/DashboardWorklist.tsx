"use client";

import Link from "next/link";
import {
  Pill,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ChevronRight,
  Inbox,
  CheckCircle2,
  Clock,
  Package,
  UserPlus,
  ShoppingCart,
  Search,
  Settings,
  FileText,
} from "lucide-react";
import type { DashboardData } from "@/components/dashboard/CardGrid";
import RightRail from "@/components/dashboard/RightRail";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(n);
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <Minus size={13} className="text-gray-400" />;
  if (current > previous) return <TrendingUp size={13} className="text-emerald-500" />;
  if (current < previous) return <TrendingDown size={13} className="text-red-500" />;
  return <Minus size={13} className="text-gray-400" />;
}

interface KPICardProps {
  label: string;
  value: string | number;
  accentColor: string;
  icon: React.ReactNode;
  trend?: { current: number; previous: number };
  alert?: boolean;
}

function KPICard({ label, value, accentColor, icon, trend, alert }: KPICardProps) {
  return (
    <div
      className="bg-[var(--card-bg)] dark:bg-gray-800/60 rounded-lg border border-[var(--border)] dark:border-gray-700 px-4 py-3 flex items-center gap-3 min-w-0"
      style={{ borderLeftWidth: "3px", borderLeftColor: accentColor }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
        style={{ backgroundColor: accentColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
          {label}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xl font-bold tabular-nums ${alert ? "text-red-600 dark:text-red-400" : "text-[var(--text-primary)]"}`}>
            {value}
          </span>
          {trend && <TrendArrow current={trend.current} previous={trend.previous} />}
        </div>
      </div>
    </div>
  );
}

interface WorklistRowProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  count: number;
  href: string;
}

function WorklistRow({ icon, iconColor, title, count, href }: WorklistRowProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group no-underline border-b border-[var(--border-light)] dark:border-gray-700 last:border-b-0"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
        style={{ backgroundColor: iconColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-[var(--text-primary)] dark:text-gray-200 group-hover:text-[var(--green-700)] dark:group-hover:text-emerald-400 transition-colors">
          {title}
        </span>
      </div>
      <span
        className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
          count > 0
            ? "bg-[var(--green-100)] dark:bg-emerald-900/40 text-[var(--green-700)] dark:text-emerald-400"
            : "bg-gray-100 dark:bg-gray-700 text-gray-400"
        }`}
      >
        {count}
      </span>
      <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
    </Link>
  );
}

export default function DashboardWorklist({ data }: { data: DashboardData }) {
  const quickActions = [
    { href: "/patients/new", label: "New Patient", icon: <UserPlus size={14} /> },
    { href: "/prescriptions/new", label: "New Rx", icon: <Pill size={14} /> },
    { href: "/pos", label: "POS", icon: <ShoppingCart size={14} /> },
    { href: "/patients", label: "Find", icon: <Search size={14} /> },
  ];

  return (
    <div>
      {/* Quick Actions + Header Row */}
      <div className="flex items-center justify-between px-6 mb-4">
        <div className="flex items-center gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              title={a.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--green-100)] dark:bg-emerald-900/30 text-[var(--green-700)] dark:text-emerald-400 hover:bg-[var(--green-200)] dark:hover:bg-emerald-900/50 transition-colors no-underline"
            >
              {a.icon}
              <span className="hidden md:inline">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 px-6 mb-5">
        <KPICard
          label="Rx Today"
          value={data.rxToday}
          accentColor="#3b82f6"
          icon={<Pill size={16} />}
          trend={{ current: data.rxToday, previous: data.rxYesterday }}
        />
        <KPICard
          label="Revenue"
          value={formatCurrency(data.revenueToday)}
          accentColor="#40721d"
          icon={<DollarSign size={16} />}
        />
        <KPICard
          label="Low Stock"
          value={data.lowStockItems}
          accentColor="#f59e0b"
          icon={<AlertTriangle size={16} />}
          alert={data.lowStockItems > 0}
        />
        <KPICard
          label="Rejected Claims"
          value={data.rejectedClaims}
          accentColor="#ef4444"
          icon={<XCircle size={16} />}
          alert={data.rejectedClaims > 0}
        />
        <KPICard
          label="Pending Refills"
          value={data.pendingRefills}
          accentColor="#6366f1"
          icon={<RefreshCw size={16} />}
        />
      </div>

      {/* Two-Column Main Area */}
      <div className="flex gap-6 px-6 pb-6">
        {/* Left: Worklist */}
        <div className="flex-[3] min-w-0">
          <div className="bg-[var(--card-bg)] dark:bg-gray-800/60 rounded-lg border border-[var(--border)] dark:border-gray-700 overflow-hidden">
            <div className="px-4 pt-3.5 pb-2 border-b border-[var(--border-light)] dark:border-gray-700">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Your Worklist
              </h2>
            </div>
            <WorklistRow
              icon={<Inbox size={15} />}
              iconColor="#3b82f6"
              title="eRx Awaiting Entry"
              count={data.pendingRefills}
              href="/intake"
            />
            <WorklistRow
              icon={<CheckCircle2 size={15} />}
              iconColor="#10b981"
              title="Ready for Verification"
              count={data.rxToday}
              href="/queue?status=verify"
            />
            <WorklistRow
              icon={<Clock size={15} />}
              iconColor="#f59e0b"
              title="Waiting for Pickup"
              count={data.salesToday}
              href="/queue?status=waiting_bin"
            />
            <WorklistRow
              icon={<XCircle size={15} />}
              iconColor="#ef4444"
              title="Rejected Claims"
              count={data.rejectedClaims}
              href="/billing/claims"
            />
            <WorklistRow
              icon={<Package size={15} />}
              iconColor="#a855f7"
              title="Low Stock Items"
              count={data.lowStockItems}
              href="/inventory/reorder"
            />
            <WorklistRow
              icon={<RefreshCw size={15} />}
              iconColor="#6366f1"
              title="Pending Refills"
              count={data.pendingRefills}
              href="/prescriptions/batch-refills"
            />
            <WorklistRow
              icon={<Settings size={15} />}
              iconColor="#14b8a6"
              title="Expiring Lots (30 days)"
              count={data.expiringLots}
              href="/inventory?filter=expiring"
            />
          </div>
        </div>

        {/* Right: Activity + Alerts */}
        <div className="flex-[2] min-w-0 max-w-[320px]">
          <RightRail />
        </div>
      </div>
    </div>
  );
}
