import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/audit-logs
 * Retrieve paginated audit logs with filtering and search
 *
 * Query parameters:
 *   - page: number (default 1)
 *   - limit: number (default 50, max 100)
 *   - action: string (filter by action type: create, update, delete, login, logout, view, export)
 *   - resource: string (filter by resource/table name)
 *   - userId: string (filter by user ID)
 *   - dateFrom: ISO 8601 date string
 *   - dateTo: ISO 8601 date string
 *   - search: string (search in oldValues/newValues JSON)
 */
export async function GET(req: NextRequest) {
  try {
    // Require admin permission to view audit logs
    await requirePermission("settings", "admin");

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const action = searchParams.get("action");
    const resource = searchParams.get("resource");
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    // Build where clause for filtering
    const where: any = {};

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
        // Add 1 day to make "to" date inclusive
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1);
        where.createdAt.lt = toDate;
      }
    }

    // Search in JSON fields (simplified - searches in stringified JSON)
    if (search) {
      where.OR = [
        {
          newValues: {
            search: search.toLowerCase(),
          },
        },
        {
          oldValues: {
            search: search.toLowerCase(),
          },
        },
        {
          tableName: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Get total count for pagination
    const total = await prisma.auditLog.count({ where });

    // Fetch audit logs with user info
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
      skip: (page - 1) * limit,
      take: limit,
    });

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      data: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        user: log.user,
        action: log.action,
        tableName: log.tableName,
        recordId: log.recordId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);

    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json(
        { error: "Unauthorized: Admin permission required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
