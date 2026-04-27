/**
 * scripts/cleanup-drx-dea-schedule-format.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Normalize `Item.deaSchedule` values to a canonical "C-II" / "C-III" /
 * "C-IV" / "C-V" form.
 *
 * Why this script exists:
 *   DRX delivers schedule values in at least four shapes — "II", "C-II",
 *   "CII", "2" — and lib/utils/dea.ts handles all of them at read time.
 *   But the inconsistent storage breaks:
 *     1) DISTINCT queries (every shape counts as its own value in
 *        analytics dashboards).
 *     2) Equality filters (a query for `deaSchedule = "II"` misses the
 *        "C-II"-shaped rows).
 *     3) Display: the C-II badge has to compose `C-{schedule}` and
 *        defensively strip a possible "C-" prefix.
 *   Normalizing the column once means all of those just work.
 *
 * Canonical form:
 *   "C-II", "C-III", "C-IV", "C-V"  (matches the DEA's own labeling on
 *   the controlled-substance schedule documents).
 *
 * Safety:
 *   - Dry-run by default. Pass `--apply` to actually update rows.
 *   - Only updates rows whose schedule parses as a recognized control;
 *     unknown values ("OTC", "I", "VI", garbage) are left alone with a
 *     count printed so an operator can decide what to do.
 *
 * Usage:
 *   npx tsx scripts/cleanup-drx-dea-schedule-format.ts          # dry-run
 *   npx tsx scripts/cleanup-drx-dea-schedule-format.ts --apply  # execute
 */
import { PrismaClient } from "@prisma/client";
import { parseDeaScheduleNumeral } from "../src/lib/utils/dea";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

function canonical(schedule: string | null | undefined): string | null {
  const numeral = parseDeaScheduleNumeral(schedule);
  return numeral ? `C-${numeral}` : null;
}

async function main() {
  const mode = APPLY ? "APPLY" : "DRY-RUN";
  console.log(`[cleanup-drx-dea-schedule-format] ${mode} starting...`);

  const candidates = await prisma.item.findMany({
    where: { deaSchedule: { not: null } },
    select: { id: true, name: true, deaSchedule: true },
  });

  const updates: { id: string; from: string; to: string; name: string }[] = [];
  let alreadyCanonical = 0;
  let unparseable = 0;
  for (const row of candidates) {
    const current = row.deaSchedule!;
    const norm = canonical(current);
    if (norm === null) {
      unparseable++;
      continue;
    }
    if (norm === current) {
      alreadyCanonical++;
      continue;
    }
    updates.push({ id: row.id, from: current, to: norm, name: row.name });
  }

  console.log(`[cleanup-drx-dea-schedule-format] scanned ${candidates.length} items with deaSchedule != null`);
  console.log(`[cleanup-drx-dea-schedule-format]   - ${updates.length} need normalization`);
  console.log(`[cleanup-drx-dea-schedule-format]   - ${alreadyCanonical} already canonical (C-II / C-III / C-IV / C-V)`);
  console.log(`[cleanup-drx-dea-schedule-format]   - ${unparseable} unparseable values (left alone — manual review)`);

  if (updates.length === 0) {
    console.log("[cleanup-drx-dea-schedule-format] nothing to do.");
    return;
  }

  // Group the diff by from→to so we can see the shape distribution.
  const shapes = new Map<string, number>();
  for (const u of updates) {
    const k = `"${u.from}" → "${u.to}"`;
    shapes.set(k, (shapes.get(k) ?? 0) + 1);
  }
  console.log("\n[cleanup-drx-dea-schedule-format] shape distribution:");
  for (const [k, n] of [...shapes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(6)}  ${k}`);
  }

  const sample = updates.slice(0, 15);
  console.log("\n[cleanup-drx-dea-schedule-format] sample (first 15):");
  for (const u of sample) {
    console.log(`  ${u.id}  "${u.from}" → "${u.to}"  ${u.name}`);
  }
  if (updates.length > sample.length) {
    console.log(`  …and ${updates.length - sample.length} more`);
  }

  if (!APPLY) {
    console.log("\n[cleanup-drx-dea-schedule-format] dry-run complete — pass --apply to execute.");
    return;
  }

  const result = await prisma.$transaction(
    updates.map((u) =>
      prisma.item.update({
        where: { id: u.id },
        data: { deaSchedule: u.to },
      })
    )
  );

  console.log(`\n[cleanup-drx-dea-schedule-format] applied ${result.length} updates.`);
}

main()
  .catch((e) => {
    console.error("[cleanup-drx-dea-schedule-format] ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
