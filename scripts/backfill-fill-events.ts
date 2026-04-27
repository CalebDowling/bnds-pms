/**
 * scripts/backfill-fill-events.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Backfill missing `fill_created` events on legacy fills so the activity
 * log on /queue/process renders a non-empty starting point.
 *
 * Why this script exists:
 *   Phase 2 wired `fill_created` event writes into the three fill-creation
 *   paths (createPrescription, eRx convertToPrescription, createFill
 *   refill path), but every fill that existed before that commit landed
 *   with no starter event. The activity-log card on the workflow page
 *   shows "No events yet" for those fills until they advance — even when
 *   the fill has a status_change history. This script writes the missing
 *   `fill_created` events so old fills also get an activity log starter.
 *
 * Source of truth for the event timestamp:
 *   `Fill.createdAt` — the original intake time. Not the time we run the
 *   script. We want the audit log to read "Fill created Apr 15" if the
 *   fill was actually created on Apr 15.
 *
 * Source of truth for `performedBy`:
 *   `Fill.filledBy` if present (the tech who clicked Fill), otherwise the
 *   system audit user. We never make up a user — when no actor was
 *   recorded the event still gets written, but performed_by points at
 *   the System user so the FK constraint holds and the audit trail is
 *   honest about the unknown actor.
 *
 * Safety:
 *   - Dry-run by default. Pass `--apply` to actually insert events.
 *   - Only writes where no `fill_created` event exists for that fillId.
 *   - Wrapped in a transaction with a chunk size of 500 so we don't blow
 *     up a 30k-row prod DB.
 *
 * Usage:
 *   npx tsx scripts/backfill-fill-events.ts          # dry-run
 *   npx tsx scripts/backfill-fill-events.ts --apply  # execute
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
// 2000 rows/chunk: createMany sends a single bulk INSERT, so chunk size is
// gated by Postgres statement size (comfortable up to several thousand
// rows for this thin row shape), not round-trip count. Empirically ~50×
// faster than the original `$transaction(map(create))` which sent 500
// individual INSERTs per chunk through the Supabase pooler.
const CHUNK = 2000;

// Same UUID literal as src/lib/audit.ts ensureSystemUser. Inlined here so
// this script has zero coupling to the application code (it has to be
// runnable against a fresh DB with no successful audit-touch yet).
const SYSTEM_USER_UUID = "00000000-0000-0000-0000-000000000001";

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
  console.log(`[backfill-fill-events] ${mode} starting...`);

  // Find every fillId that has zero `fill_created` events. Use a raw
  // query because Prisma doesn't compose well for "no row exists in
  // related table" without a noisy include.
  // PrescriptionFill has no `created_by` column — the intake actor isn't
  // tracked at the fill level. We use `filled_by` if it's been set
  // (after the Fill step), otherwise null → System user fallback.
  const missing = await prisma.$queryRaw<Array<{ id: string; createdAt: Date; filledBy: string | null; status: string }>>`
    SELECT f.id, f.created_at as "createdAt", f.filled_by as "filledBy", f.status
    FROM prescription_fills f
    WHERE NOT EXISTS (
      SELECT 1 FROM fill_events e
      WHERE e.fill_id = f.id AND e.event_type = 'fill_created'
    )
  `;

  console.log(`[backfill-fill-events] found ${missing.length} fills with no fill_created event`);

  if (missing.length === 0) {
    console.log("[backfill-fill-events] nothing to do.");
    return;
  }

  // Distribute by status so an operator can see whether the gap is in
  // long-terminal sold rows (fine — old data) or active workflow rows
  // (worth investigating).
  const byStatus = new Map<string, number>();
  for (const row of missing) {
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
  }
  console.log("\n[backfill-fill-events] distribution by current status:");
  for (const [status, n] of [...byStatus.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(6)}  ${status}`);
  }

  const sample = missing.slice(0, 10);
  console.log("\n[backfill-fill-events] sample (first 10):");
  for (const row of sample) {
    console.log(
      `  ${row.id}  status=${row.status}  createdAt=${row.createdAt.toISOString()}  filledBy=${row.filledBy ?? "—"}`
    );
  }
  if (missing.length > sample.length) {
    console.log(`  …and ${missing.length - sample.length} more`);
  }

  if (!APPLY) {
    console.log("\n[backfill-fill-events] dry-run complete — pass --apply to execute.");
    return;
  }

  const systemUserId = await getOrCreateSystemUser();

  let inserted = 0;
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK);
    // createMany compiles to a single bulk INSERT — vastly faster than
    // chunk.map(create) wrapped in a transaction, which issued one INSERT
    // per row. Atomicity is still per-chunk (createMany is one statement).
    const result = await prisma.fillEvent.createMany({
      data: chunk.map((row) => ({
        fillId: row.id,
        eventType: "fill_created",
        fromValue: null,
        toValue: row.status,
        performedBy: row.filledBy ?? systemUserId,
        notes: "Backfilled fill_created event (legacy fill predates Phase 2 starter-event writes)",
        createdAt: row.createdAt, // mirror the fill's intake time
      })),
    });
    inserted += result.count;
    console.log(`[backfill-fill-events] chunk ${i / CHUNK + 1}: inserted ${result.count} events (running total ${inserted})`);
  }

  console.log(`\n[backfill-fill-events] applied ${inserted} events.`);
}

main()
  .catch((e) => {
    console.error("[backfill-fill-events] ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
