"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DashboardData } from "@/components/dashboard/CardGrid";

/**
 * Real-time dashboard data hook.
 * Subscribes to Supabase Realtime changes on key tables and
 * auto-refreshes dashboard counts when data changes.
 */
export function useRealtimeDashboard(
  initialData: DashboardData,
  refreshAction: () => Promise<DashboardData>
) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refresh = useCallback(async () => {
    try {
      const fresh = await refreshAction();
      setData(fresh);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[useRealtimeDashboard] refresh failed:", err);
    }
  }, [refreshAction]);

  // Debounced refresh — multiple rapid changes only trigger one fetch
  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(refresh, 1000);
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();

    // Watch prescription fills (affects rxToday, queue counts)
    const fillsSub = supabase
      .channel("dashboard-fills")
      .on("postgres_changes", { event: "*", schema: "public", table: "prescription_fills" }, debouncedRefresh)
      .subscribe();

    // Watch patients (affects patientsToday)
    const patientsSub = supabase
      .channel("dashboard-patients")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "patients" }, debouncedRefresh)
      .subscribe();

    // Watch claims (affects rejectedClaims)
    const claimsSub = supabase
      .channel("dashboard-claims")
      .on("postgres_changes", { event: "*", schema: "public", table: "claims" }, debouncedRefresh)
      .subscribe();

    // Watch POS transactions (affects salesToday, revenueToday)
    const posSub = supabase
      .channel("dashboard-pos")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pos_transactions" }, debouncedRefresh)
      .subscribe();

    // Fallback polling every 60s in case realtime misses events
    const interval = setInterval(refresh, 60000);

    return () => {
      clearInterval(interval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(fillsSub);
      supabase.removeChannel(patientsSub);
      supabase.removeChannel(claimsSub);
      supabase.removeChannel(posSub);
    };
  }, [debouncedRefresh, refresh]);

  return { data, lastUpdated, refresh };
}
