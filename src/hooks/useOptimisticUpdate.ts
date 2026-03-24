"use client";

import { useState, useCallback } from "react";

/**
 * Generic optimistic update hook.
 * Immediately applies the update to local state, then syncs with server.
 * Rolls back on error.
 */
export function useOptimisticUpdate<T>(initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimisticUpdate = useCallback(
    async (
      optimisticValue: T,
      serverAction: () => Promise<T | void>,
      rollbackValue?: T
    ) => {
      const previousValue = rollbackValue ?? value;

      // Apply optimistic update immediately
      setValue(optimisticValue);
      setIsLoading(true);
      setError(null);

      try {
        const result = await serverAction();
        // If server returns a value, use it (source of truth)
        if (result !== undefined) {
          setValue(result);
        }
      } catch (err) {
        // Rollback on error
        setValue(previousValue);
        setError(err instanceof Error ? err.message : "Update failed");
      } finally {
        setIsLoading(false);
      }
    },
    [value]
  );

  return { value, setValue, isLoading, error, optimisticUpdate };
}

/**
 * Optimistic list update — for adding/removing/updating items in a list.
 */
export function useOptimisticList<T extends { id: string }>(initialItems: T[]) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const optimisticAdd = useCallback(
    async (item: T, serverAction: () => Promise<T | void>) => {
      setItems((prev) => [...prev, item]);
      setPendingIds((prev) => new Set(prev).add(item.id));

      try {
        const result = await serverAction();
        if (result) {
          setItems((prev) => prev.map((i) => (i.id === item.id ? result : i)));
        }
      } catch {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    []
  );

  const optimisticRemove = useCallback(
    async (id: string, serverAction: () => Promise<void>) => {
      const removed = items.find((i) => i.id === id);
      setItems((prev) => prev.filter((i) => i.id !== id));

      try {
        await serverAction();
      } catch {
        if (removed) {
          setItems((prev) => [...prev, removed]);
        }
      }
    },
    [items]
  );

  const optimisticUpdate = useCallback(
    async (id: string, updates: Partial<T>, serverAction: () => Promise<T | void>) => {
      const original = items.find((i) => i.id === id);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
      );
      setPendingIds((prev) => new Set(prev).add(id));

      try {
        const result = await serverAction();
        if (result) {
          setItems((prev) => prev.map((i) => (i.id === id ? result : i)));
        }
      } catch {
        if (original) {
          setItems((prev) => prev.map((i) => (i.id === id ? original : i)));
        }
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [items]
  );

  return { items, setItems, pendingIds, optimisticAdd, optimisticRemove, optimisticUpdate };
}
