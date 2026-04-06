import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { runAutomationChecks } from "@/lib/automation";

/**
 * POST /api/automation/run
 * Run automation checks
 *
 * Body:
 *   - checks?: Array<"low_stock" | "expiring_lots" | "refills_due" | "rejected_claims">
 *     (if empty or omitted, runs all checks)
 */
export async function POST(req: NextRequest) {
  try {
    // Require admin permission
    await requirePermission("settings", "admin");

    const body = await req.json().catch(() => ({}));
    const { checks } = body;

    const results = await runAutomationChecks(
      Array.isArray(checks) && checks.length > 0 ? checks : undefined
    );

    const summary = {
      totalChecks: results.length,
      totalAlertsGenerated: results.reduce((sum, r) => sum + r.alertsGenerated, 0),
      totalItemsProcessed: results.reduce((sum, r) => sum + r.itemsProcessed, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      details: results,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error running automation checks:", error);

    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json(
        { error: "Unauthorized: Admin permission required" },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run automation checks" },
      { status: 500 }
    );
  }
}
