import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/export/reports/inventory
 * Export inventory report data
 */
export async function GET(req: NextRequest) {
  try {
    // Check permissions
    await requirePermission("reports", "read");

    // Fetch all items with their lots
    const items = await prisma.item.findMany({
      include: {
        lots: {
          select: {
            expirationDate: true,
            quantityOnHand: true,
          },
          orderBy: { expirationDate: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Calculate derived metrics and format for export
    const exportData = items.map((item) => {
      const lotCount = item.lots.length;
      const totalOnHand = item.lots.reduce(
        (sum, lot) => sum + Number(lot.quantityOnHand),
        0
      );
      const earliestExpiry = item.lots.length > 0 ? item.lots[0].expirationDate : null;
      const isLowStock = item.reorderPoint && totalOnHand <= Number(item.reorderPoint);

      // Check if expiring soon (90 days)
      let isExpiringSoon = false;
      if (earliestExpiry) {
        const now = new Date();
        const diffMs = earliestExpiry.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        isExpiringSoon = diffDays <= 90 && diffDays > 0;
      }

      return {
        Item: item.name,
        "Generic Name": item.genericName || "",
        NDC: item.ndc || "",
        Strength: item.strength || "",
        Manufacturer: item.manufacturer || "",
        "On Hand": totalOnHand,
        "Unit of Measure": item.unitOfMeasure || "",
        "Reorder Point": item.reorderPoint || "",
        "Low Stock": isLowStock ? "Yes" : "No",
        "Expiring Soon": isExpiringSoon ? "Yes" : "No",
        "Compound Ingredient": item.isCompoundIngredient ? "Yes" : "No",
        Refrigerated: item.isRefrigerated ? "Yes" : "No",
        "DEA Schedule": item.deaSchedule || "",
        "Earliest Expiry": earliestExpiry
          ? earliestExpiry.toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
            })
          : "",
        "Lot Count": lotCount,
      };
    });

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export inventory report error:", error);

    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export inventory report" },
      { status: 500 }
    );
  }
}
