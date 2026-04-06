import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { formatAuditLogForExport } from "@/lib/export";

/**
 * GET /api/export/audit-logs
 * Export audit logs as JSON
 * Query params: action, resource, userId, dateFrom, dateTo, search
 */
export async function GET(req: NextRequest) {
  try {
    // Check permissions
    await requirePermission("settings", "admin");

    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get("action");
    const resource = searchParams.get("resource");
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {};

    if (action) {
      where.action = action.toUpperCase();
    }

    if (resource) {
      where.tableName = {
        contains: resource,
        mode: "insensitive",
      };
    }

    if (userId) {
      where.userId = userId;
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1);
        where.createdAt.lt = toDate;
      }
    }

    // Search in JSON fields
    if (search) {
      where.OR = [
        {
          newValues: {
            string_contains: search.toLowerCase(),
          } as any,
        },
        {
          oldValues: {
            string_contains: search.toLowerCase(),
          } as any,
        },
        {
          tableName: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Fetch all audit logs with the filters (no pagination for export)
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format for export
    const exportData = formatAuditLogForExport(logs);

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Error exporting audit logs:", error);

    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json(
        { error: "Unauthorized: Admin permission required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export audit logs" },
      { status: 500 }
    );
  }
}
