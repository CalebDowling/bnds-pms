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

export async function GET() {
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
