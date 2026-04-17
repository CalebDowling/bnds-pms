import { NextRequest, NextResponse } from "next/server";
import {
  extractApiKey,
  validateApiKey,
  hasScope,
  recordApiKeyUsage,
  logApiRequest,
  type ValidApiKey,
} from "./api-key";

/**
 * withApiAuth — wraps a /api/v1/* route handler with:
 *   1. API key extraction (X-BNDS-Key or Authorization: Bearer)
 *   2. Key validation (exists, not revoked, not expired)
 *   3. Scope check (resource:action)
 *   4. Per-key rate limit (simple in-memory sliding window)
 *   5. Request logging
 *
 * The wrapped handler receives a second argument: `{ apiKey, req }`.
 *
 * Usage:
 *   export const GET = withApiAuth(
 *     { resource: "patients", action: "read" },
 *     async (req, { apiKey }) => { ... }
 *   );
 */

// ─────────────────────────────────────────────────────────────────────────────
// In-memory rate limiter (per API key)
// ─────────────────────────────────────────────────────────────────────────────
// For production scale this should move to Redis (Upstash is already installed).
// For MVP this is fine on a single Vercel lambda region.

const DEFAULT_RATE_LIMIT_PER_MIN = 60;
const rateLimitState = new Map<string, number[]>();

function checkRateLimit(apiKeyId: string, limitPerMin: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - 60_000;
  const timestamps = rateLimitState.get(apiKeyId) ?? [];
  // Drop timestamps older than 1 min
  const recent = timestamps.filter((t) => t > windowStart);
  if (recent.length >= limitPerMin) {
    const oldest = recent[0];
    const retryAfterSec = Math.max(1, Math.ceil((60_000 - (now - oldest)) / 1000));
    rateLimitState.set(apiKeyId, recent);
    return { allowed: false, retryAfterSec };
  }
  recent.push(now);
  rateLimitState.set(apiKeyId, recent);
  return { allowed: true, retryAfterSec: 0 };
}

// Periodic cleanup — every 5 minutes, drop keys with no recent activity
// (avoid unbounded memory growth). Not perfect but good enough for MVP.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - 10 * 60_000;
    for (const [k, stamps] of rateLimitState.entries()) {
      if (stamps.length === 0 || stamps[stamps.length - 1] < cutoff) {
        rateLimitState.delete(k);
      }
    }
  }, 5 * 60_000).unref?.();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiAuthContext {
  apiKey: ValidApiKey;
  req: NextRequest;
}

export interface ApiScopeRequirement {
  resource: string;
  action: string;
}

export type ApiHandler = (
  req: NextRequest,
  ctx: ApiAuthContext
) => Promise<NextResponse> | NextResponse;

// ─────────────────────────────────────────────────────────────────────────────
// The wrapper
// ─────────────────────────────────────────────────────────────────────────────

export function withApiAuth(scope: ApiScopeRequirement, handler: ApiHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startedAt = Date.now();
    const method = req.method;
    const path = new URL(req.url).pathname;
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;
    const userAgent = req.headers.get("user-agent") ?? null;

    let apiKeyId: string | null = null;
    let statusCode = 500;
    let errorMessage: string | null = null;

    try {
      // 1. Extract key
      const plainKey = extractApiKey(req.headers);
      if (!plainKey) {
        statusCode = 401;
        return apiError(
          "missing_api_key",
          "Include your API key in the X-BNDS-Key header or Authorization: Bearer <key>.",
          401
        );
      }

      // 2. Validate
      const validation = await validateApiKey(plainKey);
      if (!validation.ok) {
        statusCode = validation.status;
        errorMessage = validation.reason;
        return apiError("invalid_api_key", validation.reason, validation.status);
      }
      apiKeyId = validation.key.id;

      // 3. Scope check
      if (!hasScope(validation.key.scopes, scope.resource, scope.action)) {
        statusCode = 403;
        errorMessage = `Missing scope ${scope.resource}:${scope.action}`;
        return apiError(
          "insufficient_scope",
          `Your API key does not have scope "${scope.resource}:${scope.action}".`,
          403
        );
      }

      // 4. Rate limit
      const limit = validation.key.rateLimitPerMin ?? DEFAULT_RATE_LIMIT_PER_MIN;
      const rl = checkRateLimit(validation.key.id, limit);
      if (!rl.allowed) {
        statusCode = 429;
        errorMessage = `Rate limit exceeded (${limit}/min)`;
        return NextResponse.json(
          {
            error: "rate_limit_exceeded",
            message: `You have exceeded the rate limit of ${limit} requests per minute. Retry after ${rl.retryAfterSec} seconds.`,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(rl.retryAfterSec),
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }

      // 5. Hand off to handler
      const response = await handler(req, { apiKey: validation.key, req });
      statusCode = response.status;

      // Attach standard response headers
      response.headers.set("X-RateLimit-Limit", String(limit));
      response.headers.set(
        "X-RateLimit-Remaining",
        String(Math.max(0, limit - (rateLimitState.get(validation.key.id)?.length ?? 0)))
      );
      response.headers.set("X-API-Version", "v1");

      // Fire-and-forget: usage tick
      recordApiKeyUsage(validation.key.id);

      return response;
    } catch (err) {
      statusCode = 500;
      errorMessage = err instanceof Error ? err.message : "Unknown error";
      return apiError("internal_error", "The server encountered an unexpected error.", 500);
    } finally {
      // Always log the request — fire-and-forget
      const durationMs = Date.now() - startedAt;
      logApiRequest({
        apiKeyId,
        method,
        path,
        statusCode,
        durationMs,
        ipAddress,
        userAgent,
        errorMessage,
      });
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Standardized error/response helpers
// ─────────────────────────────────────────────────────────────────────────────

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      error: code,
      message,
    },
    { status }
  );
}

export function apiOk<T>(data: T, meta?: Record<string, unknown>, init?: ResponseInit) {
  const body: Record<string, unknown> = { data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, init);
}
