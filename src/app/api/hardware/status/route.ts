import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deviceManager } from "@/lib/hardware/device-manager";

/**
 * GET /api/hardware/status
 * Get status of all configured hardware devices.
 *
 * GET /api/hardware/status?deviceId=eyecon-1
 * Get status of a specific device.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deviceId = request.nextUrl.searchParams.get("deviceId");

  if (deviceId) {
    const status = await deviceManager.getDeviceStatus(deviceId);
    if (!status) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    return NextResponse.json(status);
  }

  const allStatus = await deviceManager.getStatus();
  return NextResponse.json({
    devices: allStatus,
    total: allStatus.length,
    online: allStatus.filter((d) => d.status === "online").length,
    timestamp: new Date().toISOString(),
  });
}
