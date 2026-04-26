"use client";

// Note: `export const dynamic = "force-dynamic"` cannot live in a client
// component. The parent (dashboard) layout already sets it for the route
// group, so this page inherits force-dynamic correctly.

import { useEffect, useState } from "react";
import type { DashboardData } from "@/components/dashboard/CardGrid";
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

  // Quick Access counts (Patient / Rx / Item / Prescriber / Inventory etc.)
  // need to refresh after fill state changes. Because this page is a client
  // component, server-side revalidatePath('/dashboard') alone won't update
  // the in-memory state — we mirror the 30s refresh cadence DashboardCommandCenter
  // uses for queue counts so the Quick Access tiles stay in sync. Failed
  // fetches keep the previous values rather than blanking to zero.
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getDashboardData()
        .then((next) => {
          if (!cancelled) setData(next);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-6 py-2.5">
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
      </div>

      <DashboardCommandCenter data={data} />
    </div>
  );
}
