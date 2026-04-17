"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useRealtimeMulti } from "@/hooks/useRealtime";

/**
 * Wraps dashboard pages with selective Supabase realtime subscriptions.
 *
 * PERF NOTE (April 2026 audit):
 * Previously this component subscribed to 9 tables on EVERY page, keeping
 * a permanent WebSocket open per user + firing re-renders across the whole
 * dashboard on every change to any row in any watched table.
 *
 * Now: subscribe ONLY to the tables relevant to the current route. A user
 * on /inventory no longer wakes up for every patient-update event, and the
 * /phone dashboard (which already has its own 5s poll) watches zero tables.
 */

const ROUTE_SUBSCRIPTIONS: Array<{ match: RegExp; tables: string[] }> = [
  // Queue + intake + dashboard need a lot of live signals
  { match: /^\/dashboard/, tables: ["prescriptions", "prescription_fills", "intake_queue"] },
  { match: /^\/queue/, tables: ["prescriptions", "prescription_fills"] },
  { match: /^\/intake/, tables: ["intake_queue", "prescriptions"] },

  // Patients / prescriptions / fills pages: their own records
  { match: /^\/patients/, tables: ["patients"] },
  { match: /^\/prescriptions/, tables: ["prescriptions", "prescription_fills"] },
  { match: /^\/refills/, tables: ["prescriptions"] },
  { match: /^\/pickup/, tables: ["prescription_fills"] },
  { match: /^\/waiting-bin/, tables: ["prescription_fills"] },

  // Inventory & compounding
  { match: /^\/inventory/, tables: ["items", "item_lots"] },
  { match: /^\/compounding/, tables: ["batches", "items"] },

  // Shipping & billing
  { match: /^\/shipping/, tables: ["shipments"] },
  { match: /^\/billing/, tables: ["claims"] },
  { match: /^\/pos/, tables: ["prescription_fills"] },

  // Phone has its own 5s poll — no realtime needed
  { match: /^\/phone/, tables: [] },

  // Settings, reports, analytics, users — no live updates needed
  { match: /^\/settings/, tables: [] },
  { match: /^\/reports/, tables: [] },
  { match: /^\/analytics/, tables: [] },
  { match: /^\/users/, tables: [] },
  { match: /^\/developers/, tables: [] },
];

/** Fallback set if no route rule matches — small and generic. */
const DEFAULT_TABLES: string[] = [];

export default function RealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tables = useMemo(() => {
    for (const rule of ROUTE_SUBSCRIPTIONS) {
      if (rule.match.test(pathname)) {
        return rule.tables;
      }
    }
    return DEFAULT_TABLES;
  }, [pathname]);

  useRealtimeMulti(tables, {
    autoRefresh: true,
    debounceMs: 750,
  });

  return <>{children}</>;
}
