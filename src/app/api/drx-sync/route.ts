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
 * Set env var DRX_SYNC_DISABLED=true to disable both cron and manual
 * sync triggers. The status endpoint (GET without cron secret) will
 * still return the current state so the dashboard banner stays useful.
 *
 * To re-enable:
 *   1. Remove the DRX_SYNC_DISABLED env var in Vercel
 *   2. Restore the crons block in vercel.json:
 *        "crons": [{ "path": "/api/drx-sync?entity=all", "schedule": "*\/5 * * * *" }]
 *   3. Redeploy
 * ─────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max for sync

function isDrxSyncDisabled(): boolean {
  const flag = process.env.DRX_SYNC_DISABLED?.toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

function disabledResponse() {
  return NextResponse.json(
    {
      success: false,
      disabled: true,
      message:
        "DRX sync is currently disabled. Set DRX_SYNC_DISABLED=false (or remove the env var) and restore the cron in vercel.json to re-enable.",
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
    if (isDrxSyncDisabled()) {
      console.log("[DRX Sync Cron] Skipped — DRX_SYNC_DISABLED is set");
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
      disabled: isDrxSyncDisabled(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Failed to get sync status",
        detail: (e as Error).message,
        disabled: isDrxSyncDisabled(),
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
  if (isDrxSyncDisabled()) {
    console.log("[DRX Sync Manual] Blocked — DRX_SYNC_DISABLED is set");
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
