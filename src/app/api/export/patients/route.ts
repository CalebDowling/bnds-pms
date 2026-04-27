import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { formatPatientForExport } from "@/lib/export";

/**
 * GET /api/export/patients
 * Export patients data as JSON
 * Query params: filter (all|recent|flagged|birthdays), search
 *               status (legacy: active|inactive|all)
 */
export async function GET(req: NextRequest) {
  try {
    // Check permissions
    await requirePermission("patients", "read");

    const searchParams = req.nextUrl.searchParams;
    const filter = searchParams.get("filter") || "all";
    const legacyStatus = searchParams.get("status");
    const search = searchParams.get("search") || "";

    // Build where clause
    let where: Prisma.PatientWhereInput;

    if (legacyStatus) {
      // Legacy behavior — bookmarks / saved exports that still pass status.
      where = {};
      if (legacyStatus !== "all") where.status = legacyStatus;
    } else {
      // New filter tabs always operate on the active patient set.
      where = { status: "active" };

      if (filter === "recent") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        where.createdAt = { gte: thirtyDaysAgo };
      } else if (filter === "flagged") {
        where.allergies = { some: { status: "active" } };
      } else if (filter === "birthdays") {
        // Match the dashboard tab logic: DOB month/day in current week.
        const now = new Date();
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const start = new Date(now);
        start.setDate(now.getDate() + diffToMonday);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const fmt = (d: Date) =>
          `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const startMD = fmt(start);
        const endMD = fmt(end);
        const wraps = startMD > endMD;

        const rows = wraps
          ? await prisma.$queryRaw<Array<{ id: string }>>`
              SELECT id::text AS id FROM patients
              WHERE status = 'active'
                AND (
                  to_char(date_of_birth, 'MM-DD') >= ${startMD}
                  OR to_char(date_of_birth, 'MM-DD') <= ${endMD}
                )
            `
          : await prisma.$queryRaw<Array<{ id: string }>>`
              SELECT id::text AS id FROM patients
              WHERE status = 'active'
                AND to_char(date_of_birth, 'MM-DD') BETWEEN ${startMD} AND ${endMD}
            `;
        where.id = { in: rows.length > 0 ? rows.map((r) => r.id) : ["__no_match__"] };
      }
    }

    if (search) {
      const terms = search.trim().split(/\s+/);
      if (terms.length === 1) {
        where.OR = [
          { firstName: { contains: terms[0], mode: "insensitive" } },
          { lastName: { contains: terms[0], mode: "insensitive" } },
          { mrn: { contains: terms[0], mode: "insensitive" } },
          { email: { contains: terms[0], mode: "insensitive" } },
          { phoneNumbers: { some: { number: { contains: terms[0] } } } },
        ];
      } else {
        where.AND = [
          { firstName: { contains: terms[0], mode: "insensitive" } },
          { lastName: { contains: terms[terms.length - 1], mode: "insensitive" } },
        ];
      }
    }

    // Fetch patients
    const patients = await prisma.patient.findMany({
      where,
      include: {
        phoneNumbers: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Format for export
    const exportData = patients.map(formatPatientForExport);

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export patients error:", error);

    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export patients" },
      { status: 500 }
    );
  }
}
