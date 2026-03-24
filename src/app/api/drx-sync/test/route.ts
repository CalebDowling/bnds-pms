/**
 * DRX Connection Test
 * GET /api/drx-sync/test — Test the DRX API connection via heartbeat
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { testConnection } = await import("@/lib/drx/client");
    const result = await testConnection();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { connected: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
