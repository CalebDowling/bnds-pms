/**
 * Audit logging utility for tracking user actions and system events
 *
 * Usage:
 *   await logAudit({
 *     userId: "user-id",
 *     action: "create",
 *     resource: "patients",
 *     resourceId: "patient-id",
 *     details: { firstName: "John", lastName: "Doe" },
 *     ipAddress: "192.168.1.1"
 *   });
 *
 * For system / webhook ingests with no human user, pass a string actor
 * name like "system-keragon" or "system-cron". logAudit() resolves
 * non-UUID userId values to a single shared "System" user row (lazily
 * upserted on first call) so the FK to users is satisfied. The original
 * actor name is preserved in newValues._actor so downstream tooling can
 * still tell *which* automated actor wrote the row.
 *
 * Background: AuditLog.userId is `@db.Uuid` with a FK to users.id.
 * Passing a literal string ("system-keragon") used to fail at insert
 * time with "Inconsistent column data: Error creating UUID" — and
 * because the call site swallows errors, every webhook-driven audit
 * row was silently dropped. This module preserves the audit trail
 * by mapping all system actors to one System user row.
 */

import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "VIEW"
  | "EXPORT"
  | "VERIFY";

export interface LogAuditParams {
  userId: string;
  action: AuditAction;
  resource: string; // Table name or resource type
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// ─── System-actor resolution ─────────────────────────────────────────
//
// AuditLog.userId is a UUID FK to users.id. Webhook / cron / migration
// audit calls pass a string actor name like "system-keragon"; without
// translation those fail UUID parse and the row is dropped. We lazily
// upsert a single "System" user row (isActive=false, can't log in)
// and route all non-UUID actor strings to it. The original actor
// string is preserved on the row in newValues._actor.

const SYSTEM_USER_UUID = "00000000-0000-0000-0000-000000000001";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let systemUserPromise: Promise<string> | null = null;

async function ensureSystemUser(): Promise<string> {
  // Cache the promise so concurrent webhook bursts don't all upsert.
  if (systemUserPromise) return systemUserPromise;
  systemUserPromise = (async () => {
    try {
      await prisma.user.upsert({
        where: { id: SYSTEM_USER_UUID },
        update: {},
        create: {
          id: SYSTEM_USER_UUID,
          supabaseId: "system-actor",
          email: "system@bndsrx.local",
          firstName: "System",
          lastName: "Actor",
          isActive: false,
        },
      });
      return SYSTEM_USER_UUID;
    } catch (err) {
      // Reset so the next call retries — don't permanently poison
      // the cache because of a transient connection blip.
      systemUserPromise = null;
      throw err;
    }
  })();
  return systemUserPromise;
}

/**
 * Resolve a userId / actor string to a UUID that AuditLog can accept.
 * Real UUIDs pass through; everything else (e.g. "system-keragon",
 * "system-cron", or "unknown") routes to the shared System user.
 *
 * Returns the resolved UUID and the original actor label (or null
 * if it was already a UUID) so the caller can stamp _actor onto
 * newValues.
 */
async function resolveActor(
  userId: string
): Promise<{ uuid: string; actor: string | null }> {
  if (UUID_RE.test(userId)) return { uuid: userId, actor: null };
  const uuid = await ensureSystemUser();
  return { uuid, actor: userId };
}

/**
 * Log an audit event to the database
 * This is safe to call even if it fails (errors are logged but not thrown)
 */
export async function logAudit({
  userId,
  action,
  resource,
  resourceId,
  oldValues,
  newValues,
  details,
  ipAddress,
  userAgent,
}: LogAuditParams): Promise<void> {
  try {
    // If neither oldValues nor newValues provided, use details as newValues
    const baseNewValues = newValues || details;

    // Resolve string actors (e.g. "system-keragon") to the System user
    // UUID so the FK passes. Stamp the original actor onto _actor so
    // downstream queries can still tell which automated actor wrote
    // the row.
    const { uuid, actor } = await resolveActor(userId);
    const finalNewValues = actor
      ? { ...(baseNewValues || {}), _actor: actor }
      : baseNewValues;

    await prisma.auditLog.create({
      data: {
        userId: uuid,
        action: action.slice(0, 10), // Ensure it fits in VARCHAR(10)
        tableName: resource,
        recordId: resourceId || "unknown",
        oldValues: oldValues || undefined,
        newValues: finalNewValues || undefined,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    // Log but don't throw - audit failures shouldn't break the main action
    console.error("Failed to log audit event:", {
      userId,
      action,
      resource,
      resourceId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Log a user login event
 */
export async function logLogin(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  return logAudit({
    userId,
    action: "LOGIN",
    resource: "auth",
    ipAddress,
    userAgent,
  });
}

/**
 * Log a user logout event
 */
export async function logLogout(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  return logAudit({
    userId,
    action: "LOGOUT",
    resource: "auth",
    ipAddress,
    userAgent,
  });
}

/**
 * Log a data export event
 */
export async function logExport(
  userId: string,
  resource: string,
  details?: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  return logAudit({
    userId,
    action: "EXPORT",
    resource,
    details: {
      exportedAt: new Date().toISOString(),
      ...details,
    },
    ipAddress,
  });
}

/**
 * Log a resource creation event
 */
export async function logCreate(
  userId: string,
  resource: string,
  resourceId: string,
  newValues: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  return logAudit({
    userId,
    action: "CREATE",
    resource,
    resourceId,
    newValues,
    ipAddress,
  });
}

/**
 * Log a resource update event
 */
export async function logUpdate(
  userId: string,
  resource: string,
  resourceId: string,
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  return logAudit({
    userId,
    action: "UPDATE",
    resource,
    resourceId,
    oldValues,
    newValues,
    ipAddress,
  });
}

/**
 * Log a resource deletion event
 */
export async function logDelete(
  userId: string,
  resource: string,
  resourceId: string,
  oldValues?: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  return logAudit({
    userId,
    action: "DELETE",
    resource,
    resourceId,
    oldValues,
    ipAddress,
  });
}

/**
 * Extract client IP from NextRequest headers
 */
export function extractClientIp(headers: Headers): string | undefined {
  // Try common headers in order of preference
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("client-ip");

  return ip || undefined;
}

/**
 * Extract user agent from headers
 */
export function extractUserAgent(headers: Headers): string | undefined {
  return headers.get("user-agent") || undefined;
}
