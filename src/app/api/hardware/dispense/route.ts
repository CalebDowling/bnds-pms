import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deviceManager } from "@/lib/hardware/device-manager";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/hardware/dispense
 * Send a dispense request to the ScriptPro robot.
 *
 * Body: { fillId, ndc, drugName, quantity, vialSize?, labelData?, deviceId? }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { fillId, ndc, drugName, quantity, vialSize, labelData, deviceId } = body;

  if (!fillId || !ndc || !quantity) {
    return NextResponse.json(
      { error: "Missing required fields: fillId, ndc, quantity" },
      { status: 400 }
    );
  }

  const result = await deviceManager.dispense({
    fillId,
    ndc,
    drugName: drugName || ndc,
    quantity,
    vialSize,
    labelData,
    deviceId,
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    resource: "hardware_dispense",
    resourceId: fillId,
    newValues: {
      deviceId: result.deviceId,
      ndc,
      dispensedQuantity: result.dispensedQuantity,
      cellId: result.cellId,
      lotNumber: result.lotNumber,
    },
  }).catch(() => {});

  return NextResponse.json(result, {
    status: result.success ? 200 : 502,
  });
}
