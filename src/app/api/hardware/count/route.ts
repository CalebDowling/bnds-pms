import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deviceManager } from "@/lib/hardware/device-manager";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/hardware/count
 * Send a pill count request to the Eyecon counter.
 *
 * Body: { fillId, ndc, drugName, expectedQuantity, deviceId? }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { fillId, ndc, drugName, expectedQuantity, deviceId } = body;

  if (!fillId || !ndc || !expectedQuantity) {
    return NextResponse.json(
      { error: "Missing required fields: fillId, ndc, expectedQuantity" },
      { status: 400 }
    );
  }

  const result = await deviceManager.countPills({
    fillId,
    ndc,
    drugName: drugName || ndc,
    expectedQuantity,
    deviceId,
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    resource: "hardware_count",
    resourceId: fillId,
    newValues: {
      deviceId: result.deviceId,
      ndc,
      countedQuantity: result.countedQuantity,
      expectedQuantity,
      verified: result.verified,
      discrepancy: result.discrepancy,
    },
  }).catch(() => {});

  return NextResponse.json(result, {
    status: result.success ? 200 : 502,
  });
}
