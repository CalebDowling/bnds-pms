import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/export/reports/batches
 * Export batch log report data
 * Query params: startDate, endDate
 */
export async function GET(req: NextRequest) {
  try {
    // Check permissions
    await requirePermission("reports", "read");

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate parameters are required" },
        { status: 400 }
      );
    }

    // Parse dates
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch batches in date range
    const batches = await prisma.batch.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        formulaVersion: {
          include: {
            formula: true,
          },
        },
        compounder: true,
        qa: true,
        fills: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Format for export
    const exportData = batches.map((batch) => ({
      "Batch Number": batch.batchNumber,
      Formula: batch.formulaVersion.formula.name,
      "Formula Code": batch.formulaVersion.formula.formulaCode,
      "Quantity Prepared": Number(batch.quantityPrepared),
      Unit: batch.unit,
      "BUD Date": batch.budDate.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }),
      Compounder: `${batch.compounder.firstName} ${batch.compounder.lastName}`,
      "QA Reviews": batch.qa.length,
      Fills: batch.fills.length,
      Status: batch.status,
      "Created Date": batch.createdAt.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }),
      "Created Time": batch.createdAt.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export batch report error:", error);

    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export batch report" },
      { status: 500 }
    );
  }
}
