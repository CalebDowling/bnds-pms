import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runFullDUR, getDurAlertsForFill } from "@/lib/clinical/dur-engine";

/**
 * POST /api/clinical/dur
 *
 * Run a DUR check for a fill. Accepts either:
 *   - { fillId } — run DUR for an existing fill
 *
 * Returns DUR alerts array with severity, description, recommendation.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fillId } = body;

    if (!fillId) {
      return NextResponse.json(
        { error: "fillId is required" },
        { status: 400 }
      );
    }

    const result = await runFullDUR(fillId);

    return NextResponse.json({
      fillId: result.fillId,
      patientId: result.patientId,
      drug: result.drug,
      alerts: result.alerts.map((alert) => ({
        id: alert.id,
        type: alert.alertType,
        severity: alert.severity,
        drugA: alert.drugA,
        drugB: alert.drugB || null,
        description: alert.description,
        clinicalEffect: alert.clinicalEffect,
        recommendation: alert.recommendation,
      })),
      hasCritical: result.hasCritical,
      hasMajor: result.hasMajor,
      totalAlerts: result.totalAlerts,
      checkedAt: result.checkedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DUR check failed";
    console.error("[DUR API] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/clinical/dur?fillId=xxx
 *
 * Get existing DUR alerts for a fill (without re-running the check).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fillId = searchParams.get("fillId");

    if (!fillId) {
      return NextResponse.json(
        { error: "fillId query parameter is required" },
        { status: 400 }
      );
    }

    const alerts = await getDurAlertsForFill(fillId);

    return NextResponse.json({
      fillId,
      alerts,
      totalAlerts: alerts.length,
      hasCritical: alerts.some((a) => a.severity === "critical"),
      hasMajor: alerts.some((a) => a.severity === "major"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get DUR alerts";
    console.error("[DUR API] GET Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
