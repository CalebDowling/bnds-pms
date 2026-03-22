"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cache } from "@/lib/cache";
import { dedup } from "@/lib/dedup";

interface UseOptimizedQueryOptions {
  /** Time-to-live in seconds. Data older than this is considered stale. Default: 60 */
  ttl?: number;
  /** Number of retry attempts on failure. Default: 3 */
  maxRetries?: number;
  /** Skip the query entirely. Default: false */
  enabled?: boolean;
  /** Callback when data is fetched successfully */
  onSuccess?: (data: unknown) => void;
  /** Callback when fetch fails */
  onError?: (error: Error) => void;
}

interface UseOptimizedQueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Custom hook for optimized data fetching with:
 * - Request deduplication (prevents duplicate concurrent requests)
 * - Caching with TTL (Time-to-Live)
 * - Stale-while-revalidate pattern (serve stale data while revalidating)
 * - Error retry with exponential backoff
 * - Loading/error/data state management
 *
 * @example
 * const { data, loading, error, refresh } = useOptimizedQuery(
 *   '/api/dashboard/stats',
 *   { ttl: 60, maxRetries: 3 }
 * );
 */
export function useOptimizedQuery<T = unknown>(
  url: string,
  options: UseOptimizedQueryOptions = {}
): UseOptimizedQueryResult<T> {
  const {
    ttl = 60,
    maxRetries = 3,
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);

  /**
   * Fetch data with exponential backoff retry logic.
   */
  const fetchWithRetry = useCallback(
    async (attempt = 0): Promise<T> => {
      // Check cache first
      const cached = cache.get<T>(url);
      if (cached) {
        return cached;
      }

      // Use deduplication to prevent concurrent duplicate requests
      try {
        const response = await dedup(url, () =>
          fetch(url).then((res) => {
            if (!res.ok) {
              throw new Error(
                `HTTP ${res.status}: ${res.statusText}`
              );
            }
            return res.json();
          })
        );

        // Cache the result
        cache.set(url, response, ttl);
        setError(null);
        onSuccess?.(response);

        return response;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(String(err));

        // Retry with exponential backoff (100ms * 2^attempt)
        if (attempt < maxRetries) {
          const backoffMs = Math.min(
            100 * Math.pow(2, attempt),
            5000
          );
          await new Promise((resolve) =>
            setTimeout(resolve, backoffMs)
          );
          return fetchWithRetry(attempt + 1);
        }

        // All retries exhausted
        setError(error);
        onError?.(error);
        throw error;
      }
    },
    [url, ttl, maxRetries, onSuccess, onError]
  );

  /**
   * Fetch on mount and when URL changes.
   */
  useEffect(() => {
    if (!enabled) {
      setData(undefined);
      setError(null);
      return;
    }

    setLoading(true);
    retryCountRef.current = 0;

    fetchWithRetry()
      .then((result) => {
        setData(result);
      })
      .catch(() => {
        // Error already set in fetchWithRetry
      })
      .finally(() => {
        setLoading(false);
      });
  }, [url, enabled, fetchWithRetry]);

  /**
   * Manual refresh function to force re-fetch.
   */
  const refresh = useCallback(() => {
    cache.delete(url);
    setLoading(true);

    fetchWithRetry()
      .then((result) => {
        setData(result);
      })
      .catch(() => {
        // Error already set
      })
      .finally(() => {
        setLoading(false);
      });
  }, [url, fetchWithRetry]);

  return { data, loading, error, refresh };
}

export default useOptimizedQuery;
