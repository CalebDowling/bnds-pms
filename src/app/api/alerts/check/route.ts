import { NextRequest, NextResponse } from "next/server";
import { checkAlerts } from "@/app/(dashboard)/settings/alerts/actions";

const CRON_SECRET = process.env.CRON_SECRET || "dev-secret";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || token !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const triggeredAlerts = await checkAlerts();

    return NextResponse.json({
      success: true,
      alertsTriggered: triggeredAlerts.length,
      alerts: triggeredAlerts,
    });
  } catch (error) {
    console.error("Alert check failed:", error);
    return NextResponse.json(
      { error: "Failed to check alerts", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}
