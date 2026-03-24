"use client";

import { useEffect, useState } from "react";
import PinnedActions from "@/components/dashboard/PinnedActions";
import CardGrid, { type DashboardData } from "@/components/dashboard/CardGrid";
import RightRail from "@/components/dashboard/RightRail";
import PhoneDialer from "@/components/dashboard/PhoneDialer";

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

  useEffect(() => {
    getDashboardData().then(setData);
  }, []);

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
        </div>
        <div className="w-[280px] flex-shrink-0 space-y-4">
          <PhoneDialer />
          <RightRail />
        </div>
      </div>
    </div>
  );
}
