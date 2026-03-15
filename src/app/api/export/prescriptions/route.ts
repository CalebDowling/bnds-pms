import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { formatPrescriptionForExport } from "@/lib/export";

/**
 * GET /api/export/prescriptions
 * Export prescriptions data as JSON
 * Query params: status, search
 */
export async function GET(req: NextRequest) {
  try {
    // Check permissions
    await requirePermission("prescriptions", "read");

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    // Build where clause
    const where: Prisma.PrescriptionWhereInput = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      const terms = search.trim().split(/\s+/);
      where.OR = [
        { rxNumber: { contains: search, mode: "insensitive" } },
        { patient: { firstName: { contains: search, mode: "insensitive" } } },
        { patient: { lastName: { contains: search, mode: "insensitive" } } },
        { patient: { mrn: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Fetch prescriptions with related data
    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
          },
        },
        prescriber: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            strength: true,
          },
        },
        formula: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format for export
    const exportData = prescriptions.map((rx) => ({
      "Rx Number": rx.rxNumber,
      Patient: `${rx.patient.lastName}, ${rx.patient.firstName}`,
      MRN: rx.patient.mrn,
      "Prescriber Name": rx.prescriber
        ? `${rx.prescriber.lastName}, ${rx.prescriber.firstName}`
        : "",
      Medication: rx.item?.name || rx.formula?.name || "",
      Strength: rx.item?.strength || "",
      "Quantity Dispensed": rx.quantityDispensed || "",
      Status: rx.status,
      "Created Date": rx.createdAt
        ? rx.createdAt.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
          })
        : "",
      "Date Filled": rx.dateFilled
        ? rx.dateFilled.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
          })
        : "",
    }));

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export prescriptions error:", error);

    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export prescriptions" },
      { status: 500 }
    );
  }
}
