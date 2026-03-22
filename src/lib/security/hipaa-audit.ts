import { prisma } from "@/lib/prisma";

export type HISTAuditAction =
  | "PHI_VIEW"
  | "PHI_EDIT"
  | "PHI_DELETE"
  | "PHI_EXPORT"
  | "RX_VIEW"
  | "RX_CREATE"
  | "RX_FILL"
  | "RX_TRANSFER"
  | "PATIENT_VIEW"
  | "PATIENT_CREATE"
  | "PATIENT_EDIT"
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "2FA_ENABLE"
  | "2FA_DISABLE"
  | "DATA_EXPORT";

/**
 * Log access to Protected Health Information (PHI)
 */
export async function logPHIAccess(
  userId: string,
  patientId: string,
  action: "view" | "edit" | "delete" | "export",
  details?: Record<string, any>
): Promise<void> {
  const actionMap: Record<string, HISTAuditAction> = {
    view: "PHI_VIEW",
    edit: "PHI_EDIT",
    delete: "PHI_DELETE",
    export: "PHI_EXPORT",
  };

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: actionMap[action],
        tableName: "patients",
        recordId: patientId,
        newValues: details ? JSON.stringify(details) : undefined,
        ipAddress: null, // Will be set by middleware if needed
        userAgent: null,
      },
    });
  } catch (error) {
    console.error("Failed to log PHI access:", error);
    // Non-critical — don't fail the request
  }
}

/**
 * Log prescription record access
 */
export async function logPrescriptionAccess(
  userId: string,
  rxId: string,
  action: "view" | "create" | "fill" | "transfer"
): Promise<void> {
  const actionMap: Record<string, HISTAuditAction> = {
    view: "RX_VIEW",
    create: "RX_CREATE",
    fill: "RX_FILL",
    transfer: "RX_TRANSFER",
  };

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: actionMap[action],
        tableName: "prescriptions",
        recordId: rxId,
      },
    });
  } catch (error) {
    console.error("Failed to log prescription access:", error);
  }
}

/**
 * Log when a patient record is viewed
 */
export async function logPatientRecordView(
  userId: string,
  patientId: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "PATIENT_VIEW",
        tableName: "patients",
        recordId: patientId,
      },
    });
  } catch (error) {
    console.error("Failed to log patient view:", error);
  }
}

/**
 * Log data exports for HIPAA compliance
 */
export async function logDataExport(
  userId: string,
  dataType: string,
  recordCount: number,
  details?: Record<string, any>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "DATA_EXPORT",
        tableName: dataType,
        recordId: `export_${Date.now()}`,
        newValues: JSON.stringify({
          recordCount,
          ...details,
        }),
      },
    });
  } catch (error) {
    console.error("Failed to log data export:", error);
  }
}

/**
 * Log authentication events (login, logout, failed login, 2FA)
 */
export async function logAuthEvent(
  userId: string,
  event: "login" | "logout" | "failed_login" | "2fa_enable" | "2fa_disable",
  ip?: string | null
): Promise<void> {
  const actionMap: Record<string, HISTAuditAction> = {
    login: "LOGIN",
    logout: "LOGOUT",
    failed_login: "LOGIN_FAILED",
    "2fa_enable": "2FA_ENABLE",
    "2fa_disable": "2FA_DISABLE",
  };

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: actionMap[event],
        tableName: "users",
        recordId: userId,
        ipAddress: ip || null,
      },
    });
  } catch (error) {
    console.error("Failed to log auth event:", error);
  }
}

export interface AuditLogFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: HISTAuditAction;
  patientId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get HIPAA audit logs with filtering
 */
export async function getAuditLog(filters: AuditLogFilter) {
  const {
    startDate,
    endDate,
    userId,
    action,
    patientId,
    limit = 100,
    offset = 0,
  } = filters;

  const where: any = {};

  if (startDate) {
    where.createdAt = { gte: startDate };
  }
  if (endDate) {
    if (where.createdAt) {
      where.createdAt.lte = endDate;
    } else {
      where.createdAt = { lte: endDate };
    }
  }
  if (userId) {
    where.userId = userId;
  }
  if (action) {
    where.action = action;
  }
  if (patientId) {
    where.recordId = patientId;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  const total = await prisma.auditLog.count({ where });

  return { logs, total };
}

/**
 * Get HIPAA audit statistics
 */
export async function getHIPAAStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalPHIAccesses: number;
  uniquePatients: number;
  dataExports: number;
  failedLogins: number;
  userCount: number;
}> {
  const where = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  const [
    totalPHIAccesses,
    dataExports,
    failedLogins,
  ] = await Promise.all([
    prisma.auditLog.count({
      where: {
        ...where,
        action: { in: ["PHI_VIEW", "PHI_EDIT", "PHI_DELETE", "PATIENT_VIEW"] },
      },
    }),
    prisma.auditLog.count({
      where: {
        ...where,
        action: "DATA_EXPORT",
      },
    }),
    prisma.auditLog.count({
      where: {
        ...where,
        action: "LOGIN_FAILED",
      },
    }),
  ]);

  // Count unique patients accessed
  const patientAccesses = await prisma.auditLog.findMany({
    where: {
      ...where,
      tableName: "patients",
      action: { in: ["PHI_VIEW", "PATIENT_VIEW"] },
    },
    select: { recordId: true },
    distinct: ["recordId"],
  });

  // Count unique users
  const users = await prisma.auditLog.findMany({
    where,
    select: { userId: true },
    distinct: ["userId"],
  });

  return {
    totalPHIAccesses,
    uniquePatients: patientAccesses.length,
    dataExports,
    failedLogins,
    userCount: users.length,
  };
}

/**
 * Export audit logs as CSV
 */
export async function exportAuditLogsAsCSV(filters: AuditLogFilter): Promise<string> {
  const { logs } = await getAuditLog({ ...filters, limit: 10000 });

  const headers = [
    "Timestamp",
    "User",
    "Email",
    "Action",
    "Table",
    "Record ID",
    "IP Address",
    "Details",
  ];

  const rows = logs.map((log) => [
    log.createdAt.toISOString(),
    log.user ? `${log.user.firstName} ${log.user.lastName}` : "Unknown",
    log.user?.email || "",
    log.action,
    log.tableName,
    log.recordId,
    log.ipAddress || "",
    log.newValues ? JSON.stringify(log.newValues) : "",
  ]);

  const csv = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return csv;
}
