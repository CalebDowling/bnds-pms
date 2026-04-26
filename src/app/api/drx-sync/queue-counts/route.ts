/**
 * DRX Live Queue Counts
 * GET /api/drx-sync/queue-counts
 *
 * Fetches fill counts by status directly from DRX API in parallel.
 * ~9 API calls with limit=1 each, reads the "total" field from the response.
 * Completes in <2 seconds — no DB writes needed.
 */

import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  // When DRX sync is disabled, don't hit DRX's API at all. The dashboard
  // reads counts directly from the local prescription_fills table instead.
  if (!env.isDrxEnabled()) {
    return NextResponse.json(
      {
        success: false,
        disabled: true,
        message: "DRX sync is disabled — dashboard reads counts from the local DB.",
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
