/**
 * Simple in-memory cache utility with TTL (time-to-live) support.
 * Thread-safe for use in a single-threaded Node.js environment.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private timers = new Map<string, NodeJS.Timeout>();

  /**
   * Get a cached value if it exists and hasn't expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Store a value with optional TTL (in seconds).
   * Default TTL: 60 seconds for API responses, 300 seconds (5 min) for reference data.
   */
  set<T>(key: string, value: T, ttlSeconds: number = 60): void {
    // Clear any existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });

    // Schedule automatic cleanup
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);
  }

  /**
   * Remove a cached entry immediately.
   */
  delete(key: string): boolean {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
    return this.store.delete(key);
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Clear all entries
    this.store.clear();
  }

  /**
   * Get the size of the cache.
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Check if a key exists and hasn't expired.
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > (entry as CacheEntry<unknown>).expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }
}

// Export singleton instance
export const cache = new Cache();

// Export class for testing or custom instances
export default Cache;
