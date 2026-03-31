"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/components/dashboard/CardGrid";
import DashboardStyleSwitcher, {
  useDashboardStyle,
} from "@/components/dashboard/DashboardStyleSwitcher";
import DashboardWorklist from "@/components/dashboard/DashboardWorklist";
import DashboardAnalytics from "@/components/dashboard/DashboardAnalytics";
import DashboardCommandCenter from "@/components/dashboard/DashboardCommandCenter";

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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);
  const [dashStyle, setDashStyle] = useDashboardStyle();

  useEffect(() => {
    getDashboardData().then(setData);
  }, []);

  return (
    <div>
      {/* Breadcrumb + Style Switcher */}
      <div className="px-6 py-2.5 flex items-center justify-between">
        <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
          <a
            href="/dashboard"
            className="text-[var(--green-700)] no-underline font-medium hover:underline"
          >
            Home
          </a>
          <span className="text-[#c5d5c9]">&rsaquo;</span>
          <span className="text-[var(--text-secondary)] font-semibold">
            Dashboard
          </span>
        </div>
        <DashboardStyleSwitcher current={dashStyle} onChange={setDashStyle} />
      </div>

      {/* Render selected dashboard style */}
      {dashStyle === "worklist" && <DashboardWorklist data={data} />}
      {dashStyle === "analytics" && <DashboardAnalytics data={data} />}
      {dashStyle === "command-center" && <DashboardCommandCenter data={data} />}
    </div>
  );
}
