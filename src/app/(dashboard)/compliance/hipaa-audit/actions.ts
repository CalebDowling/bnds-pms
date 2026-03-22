"use server";

import {
  getAuditLog,
  getHIPAAStats,
  exportAuditLogsAsCSV,
  AuditLogFilter,
} from "@/lib/security/hipaa-audit";

export async function getHIPAAAuditLog(filters: AuditLogFilter) {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("Admin access required");
  }

  return await getAuditLog(filters);
}

export async function getHIPAAStatsData(startDate: Date, endDate: Date) {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("Admin access required");
  }

  return await getHIPAAStats(startDate, endDate);
}

export async function exportHIPAAAuditCSV(filters: AuditLogFilter) {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("Admin access required");
  }

  return await exportAuditLogsAsCSV(filters);
}
