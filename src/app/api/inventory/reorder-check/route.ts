import { NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET || "dev-secret";

/**
 * GET /api/inventory/reorder-check
 *
 * Protected by CRON_SECRET header for automated runs.
 * Checks all inventory items for reorder conditions and creates notifications.
 *
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Response:
 *   {
 *     success: boolean,
 *     totalItemsProcessed: number,
 *     criticalCount: number,
 *     lowStockCount: number,
 *     totalNeedingReorder: number,
 *     timestamp: ISO string
 *   }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || token !== CRON_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing CRON_SECRET" },
      { status: 401 }
    );
  }

  try {
    const { checkReorderLevels } = await import("@/lib/inventory/reorder-check");

    const result = await checkReorderLevels();

    return NextResponse.json(
      {
        success: true,
        totalItemsProcessed: result.totalItemsProcessed,
        criticalCount: result.criticalItems.length,
        lowStockCount: result.lowStockItems.length,
        totalNeedingReorder: result.itemsNeedingReorder.length,
        timestamp: result.timestamp.toISOString(),
        details: {
          critical: result.criticalItems,
          lowStock: result.lowStockItems,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reorder check failed:", error);

    return NextResponse.json(
      {
        error: "Failed to run reorder check",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
