"use client";

import { useRealtimeMulti } from "@/hooks/useRealtime";

/**
 * Wraps dashboard pages to auto-refresh when key tables change.
 * Add this to the dashboard layout for global real-time updates.
 */
const WATCHED_TABLES = [
  "prescriptions",
  "prescription_fills",
  "patients",
  "batches",
  "shipments",
  "claims",
  "items",
  "item_lots",
  "intake_queue",
];

export default function RealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useRealtimeMulti(WATCHED_TABLES, {
    autoRefresh: true,
    debounceMs: 750,
  });

  return <>{children}</>;
}
