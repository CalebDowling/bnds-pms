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
 *
 * ─── KILL SWITCH ──────────────────────────────────────────────────────
 * DRX is OFF by default. Both cron and manual sync triggers return 503.
 * The status endpoint (GET without cron secret) still responds so the
 * dashboard banner stays useful.
 *
 * Single source of truth: env.isDrxEnabled() in src/lib/env.ts. To
 * re-enable: set DRX_SYNC_DISABLED=false in Vercel and restore the
 * crons block in vercel.json:
 *   "crons": [{ "path": "/api/drx-sync?entity=all", "schedule": "*\/5 * * * *" }]
 * ─────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max for sync

function disabledResponse() {
  return NextResponse.json(
    {
      success: false,
      disabled: true,
      message:
        "DRX sync is currently disabled. Set DRX_SYNC_DISABLED=false in Vercel and restore the cron in vercel.json to re-enable.",
      timestamp: new Date().toISOString(),
    },
    { status: 503 }
  );
}

export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (isCron) {
    // ── KILL SWITCH — block cron triggers when disabled ──
    if (!env.isDrxEnabled()) {
      console.log("[DRX Sync Cron] Skipped — DRX integration is disabled");
      return disabledResponse();
    }

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

  // Non-cron GET → return sync status (the banner uses this — always respond)
  try {
    const { getSyncStatus } = await import("@/lib/drx/sync");
    const status = await getSyncStatus();
    return NextResponse.json({
      ...status,
      disabled: !env.isDrxEnabled(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Failed to get sync status",
        detail: (e as Error).message,
        disabled: !env.isDrxEnabled(),
      },
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
    const { getCurrentUser } = await import("@/lib/auth");
    const user = await getCurrentUser();
    if (!user || !(user as any).isAdmin) {
      return NextResponse.json({ error: "Unauthorized — admin only" }, { status: 403 });
    }
  }

  // ── KILL SWITCH — block manual triggers too ──
  if (!env.isDrxEnabled()) {
    console.log("[DRX Sync Manual] Blocked — DRX integration is disabled");
    return disabledResponse();
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
