/**
 * scripts/dedupe-fill-created-events.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Remove duplicate `fill_created` events introduced by the
 * backfill-fill-events race condition on 2026-04-27.
 *
 * What happened:
 *   - The original `$transaction(map(create))` apply run (~539 events/min)
 *     was auto-backgrounded after timing out. It kept running.
 *   - I rewrote the script to use createMany and started a second
 *     --apply while the first was still in flight.
 *   - The second run's `SELECT … WHERE NOT EXISTS` saw fills (39,501 →
 *     239,299) as still missing because the first run hadn't written
 *     to them yet.
 *   - Both runs then wrote `fill_created` events for the overlap →
 *     199,799 fills now have two identical events.
 *
 * The activity log on /queue/process/[fillId] renders every event, so
 * every affected fill shows two "Fill created" rows side-by-side. This
 * script removes the duplicate, keeping the first event per fill (by
 * createdAt, with id as tiebreaker) so the audit trail still reads
 * the same created-at time as before.
 *
 * Idempotency:
 *   Re-runs on a clean DB are no-ops (the duplicates are gone, the
 *   ROW_NUMBER() partitioning yields rn=1 for every remaining row).
 *
 * Safety:
 *   - Dry-run by default. Pass `--apply` to execute.
 *   - Single DELETE statement so the dedupe is atomic.
 *
 * Usage:
 *   npx tsx scripts/dedupe-fill-created-events.ts          # dry-run
 *   npx tsx scripts/dedupe-fill-created-events.ts --apply  # execute
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

async function main() {
  const mode = APPLY ? "APPLY" : "DRY-RUN";
  console.log(`[dedupe-fill-created-events] ${mode} starting...`);

  // Distribution: how many fills have N events? (Sanity check before any
  // DELETE — if there's a fill with 5 events that's a different bug than
  // the 2-event race we're fixing.)
  const dist = await prisma.$queryRaw<Array<{ n_events: number; n_fills: bigint }>>`
    SELECT n_events, COUNT(*)::bigint AS n_fills
    FROM (
      SELECT fill_id, COUNT(*)::int AS n_events
      FROM fill_events
      WHERE event_type = 'fill_created'
      GROUP BY fill_id
      HAVING COUNT(*) > 1
    ) t
    GROUP BY n_events
    ORDER BY n_events ASC
  `;

  if (dist.length === 0) {
    console.log("[dedupe-fill-created-events] no duplicates found.");
    return;
  }

  console.log("\n[dedupe-fill-created-events] fills with multiple fill_created events:");
  let totalDupes = 0;
  let totalRowsToDelete = 0;
  for (const r of dist) {
    console.log(`  n_events=${r.n_events}: ${r.n_fills.toLocaleString()} fills`);
    totalDupes += Number(r.n_fills);
    totalRowsToDelete += Number(r.n_fills) * (r.n_events - 1);
  }
  console.log(`\n  total fills with duplicates: ${totalDupes.toLocaleString()}`);
  console.log(`  total rows that will be deleted: ${totalRowsToDelete.toLocaleString()}`);

  // Sample three duplicate sets so an operator can sanity-check the keep
  // vs delete choice before --apply.
  const sample = await prisma.$queryRaw<
    Array<{ fill_id: string; id: string; created_at: Date; rn: number }>
  >`
    SELECT fill_id, id, created_at, rn
    FROM (
      SELECT fill_id, id, created_at,
             ROW_NUMBER() OVER (PARTITION BY fill_id ORDER BY created_at, id) AS rn,
             COUNT(*) OVER (PARTITION BY fill_id) AS total
      FROM fill_events
      WHERE event_type = 'fill_created'
    ) t
    WHERE total > 1 AND fill_id IN (
      SELECT fill_id FROM fill_events
      WHERE event_type = 'fill_created'
      GROUP BY fill_id
      HAVING COUNT(*) > 1
      LIMIT 3
    )
    ORDER BY fill_id, rn
  `;
  console.log("\n[dedupe-fill-created-events] sample (3 affected fills):");
  let prevFill = "";
  for (const row of sample) {
    if (row.fill_id !== prevFill) {
      console.log(`  fill ${row.fill_id}:`);
      prevFill = row.fill_id;
    }
    // Postgres ROW_NUMBER() comes back as bigint via Prisma $queryRaw,
    // so coerce before the equality check.
    const rn = Number(row.rn);
    const action = rn === 1 ? "KEEP   " : "DELETE ";
    console.log(`    ${action} event ${row.id}  ${row.created_at.toISOString()}  (rn=${rn})`);
  }

  if (!APPLY) {
    console.log("\n[dedupe-fill-created-events] dry-run complete — pass --apply to execute.");
    return;
  }

  // Single DELETE for atomicity and speed. ROW_NUMBER() picks the keeper
  // (rn=1) per fill_id; everything else is removed.
  const deleted: Array<{ count: bigint }> = await prisma.$queryRaw`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY fill_id ORDER BY created_at, id) AS rn
      FROM fill_events
      WHERE event_type = 'fill_created'
    ),
    deleted AS (
      DELETE FROM fill_events
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
      RETURNING 1
    )
    SELECT COUNT(*)::bigint AS count FROM deleted
  `;
  const n = Number(deleted[0]?.count ?? 0);
  console.log(`\n[dedupe-fill-created-events] deleted ${n.toLocaleString()} duplicate events.`);

  // Verify
  const remaining = await prisma.fillEvent.count({ where: { eventType: "fill_created" } });
  const totalFills = await prisma.prescriptionFill.count();
  console.log(`  fill_created events remaining: ${remaining.toLocaleString()}`);
  console.log(`  total fills:                   ${totalFills.toLocaleString()}`);
  console.log(`  expected (one per fill):       ${totalFills.toLocaleString()}`);
  if (remaining !== totalFills) {
    console.warn(
      `  WARNING: remaining count != total fills — there may be fills missing a fill_created event, or duplicates of a different shape.`
    );
  } else {
    console.log("  ✓ exactly one fill_created event per fill.");
  }
}

main()
  .catch((e) => {
    console.error("[dedupe-fill-created-events] ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
