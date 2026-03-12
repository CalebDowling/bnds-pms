"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions {
  /** The Postgres table to subscribe to (e.g. "prescriptions") */
  table: string;
  /** Schema, defaults to "public" */
  schema?: string;
  /** Which events to listen for */
  event?: PostgresChangeEvent;
  /** Optional filter (e.g. "status=eq.ready") */
  filter?: string;
  /** Called when a matching change arrives */
  onEvent?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  /** If true, automatically call router.refresh() to refetch server data */
  autoRefresh?: boolean;
  /** Debounce refresh calls in ms (default 500) */
  debounceMs?: number;
}

/**
 * Subscribe to Supabase Realtime Postgres changes.
 * By default, auto-refreshes the current page's server data on any change.
 */
export function useRealtime({
  table,
  schema = "public",
  event = "*",
  filter,
  onEvent,
  autoRefresh = true,
  debounceMs = 500,
}: UseRealtimeOptions) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedRefresh = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      router.refresh();
    }, debounceMs);
  }, [router, debounceMs]);

  useEffect(() => {
    const supabase = createClient();

    const channelConfig: Record<string, string> = {
      event,
      schema,
      table,
    };
    if (filter) channelConfig.filter = filter;

    const channel: RealtimeChannel = supabase
      .channel(`realtime:${table}`)
      .on(
        "postgres_changes" as "system",
        channelConfig as unknown as { event: string; schema: string },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          onEvent?.(payload);
          if (autoRefresh) debouncedRefresh();
        }
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [table, schema, event, filter, onEvent, autoRefresh, debouncedRefresh]);
}

/**
 * Subscribe to multiple tables at once.
 * Useful for dashboard pages that display data from several sources.
 */
export function useRealtimeMulti(
  tables: string[],
  options?: Omit<UseRealtimeOptions, "table">
) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceMs = options?.debounceMs ?? 500;

  const debouncedRefresh = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      router.refresh();
    }, debounceMs);
  }, [router, debounceMs]);

  useEffect(() => {
    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    for (const table of tables) {
      const channelConfig: Record<string, string> = {
        event: options?.event ?? "*",
        schema: options?.schema ?? "public",
        table,
      };
      if (options?.filter) channelConfig.filter = options.filter;

      const channel = supabase
        .channel(`realtime:${table}`)
        .on(
          "postgres_changes" as "system",
          channelConfig as unknown as { event: string; schema: string },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            options?.onEvent?.(payload);
            if (options?.autoRefresh !== false) debouncedRefresh();
          }
        )
        .subscribe();

      channels.push(channel);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [tables.join(","), options?.event, options?.schema, options?.filter, options?.autoRefresh, debouncedRefresh]);
}
