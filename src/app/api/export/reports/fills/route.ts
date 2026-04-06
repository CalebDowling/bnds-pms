import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/export/reports/fills
 * Export daily fills report data
 * Query params: date
 */
export async function GET(req: NextRequest) {
  try {
    // Check permissions
    await requirePermission("reports", "read");

    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Parse date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch fills for the date
    const fills = await prisma.prescriptionFill.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        prescription: {
          select: {
            rxNumber: true,
            patient: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            item: {
              select: {
                name: true,
                strength: true,
              },
            },
            formula: {
              select: {
                name: true,
              },
            },
          },
        },
        itemLot: {
          select: {
            lotNumber: true,
          },
        },
        batch: {
          select: {
            batchNumber: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Format for export
    const exportData = fills.map((fill) => ({
      Time: fill.createdAt.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      "Rx Number": fill.prescription.rxNumber,
      Patient: `${fill.prescription.patient.lastName}, ${fill.prescription.patient.firstName}`,
      "Drug / Formula":
        fill.prescription.item?.name ||
        fill.prescription.formula?.name ||
        "",
      Strength: fill.prescription.item?.strength || "",
      Quantity: Number(fill.quantity),
      "Lot / Batch": fill.itemLot?.lotNumber || fill.batch?.batchNumber || "",
      "Fill Number": fill.fillNumber,
      "Fill Type": fill.fillNumber === 0 ? "Original" : "Refill",
      Status: fill.status,
      "Created Date": fill.createdAt.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }),
    }));

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export daily fills error:", error);

    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export fills report" },
      { status: 500 }
    );
  }
}
