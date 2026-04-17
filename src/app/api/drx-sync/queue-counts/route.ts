/**
 * DRX Live Queue Counts
 * GET /api/drx-sync/queue-counts
 *
 * Fetches fill counts by status directly from DRX API in parallel.
 * ~9 API calls with limit=1 each, reads the "total" field from the response.
 * Completes in <2 seconds — no DB writes needed.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isDrxSyncDisabled(): boolean {
  const flag = process.env.DRX_SYNC_DISABLED?.toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

export async function GET() {
  // When DRX sync is disabled, don't hit DRX's API at all. The dashboard
  // has a local-DB fallback that will kick in and show counts from our
  // own database.
  if (isDrxSyncDisabled()) {
    return NextResponse.json(
      {
        success: false,
        disabled: true,
        message: "DRX sync is disabled — dashboard will use local DB counts.",
      },
      { status: 503 }
    );
  }

  try {
    const { fetchAllQueueCounts } = await import("@/lib/drx/client");
    const start = Date.now();
    const counts = await fetchAllQueueCounts();
    const duration = Date.now() - start;

    return NextResponse.json({
      success: true,
      counts,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[Queue Counts] Error:", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
