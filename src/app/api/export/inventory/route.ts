import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { formatInventoryForExport } from "@/lib/export";

/**
 * GET /api/export/inventory
 * Export inventory items as JSON
 * Query params: category, search
 */
export async function GET(req: NextRequest) {
  try {
    // Check permissions
    await requirePermission("inventory", "read");

    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category") || "all";
    const search = searchParams.get("search") || "";

    // Build where clause
    const where: Prisma.ItemWhereInput = {};

    // Apply category filter
    if (category && category !== "all") {
      if (category === "compound_ingredient") {
        where.isCompoundIngredient = true;
      } else if (category === "controlled") {
        where.deaSchedule = { not: null };
      } else if (category === "refrigerated") {
        where.isRefrigerated = true;
      }
    }

    // Apply search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { genericName: { contains: search, mode: "insensitive" } },
        { ndc: { contains: search, mode: "insensitive" } },
        { manufacturer: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch items with related lot data
    const items = await prisma.item.findMany({
      where,
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

    // Calculate derived fields and format for export
    const exportData = items.map((item) => {
      const lotCount = item.lots.length;
      const totalOnHand = item.lots.reduce(
        (sum, lot) => sum + Number(lot.quantityOnHand),
        0
      );
      const earliestExpiry = item.lots.length > 0 ? item.lots[0].expirationDate : null;
      const isLowStock = item.reorderPoint && totalOnHand <= Number(item.reorderPoint);

      return {
        "Item ID": item.id,
        "Item Name": item.name,
        "Generic Name": item.genericName || "",
        NDC: item.ndc || "",
        Strength: item.strength || "",
        Manufacturer: item.manufacturer || "",
        "On Hand": totalOnHand,
        "Unit of Measure": item.unitOfMeasure || "",
        "Reorder Point": item.reorderPoint || "",
        "Low Stock": isLowStock ? "Yes" : "No",
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
        "Created Date": item.createdAt.toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        }),
      };
    });

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export inventory error:", error);

    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export inventory" },
      { status: 500 }
    );
  }
}
