/**
 * DRX Queue Sync — Targeted sync of active fills by DRX status
 * GET /api/drx-sync/queue-sync
 *
 * Fetches only active (non-Sold) fills from DRX by each queue status
 * (Pre-Check, Print, Scan, Verify, OOS, Hold, Waiting Bin, Rejected, Adjudicating).
 * Much faster than a full resync — ~500 fills vs 238K.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isDrxSyncDisabled(): boolean {
  const flag = process.env.DRX_SYNC_DISABLED?.toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

export async function GET() {
  // Honor the global DRX sync kill switch
  if (isDrxSyncDisabled()) {
    return NextResponse.json(
      {
        success: false,
        disabled: true,
        message:
          "DRX sync is currently disabled. Set DRX_SYNC_DISABLED=false to re-enable.",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  try {
    const { syncActiveQueues } = await import("@/lib/drx/sync");
    const result = await syncActiveQueues();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[Queue Sync] Error:", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
