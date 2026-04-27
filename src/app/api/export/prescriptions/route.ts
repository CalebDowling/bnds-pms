import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { formatPrescriptionForExport } from "@/lib/export";

// Same bucket → status mapping the page uses (kept in sync manually; the
// page is the source of truth, this file mirrors it). If we ever extract
// a shared module, swap this for an import.
const STATUS_BUCKETS: Record<string, string[]> = {
  active: ["intake", "pending_review", "in_progress", "ready_to_fill", "compounding", "ready_for_verification", "verified", "ready", "filling", "pending_fill"],
  completed: ["dispensed", "delivered"],
  transferred: ["transferred"],
  expired: ["expired", "cancelled", "on_hold"],
};

/**
 * GET /api/export/prescriptions
 * Export prescriptions data as JSON
 * Query params: filter (active|completed|transferred|expired|all), search,
 *               status (legacy: exact-match status string)
 */
export async function GET(req: NextRequest) {
  try {
    // Check permissions
    await requirePermission("prescriptions", "read");

    const searchParams = req.nextUrl.searchParams;
    const filter = searchParams.get("filter") || "all";
    const legacyStatus = searchParams.get("status");
    const search = searchParams.get("search") || "";

    // Build where clause — legacy `?status=` keeps exact-match behavior so
    // bookmarked exports still work. New `?filter=` uses bucket mapping.
    const where: Prisma.PrescriptionWhereInput = {};
    if (legacyStatus) {
      if (legacyStatus !== "all") where.status = legacyStatus;
    } else if (filter !== "all") {
      const bucket = STATUS_BUCKETS[filter];
      if (bucket) where.status = { in: bucket };
    }

    if (search) {
      // Mirror the page search predicate so the export contains the same
      // result set the user is looking at, including drug + prescriber matches.
      where.OR = [
        { rxNumber: { contains: search, mode: "insensitive" } },
        { patient: { firstName: { contains: search, mode: "insensitive" } } },
        { patient: { lastName: { contains: search, mode: "insensitive" } } },
        { patient: { mrn: { contains: search, mode: "insensitive" } } },
        { item: { name: { contains: search, mode: "insensitive" } } },
        { formula: { name: { contains: search, mode: "insensitive" } } },
        { prescriber: { lastName: { contains: search, mode: "insensitive" } } },
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
