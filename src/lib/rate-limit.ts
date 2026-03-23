/**
 * In-memory rate limiter with sliding window
 */

interface RateLimit {
  attempts: number[];
  blocked: boolean;
  blockedUntil?: number;
}

class RateLimiter {
  private store = new Map<string, RateLimit>();
  private windowMs: number;
  private maxAttempts: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(windowMs: number = 15 * 60 * 1000, maxAttempts: number = 10) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;

    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request should be allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    let limit = this.store.get(identifier);

    // Create new entry if doesn't exist
    if (!limit) {
      limit = {
        attempts: [now],
        blocked: false,
      };
      this.store.set(identifier, limit);
      return true;
    }

    // Check if currently blocked
    if (limit.blocked && limit.blockedUntil && now < limit.blockedUntil) {
      return false;
    }

    // Unblock if time has passed
    if (limit.blocked && limit.blockedUntil && now >= limit.blockedUntil) {
      limit.blocked = false;
      limit.blockedUntil = undefined;
      limit.attempts = [];
    }

    // Remove attempts outside the sliding window
    limit.attempts = limit.attempts.filter((time) => now - time < this.windowMs);

    // Check if over limit
    if (limit.attempts.length >= this.maxAttempts) {
      limit.blocked = true;
      limit.blockedUntil = now + this.windowMs;
      return false;
    }

    // Add current attempt
    limit.attempts.push(now);
    return true;
  }

  /**
   * Get current attempt count for identifier
   */
  getAttemptCount(identifier: string): number {
    const now = Date.now();
    const limit = this.store.get(identifier);

    if (!limit) {
      return 0;
    }

    // Filter valid attempts within window
    const validAttempts = limit.attempts.filter(
      (time) => now - time < this.windowMs
    );
    return validAttempts.length;
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.store.forEach((limit, key) => {
      // Remove if no recent attempts and not blocked
      if (
        limit.attempts.length === 0 &&
        (!limit.blocked || (limit.blockedUntil && now > limit.blockedUntil + this.windowMs))
      ) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.store.delete(key));
  }

  /**
   * Destroy the limiter
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Create singleton instances for different endpoints
const loginLimiter = new RateLimiter(15 * 60 * 1000, 10); // 15 min window, 10 attempts
const registerLimiter = new RateLimiter(15 * 60 * 1000, 5); // 15 min window, 5 attempts

/**
 * Extract IP address from request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Check rate limit for login endpoint
 */
export function checkLoginRateLimit(request: Request): boolean {
  const ip = getClientIp(request);
  return loginLimiter.isAllowed(`login:${ip}`);
}

/**
 * Check rate limit for register endpoint
 */
export function checkRegisterRateLimit(request: Request): boolean {
  const ip = getClientIp(request);
  return registerLimiter.isAllowed(`register:${ip}`);
}

/**
 * Get attempt count for login endpoint
 */
export function getLoginAttemptCount(request: Request): number {
  const ip = getClientIp(request);
  return loginLimiter.getAttemptCount(`login:${ip}`);
}

/**
 * Get attempt count for register endpoint
 */
export function getRegisterAttemptCount(request: Request): number {
  const ip = getClientIp(request);
  return registerLimiter.getAttemptCount(`register:${ip}`);
}

/**
 * Reset login rate limit for IP
 */
export function resetLoginRateLimit(request: Request): void {
  const ip = getClientIp(request);
  loginLimiter.reset(`login:${ip}`);
}

/**
 * Reset register rate limit for IP
 */
export function resetRegisterRateLimit(request: Request): void {
  const ip = getClientIp(request);
  registerLimiter.reset(`register:${ip}`);
}
