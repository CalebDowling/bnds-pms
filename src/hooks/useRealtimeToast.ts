"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface Toast {
  id: string;
  message: string;
  type: "info" | "success" | "warning";
  timestamp: number;
}

/**
 * Listens for prescription status changes and new intake items,
 * and produces toast notifications for the dashboard.
 */
export function useRealtimeToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, timestamp: Date.now() }]);
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    // Prescription status changes
    const rxChannel = supabase
      .channel("toast:prescriptions")
      .on(
        "postgres_changes" as "system",
        { event: "UPDATE", schema: "public", table: "prescriptions" } as unknown as { event: string; schema: string },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const newStatus = payload.new?.status as string;
          const rxNumber = payload.new?.rx_number as string;
          if (newStatus === "ready") {
            addToast(`Rx #${rxNumber} is ready for pickup`, "success");
          } else if (newStatus === "on_hold") {
            addToast(`Rx #${rxNumber} placed on hold`, "warning");
          }
        }
      )
      .subscribe();
    channels.push(rxChannel);

    // New intake queue items
    const intakeChannel = supabase
      .channel("toast:intake")
      .on(
        "postgres_changes" as "system",
        { event: "INSERT", schema: "public", table: "intake_queue" } as unknown as { event: string; schema: string },
        () => {
          addToast("New prescription in intake queue", "info");
        }
      )
      .subscribe();
    channels.push(intakeChannel);

    // Low stock alerts
    const lotChannel = supabase
      .channel("toast:lots")
      .on(
        "postgres_changes" as "system",
        { event: "UPDATE", schema: "public", table: "item_lots" } as unknown as { event: string; schema: string },
        (payload: { new: Record<string, unknown> }) => {
          const qty = Number(payload.new?.quantity_on_hand ?? 0);
          if (qty <= 0) {
            addToast("Inventory lot depleted — check stock levels", "warning");
          }
        }
      )
      .subscribe();
    channels.push(lotChannel);

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [addToast]);

  return { toasts, dismissToast };
}
