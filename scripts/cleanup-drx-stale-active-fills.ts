/**
 * scripts/cleanup-drx-stale-active-fills.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Cancel DRX-imported fills that landed in active workflow status with
 * no real workflow data and have not moved in >30 days.
 *
 * Why this script exists:
 *   The audit (`audit-orphan-fills.ts`) reports ~21 fills sitting in
 *   active statuses (waiting_bin / verify / print / scan / etc.) for
 *   30+ days. Inspection showed they're DRX legacy bookkeeping ghosts:
 *     • no `claimId`              (no claim to reverse)
 *     • no `itemLotId`            (no inventory to restock)
 *     • no `metadata.waitingBin`  (never tracked through modern bin flow)
 *   So the existing RTS workflow (`src/lib/workflow/return-to-stock.ts`)
 *   wouldn't even find them — its candidate query requires
 *   `metadata.waitingBin.dateAdded` to be set.
 *
 *   The right pattern for these is a hygiene cancel: status →
 *   "cancelled" with a `FillEvent(status_change, <old> → cancelled)`,
 *   no inventory or claim side-effects, no patient SMS. Just a clean
 *   audit trail saying "this DRX legacy fill never moved and was
 *   cancelled for hygiene."
 *
 *   This script does ONLY that. Real workflow fills (with a claim,
 *   itemLot, or waitingBin metadata) are skipped — those need the
 *   real RTS path through processRts.
 *
 * Criteria (ALL must hold to cancel):
 *   • status in {intake, adjudicating, rejected, rph_rejected,
 *                print, scan, verify, waiting_bin}
 *   • createdAt > 30 days ago
 *   • claimId IS NULL
 *   • itemLotId IS NULL
 *   • metadata->'waitingBin' IS NULL
 *
 * Output state:
 *   • status = 'cancelled' (canonical terminal status, same as RTS lands on)
 *   • new FillEvent: eventType='status_change', fromValue=<old>,
 *     toValue='cancelled', performedBy=System, notes describing reason.
 *
 * Idempotency:
 *   Re-runs are safe — once a row is 'cancelled' it falls out of the
 *   active-status filter and is not re-touched.
 *
 * Safety:
 *   • Dry-run by default. Pass `--apply` to actually execute.
 *   • Per-fill transaction so a failure on one row doesn't poison the
 *     rest. Volume is tiny (~21 rows), so we don't bother chunking.
 *
 * Usage:
 *   npx tsx scripts/cleanup-drx-stale-active-fills.ts          # dry-run
 *   npx tsx scripts/cleanup-drx-stale-active-fills.ts --apply  # execute
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

// Same UUID literal as src/lib/audit.ts ensureSystemUser. Inlined so this
// script has no coupling to the application code.
const SYSTEM_USER_UUID = "00000000-0000-0000-0000-000000000001";

// Mirror the active-status list in audit-orphan-fills.ts so the two
// stay in sync. If you add a new active status, add it both places.
const ACTIVE_STATUSES = [
  "intake",
  "adjudicating",
  "rejected",
  "rph_rejected",
  "print",
  "scan",
  "verify",
  "waiting_bin",
] as const;

const STALE_DAYS = 30;

// Note explains the why so the audit trail is honest. Some of these
// rows have `filledAt`/`dispensedAt`/copay populated (DRX recorded the
// fill in the prior system) but none have a claim, itemLot, binLocation,
// or filledBy/verifiedBy in this DB — i.e. nothing was wired up through
// our modern workflow. We cancel rather than mark sold because we
// cannot prove the patient actually picked up; cancellation preserves
// the pre-cleanup state in the FillEvent.fromValue without claiming a
// sale that never happened in this system.
const NOTE =
  "DRX legacy stale active fill — filled in prior system but no modern workflow data " +
  "(no claim, itemLot, binLocation, or filledBy/verifiedBy); janitorial cleanup to " +
  "align status with terminal. fromValue preserves pre-cleanup status.";

async function getOrCreateSystemUser(): Promise<string> {
  await prisma.user.upsert({
    where: { id: SYSTEM_USER_UUID },
    update: {},
    create: {
      id: SYSTEM_USER_UUID,
      supabaseId: "system-actor",
      email: "system@bndsrx.local",
      firstName: "System",
      lastName: "Actor",
      isActive: false,
    },
  });
  return SYSTEM_USER_UUID;
}

async function main() {
  const mode = APPLY ? "APPLY" : "DRY-RUN";
  console.log(`[cleanup-drx-stale-active-fills] ${mode} starting...`);

  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  // Raw SQL for the metadata->'waitingBin' IS NULL check — Prisma's
  // JSON path filters are awkward for "key absent or null" and this is
  // a one-off cleanup, not a hot path.
  const candidates = await prisma.$queryRaw<
    Array<{ id: string; status: string; createdAt: Date; rxNumber: string | null }>
  >`
    SELECT f.id, f.status, f.created_at AS "createdAt", p.rx_number AS "rxNumber"
    FROM prescription_fills f
    LEFT JOIN prescriptions p ON p.id = f.prescription_id
    WHERE f.status = ANY(${ACTIVE_STATUSES as unknown as string[]})
      AND f.created_at < ${cutoff}
      AND f.claim_id IS NULL
      AND f.item_lot_id IS NULL
      AND (f.metadata IS NULL OR f.metadata->'waitingBin' IS NULL)
    ORDER BY f.created_at ASC
  `;

  console.log(`\n[cleanup-drx-stale-active-fills] found ${candidates.length} candidates.`);

  if (candidates.length === 0) {
    console.log("[cleanup-drx-stale-active-fills] nothing to do.");
    return;
  }

  // Distribution by status.
  const byStatus = new Map<string, number>();
  for (const row of candidates) {
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
  }
  console.log("\n[cleanup-drx-stale-active-fills] distribution by current status:");
  for (const [status, n] of [...byStatus.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(4)}  ${status}`);
  }

  // Sample the oldest few so an operator can sanity-check before --apply.
  const sample = candidates.slice(0, 10);
  console.log("\n[cleanup-drx-stale-active-fills] sample (oldest 10):");
  for (const row of sample) {
    const days = Math.floor((Date.now() - row.createdAt.getTime()) / 86400000);
    console.log(
      `  ${row.id}  ${row.status.padEnd(13)}  ${days}d old  Rx=${row.rxNumber ?? "—"}`
    );
  }
  if (candidates.length > sample.length) {
    console.log(`  …and ${candidates.length - sample.length} more`);
  }

  if (!APPLY) {
    console.log("\n[cleanup-drx-stale-active-fills] dry-run complete — pass --apply to execute.");
    return;
  }

  const systemUserId = await getOrCreateSystemUser();

  let cancelled = 0;
  let failed = 0;
  for (const row of candidates) {
    try {
      // Per-fill transaction: status update + status_change event in one
      // atomic write. The cancelled-status row no longer matches our
      // WHERE clause, so re-running is naturally idempotent.
      await prisma.$transaction([
        prisma.prescriptionFill.update({
          where: { id: row.id },
          data: { status: "cancelled" },
        }),
        prisma.fillEvent.create({
          data: {
            fillId: row.id,
            eventType: "status_change",
            fromValue: row.status,
            toValue: "cancelled",
            performedBy: systemUserId,
            notes: NOTE,
          },
        }),
      ]);
      cancelled++;
      console.log(
        `  ✓ ${row.id}  ${row.status} → cancelled  (Rx=${row.rxNumber ?? "—"})`
      );
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ ${row.id}  FAILED: ${msg}`);
    }
  }

  console.log(
    `\n[cleanup-drx-stale-active-fills] cancelled ${cancelled} fills (${failed} failed) of ${candidates.length} candidates.`
  );
}

main()
  .catch((e) => {
    console.error("[cleanup-drx-stale-active-fills] ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
