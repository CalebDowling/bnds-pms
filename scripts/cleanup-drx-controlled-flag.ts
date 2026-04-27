/**
 * scripts/cleanup-drx-controlled-flag.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Backfill `Item.isControlled = true` for any item whose `deaSchedule`
 * value parses as a real DEA Schedule II–V control.
 *
 * Why this script exists:
 *   The DRX legacy feed sometimes lands a valid `deaSchedule` value
 *   ("II", "C-III", "CIV") but leaves `isControlled = false`. Anywhere in
 *   the codebase that read just `item.isControlled` was undercounting
 *   controls — this is one of the reasons Phase 3 had to introduce the
 *   `isControlledDrug` helper that checks both flags. Cleaning up the
 *   data layer means future queries (reports, analytics, the inventory
 *   reorder thresholds) can trust `isControlled` again.
 *
 * Safety:
 *   - Dry-run by default. Pass `--apply` to actually update rows.
 *   - We only set `isControlled = true` when the schedule parses;
 *     never set it to `false`. (We don't want to "fix" a hand-set
 *     control flag based on a missing schedule.)
 *   - Wrapped in a single transaction so a partial run doesn't leave
 *     the table half-updated.
 *
 * Usage:
 *   npx tsx scripts/cleanup-drx-controlled-flag.ts          # dry-run
 *   npx tsx scripts/cleanup-drx-controlled-flag.ts --apply  # execute
 */
import { PrismaClient } from "@prisma/client";
import { isControlledDrug } from "../src/lib/utils/dea";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

async function main() {
  const mode = APPLY ? "APPLY" : "DRY-RUN";
  console.log(`[cleanup-drx-controlled-flag] ${mode} starting...`);

  // Pull only the candidates that COULD be wrong: isControlled=false
  // with a non-null schedule. Anything that parses as a real schedule
  // is a fix target; anything else is left alone.
  const candidates = await prisma.item.findMany({
    where: {
      isControlled: false,
      deaSchedule: { not: null },
    },
    select: { id: true, name: true, ndc: true, deaSchedule: true },
  });

  const fixable = candidates.filter((c) =>
    isControlledDrug({ isControlled: false, deaSchedule: c.deaSchedule })
  );
  const skipped = candidates.length - fixable.length;

  console.log(
    `[cleanup-drx-controlled-flag] scanned ${candidates.length} items with deaSchedule + isControlled=false`
  );
  console.log(`[cleanup-drx-controlled-flag]   - ${fixable.length} will be set to isControlled=true`);
  console.log(
    `[cleanup-drx-controlled-flag]   - ${skipped} have schedule values that don't parse (left alone)`
  );

  if (fixable.length === 0) {
    console.log("[cleanup-drx-controlled-flag] nothing to do.");
    return;
  }

  // Print the first 20 so an operator running the dry-run can sanity
  // check before applying. 20 is the column-count limit on the typical
  // pharmacist's terminal — anything more scrolls and is harder to scan.
  const sample = fixable.slice(0, 20);
  console.log("\n[cleanup-drx-controlled-flag] sample (first 20):");
  for (const row of sample) {
    console.log(
      `  ${row.id}  ndc=${row.ndc ?? "—"}  schedule=${row.deaSchedule}  ${row.name}`
    );
  }
  if (fixable.length > sample.length) {
    console.log(`  …and ${fixable.length - sample.length} more`);
  }

  if (!APPLY) {
    console.log("\n[cleanup-drx-controlled-flag] dry-run complete — pass --apply to execute.");
    return;
  }

  // Single transaction: either every row updates or none do. We don't
  // want a SIGTERM mid-run to leave the table half-fixed.
  const result = await prisma.$transaction(
    fixable.map((row) =>
      prisma.item.update({
        where: { id: row.id },
        data: { isControlled: true },
      })
    )
  );

  console.log(`\n[cleanup-drx-controlled-flag] applied ${result.length} updates.`);
}

main()
  .catch((e) => {
    console.error("[cleanup-drx-controlled-flag] ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
