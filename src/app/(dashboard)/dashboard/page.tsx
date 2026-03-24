"use client";

import { useEffect, useState, ReactNode } from "react";
import PinnedActions from "@/components/dashboard/PinnedActions";
import CardGrid, { type DashboardData } from "@/components/dashboard/CardGrid";
import RightRail from "@/components/dashboard/RightRail";
import PhoneDialer from "@/components/dashboard/PhoneDialer";
import WidgetSystem from "@/components/dashboard/WidgetSystem";
import {
  BarChart3,
  Activity,
  Bell,
  Clock,
  TrendingUp,
  Package,
  Users,
  Pill,
  AlertTriangle,
} from "lucide-react";

import { getDashboardData } from "./actions";

const DEFAULT_DATA: DashboardData = {
  patientsToday: 0,
  rxToday: 0,
  rxYesterday: 0,
  activeItems: 0,
  doctorsOnFile: 0,
  pendingBatches: 0,
  lowStockItems: 0,
  salesToday: 0,
  revenueToday: 0,
  pendingRefills: 0,
  expiringLots: 0,
  rejectedClaims: 0,
};

// Simple placeholder widget content (replace with real data as needed)
function WidgetPlaceholder({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-[var(--text-muted)]">
      <div className="mb-2 opacity-40">{icon}</div>
      <p className="text-xs">{message}</p>
    </div>
  );
}

function MiniStatRow({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-light)] last:border-0">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="text-sm font-bold" style={{ color: color || "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);

  useEffect(() => {
    getDashboardData().then(setData);
  }, []);

  function renderWidget(type: string, size: "sm" | "md" | "lg"): ReactNode {
    switch (type) {
      case "queue-overview":
        return (
          <div>
            <MiniStatRow label="Print Queue" value={data.rxToday} color="#3b82f6" />
            <MiniStatRow label="Pending Refills" value={data.pendingRefills} color="#f59e0b" />
            <MiniStatRow label="Compounding" value={data.pendingBatches} color="#f43f5e" />
          </div>
        );
      case "daily-chart":
        return (
          <div className="flex items-end gap-1 h-16">
            {[40, 65, 45, 80, 55, 90, data.rxToday > 0 ? 70 : 20].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${h}%`,
                  background: i === 6 ? "var(--theme-accent, #40721d)" : "var(--theme-accent-10, rgba(64,114,29,0.1))",
                  transition: "height 0.3s ease",
                }}
              />
            ))}
          </div>
        );
      case "alerts":
        return (
          <div>
            {data.lowStockItems > 0 && (
              <div className="flex items-center gap-2 py-1.5 text-xs">
                <AlertTriangle size={12} className="text-amber-500" />
                <span className="text-[var(--text-secondary)]">{data.lowStockItems} low stock items</span>
              </div>
            )}
            {data.rejectedClaims > 0 && (
              <div className="flex items-center gap-2 py-1.5 text-xs">
                <AlertTriangle size={12} className="text-red-500" />
                <span className="text-[var(--text-secondary)]">{data.rejectedClaims} rejected claims</span>
              </div>
            )}
            {data.expiringLots > 0 && (
              <div className="flex items-center gap-2 py-1.5 text-xs">
                <Clock size={12} className="text-orange-500" />
                <span className="text-[var(--text-secondary)]">{data.expiringLots} expiring lots</span>
              </div>
            )}
            {data.lowStockItems === 0 && data.rejectedClaims === 0 && data.expiringLots === 0 && (
              <p className="text-xs text-[var(--text-muted)] py-2 text-center">All clear!</p>
            )}
          </div>
        );
      case "recent-activity":
        return <WidgetPlaceholder icon={<Clock size={24} />} message="Recent fills will appear here" />;
      case "revenue-trend":
        return (
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              ${data.revenueToday.toLocaleString()}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Today&apos;s revenue</p>
            <div className="flex items-end gap-1 h-10 mt-3">
              {[30, 50, 40, 70, 55, 80, 65].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${h}%`,
                    background: i === 6 ? "#10b981" : "rgba(16,185,129,0.15)",
                  }}
                />
              ))}
            </div>
          </div>
        );
      case "low-stock":
        return (
          <div>
            <div className="text-3xl font-bold text-amber-500">{data.lowStockItems}</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Items need reorder</p>
          </div>
        );
      case "top-patients":
        return (
          <div>
            <MiniStatRow label="Patients Today" value={data.patientsToday} color="#10b981" />
            <MiniStatRow label="Doctors on File" value={data.doctorsOnFile} color="#f97316" />
          </div>
        );
      case "rx-pipeline":
        return (
          <div>
            <MiniStatRow label="Rx Today" value={data.rxToday} color="#3b82f6" />
            <MiniStatRow label="Sales Today" value={data.salesToday} color="#40721d" />
            <MiniStatRow label="Active Items" value={data.activeItems} color="#a855f7" />
          </div>
        );
      default:
        return <WidgetPlaceholder icon={<BarChart3 size={24} />} message="Widget content" />;
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-6 py-2.5 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
        <a href="/dashboard" className="text-[var(--green-700)] no-underline font-medium hover:underline">Home</a>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <span className="text-[var(--text-secondary)] font-semibold">Dashboard</span>
      </div>

      <PinnedActions />

      <div className="flex px-6 pt-3 pb-6 gap-6">
        <div className="flex-1">
          <CardGrid data={data} />
          <WidgetSystem renderWidget={renderWidget} />
        </div>
        <div className="w-[280px] flex-shrink-0 space-y-4">
          <PhoneDialer />
          <RightRail />
        </div>
      </div>
    </div>
  );
}
