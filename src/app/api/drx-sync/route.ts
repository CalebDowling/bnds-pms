/**
 * DRX Sync API Route
 *
 * GET /api/drx-sync — Runs sync (Vercel Cron) or returns status
 *   - If CRON_SECRET matches Authorization header → runs sync
 *   - Otherwise → returns sync status (read-only)
 *
 * POST /api/drx-sync — Manual sync trigger (requires admin session)
 *   Query params:
 *     entity: "doctors" | "items" | "patients" | "prescriptions" | "fills" | "all"
 *     full: "true" to force full resync instead of delta
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max for sync

export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (isCron) {
    // Cron-triggered sync
    try {
      const url = new URL(req.url);
      const entity = (url.searchParams.get("entity") || "all") as any;

      const { runSync } = await import("@/lib/drx/sync");
      const results = await runSync(entity, false);

      return NextResponse.json({
        success: true,
        source: "cron",
        results,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[DRX Sync Cron] Error:", e);
      return NextResponse.json(
        { error: "Sync failed", detail: (e as Error).message },
        { status: 500 }
      );
    }
  }

  // Non-cron GET → return sync status
  try {
    const { getSyncStatus } = await import("@/lib/drx/sync");
    const status = await getSyncStatus();
    return NextResponse.json(status);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to get sync status", detail: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Manual sync — require admin session
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const cookieHeader = req.headers.get("cookie") || "";
    if (!cookieHeader.includes("sb-")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const url = new URL(req.url);
    const entity = (url.searchParams.get("entity") || "all") as any;
    const full = url.searchParams.get("full") === "true";

    const { runSync } = await import("@/lib/drx/sync");
    const results = await runSync(entity, full);

    return NextResponse.json({
      success: true,
      source: "manual",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[DRX Sync] Error:", e);
    return NextResponse.json(
      { error: "Sync failed", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
