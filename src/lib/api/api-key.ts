import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * BNDS Public API — key generation, hashing, validation, and scope checks.
 *
 * Key format:  bnds_<env>_<32 random hex chars>
 *   env:  "live" or "test"
 *   Example: bnds_live_a1b2c3d4e5f67890abcdef1234567890
 *
 * Storage:
 *   - Full key value is NEVER stored. It is shown to the user exactly once,
 *     at creation time, and they are responsible for recording it.
 *   - We store the SHA-256 hex hash of the key for lookup/validation.
 *   - We store a non-secret "prefix" (first 16 chars) for UI display.
 *
 * Validation:
 *   - Incoming requests send the full key via `X-BNDS-Key` or `Authorization: Bearer`.
 *   - We SHA-256 hash it and look up by `keyHash`.
 *   - We check that the key is not revoked, not expired, and scoped for
 *     the requested resource/action.
 */

export type ApiKeyEnvironment = "live" | "test";

export interface ApiKeyScope {
  resource: string;
  action: string;
}

export interface GeneratedKey {
  /** The full plain-text key. ONLY shown once at creation. */
  plainKey: string;
  /** Public prefix (safe to display, e.g. "bnds_live_a1b2c3d4"). */
  prefix: string;
  /** SHA-256 hex hash of plainKey (what we store). */
  hash: string;
  /** Environment: "live" or "test". */
  environment: ApiKeyEnvironment;
}

/**
 * Generate a new API key with secure entropy.
 * Returns the plaintext key (show ONCE), hash (store), and prefix (display).
 */
export function generateApiKey(environment: ApiKeyEnvironment = "live"): GeneratedKey {
  // 32 hex chars = 128 bits of entropy. Sufficient for an API key.
  const secret = crypto.randomBytes(16).toString("hex");
  const plainKey = `bnds_${environment}_${secret}`;
  const hash = sha256Hex(plainKey);
  const prefix = plainKey.slice(0, 16); // "bnds_live_a1b2c3"
  return { plainKey, prefix, hash, environment };
}

/** SHA-256 hash as lowercase hex. */
export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Extract an API key from a Next.js request.
 *
 * Accepts both:
 *   - X-BNDS-Key: bnds_live_xxxx
 *   - Authorization: Bearer bnds_live_xxxx
 */
export function extractApiKey(headers: Headers): string | null {
  const direct = headers.get("x-bnds-key");
  if (direct) return direct.trim();

  const auth = headers.get("authorization");
  if (auth) {
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  return null;
}

export type ValidApiKey = {
  id: string;
  label: string;
  environment: string;
  scopes: string[];
  rateLimitPerMin: number | null;
  createdByUserId: string;
};

/**
 * Validate an API key. Returns the key record if valid, or a reason string
 * describing why it failed.
 *
 * Does NOT update lastUsedAt / usageCount — call `recordApiKeyUsage` after
 * a successful request.
 */
export async function validateApiKey(
  plainKey: string
): Promise<{ ok: true; key: ValidApiKey } | { ok: false; reason: string; status: number }> {
  if (!plainKey || typeof plainKey !== "string") {
    return { ok: false, reason: "Missing API key.", status: 401 };
  }
  if (!plainKey.startsWith("bnds_")) {
    return { ok: false, reason: "Invalid API key format.", status: 401 };
  }

  const hash = sha256Hex(plainKey);

  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    select: {
      id: true,
      label: true,
      environment: true,
      scopes: true,
      rateLimitPerMin: true,
      createdByUserId: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!key) {
    return { ok: false, reason: "API key not recognized.", status: 401 };
  }
  if (key.revokedAt) {
    return { ok: false, reason: "API key has been revoked.", status: 401 };
  }
  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "API key has expired.", status: 401 };
  }

  const scopes = Array.isArray(key.scopes) ? (key.scopes as string[]) : [];

  return {
    ok: true,
    key: {
      id: key.id,
      label: key.label,
      environment: key.environment,
      scopes,
      rateLimitPerMin: key.rateLimitPerMin,
      createdByUserId: key.createdByUserId,
    },
  };
}

/**
 * Check whether a key's scope list includes a specific resource:action.
 *
 * Supports wildcards:
 *   "*:*"            — all resources, all actions (super-admin key)
 *   "patients:*"     — all actions on patients
 *   "*:read"         — read on all resources
 *   "patients:read"  — exact match
 */
export function hasScope(scopes: string[], resource: string, action: string): boolean {
  if (!scopes.length) return false;
  const wanted = `${resource}:${action}`;
  for (const scope of scopes) {
    if (scope === wanted) return true;
    if (scope === "*:*") return true;
    const [r, a] = scope.split(":");
    if (r === "*" && a === action) return true;
    if (r === resource && a === "*") return true;
  }
  return false;
}

/**
 * Record a usage tick — updates lastUsedAt, increments usageCount.
 * Fire-and-forget; errors are swallowed so they don't fail the request.
 */
export async function recordApiKeyUsage(apiKeyId: string): Promise<void> {
  try {
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });
  } catch {
    // Non-critical. Swallow to avoid breaking the request.
  }
}

/**
 * Write an API request log entry. Fire-and-forget.
 * Pass a sanitized request body — do NOT log secrets or full PHI payloads.
 */
export async function logApiRequest(entry: {
  apiKeyId: string | null;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  try {
    await prisma.apiRequestLog.create({
      data: {
        apiKeyId: entry.apiKeyId ?? undefined,
        method: entry.method,
        path: entry.path.slice(0, 255),
        statusCode: entry.statusCode,
        durationMs: entry.durationMs,
        ipAddress: entry.ipAddress?.slice(0, 64) ?? undefined,
        userAgent: entry.userAgent?.slice(0, 500) ?? undefined,
        errorMessage: entry.errorMessage ?? undefined,
      },
    });
  } catch {
    // Logging failure should never break the actual API request.
  }
}
