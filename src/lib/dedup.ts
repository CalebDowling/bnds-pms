/**
 * Request deduplication utility to prevent duplicate concurrent API calls.
 * Prevents double-clicks and race conditions by reusing promises for in-flight requests.
 */

type AsyncFunction = (...args: unknown[]) => Promise<unknown>;

interface PendingRequest {
  promise: Promise<unknown>;
  resolveTime: number;
}

class RequestDeduplicator {
  private pending = new Map<string, PendingRequest>();

  /**
   * Execute a function, reusing the promise if an identical request is already in-flight.
   * If a request completes within this call, it's immediately cleared from the pending map.
   * This prevents rapid re-requests before the deduplicator can clean them up naturally.
   *
   * @param key - Unique identifier for this request (e.g., "fetch:/api/dashboard")
   * @param fn - Async function to execute
   * @returns Promise that resolves/rejects with the function result
   */
  dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const pending = this.pending.get(key);

    // If already in-flight, reuse existing promise
    if (pending && Date.now() < pending.resolveTime + 50) {
      return pending.promise as Promise<T>;
    }

    // Start new request
    const promise = fn()
      .then((result) => {
        // Immediately remove on success
        this.pending.delete(key);
        return result;
      })
      .catch((error) => {
        // Immediately remove on error
        this.pending.delete(key);
        throw error;
      });

    // Store with resolve time marker
    this.pending.set(key, {
      promise,
      resolveTime: Date.now(),
    });

    return promise as Promise<T>;
  }

  /**
   * Manually clear a pending request.
   */
  clear(key: string): void {
    this.pending.delete(key);
  }

  /**
   * Clear all pending requests.
   */
  clearAll(): void {
    this.pending.clear();
  }

  /**
   * Get the number of in-flight requests.
   */
  size(): number {
    return this.pending.size;
  }
}

// Export singleton instance
export const deduplicator = new RequestDeduplicator();

/**
 * Convenience function for one-off deduplication.
 */
export function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return deduplicator.dedup(key, fn);
}

export default RequestDeduplicator;
