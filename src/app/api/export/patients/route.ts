import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { formatPatientForExport } from "@/lib/export";

/**
 * GET /api/export/patients
 * Export patients data as JSON
 * Query params: status, search
 */
export async function GET(req: NextRequest) {
  try {
    // Check permissions
    await requirePermission("patients", "read");

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    // Build where clause
    const where: Prisma.PatientWhereInput = {};

    if (status && status !== "all") {
      where.status = status;
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
