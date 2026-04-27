"use client";

// Note: `export const dynamic = "force-dynamic"` cannot live in a client
// component. The parent (dashboard) layout already sets it for the route
// group, so this page inherits force-dynamic correctly.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { DashboardData } from "@/components/dashboard/CardGrid";
import DashboardCommandCenter from "@/components/dashboard/DashboardCommandCenter";
import { PageHeader } from "@/components/ui/bnds";

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
      {/* BNDS PMS Redesign — page header pattern (eyebrow + serif h1 + subtitle) */}
      <PageHeader
        eyebrow="Today"
        title="Pharmacy command center"
        subtitle={`${data.rxToday} new Rx · ${data.patientsToday} patients · ${data.lowStockItems} low stock`}
        actions={
          <Link
            href="/prescriptions/new"
            className="inline-flex items-center gap-1.5 rounded-md font-semibold no-underline transition-colors"
            style={{
              backgroundColor: "#1f5a3a",
              color: "#ffffff",
              border: "1px solid #1f5a3a",
              padding: "7px 13px",
              fontSize: 13,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#174530";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#1f5a3a";
            }}
          >
            <Plus size={14} strokeWidth={2} />
            New Rx
          </Link>
        }
      />

      <DashboardCommandCenter data={data} />
    </div>
  );
}
