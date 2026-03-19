import { getCurrentUser } from "@/lib/auth";
import { autoGenerateReorders, getReorderAlerts } from "@/app/(dashboard)/inventory/reorder/actions";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/inventory/reorder
 * Returns items below reorder threshold
 * Can be used by external integrations or cron jobs
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts = await getReorderAlerts();

    return NextResponse.json({
      success: true,
      itemsBelowThreshold: alerts.length,
      items: alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching reorder alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch reorder alerts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/reorder
 * Triggers automatic reorder generation
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === "auto-generate") {
      const result = await autoGenerateReorders();
      return NextResponse.json({
        success: true,
        createdOrders: result.createdOrders,
        itemsProcessed: result.itemsProcessed,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'auto-generate'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing reorder request:", error);
    return NextResponse.json(
      { error: "Failed to process reorder request" },
      { status: 500 }
    );
  }
}
