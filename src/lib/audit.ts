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
    const finalNewValues = newValues || details;

    await prisma.auditLog.create({
      data: {
        userId,
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
