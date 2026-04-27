/**
 * scripts/audit-orphan-fills.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Read-only data-integrity report for `prescription_fills`.
 *
 * What it counts:
 *   1. Fills with no related Prescription (FK soft-broken)
 *   2. Fills whose Prescription has no Patient
 *   3. Fills whose Prescription has no Item AND fill.itemId is null
 *      (display layer renders "Compound" but reports/labels can't proceed)
 *   4. Fills with deaSchedule on the item but isControlled=false
 *      (proxy for the cleanup-drx-controlled-flag candidates)
 *   5. Fills with junk-shaped item.name values (proxy for the
 *      cleanup-drx-junk-item-names candidates)
 *   6. Fills stuck in non-terminal status > 30 days (workflow drift)
 *
 * Why this script exists:
 *   Walkthrough caught several "the screen says X but the data says Y"
 *   moments — the queue page hid fills with no related Item, the
 *   /pickup page rendered "Unknown drug" for some bins, and a handful
 *   of waiting_bin fills had been there for 60+ days. This audit
 *   surfaces all of those in one report so an operator can decide
 *   whether to run the cleanup scripts or hand-fix specific rows.
 *
 * This script never writes — read-only. There's no `--apply` flag
 * because there's nothing to apply.
 *
 * Usage:
 *   npx tsx scripts/audit-orphan-fills.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isJunkName(s: string | null | undefined): boolean {
  if (!s) return true;
  const t = s.trim();
  if (t.length === 0) return true;
  if (t.length <= 3 && !/\d/.test(t)) return true;
  return false;
}

async function main() {
  console.log("[audit-orphan-fills] starting...\n");

  const totalFills = await prisma.prescriptionFill.count();
  console.log(`Total fills: ${totalFills.toLocaleString()}`);

  // ── 1. Fills with no related Prescription ──────────────────────
  const orphanByRx = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM prescription_fills f
    LEFT JOIN prescriptions p ON p.id = f.prescription_id
    WHERE p.id IS NULL
  `;
  console.log(`\n1. Fills with no Prescription: ${orphanByRx[0].count}`);

  // ── 2. Fills whose Prescription has no Patient ─────────────────
  const orphanByPatient = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM prescription_fills f
    JOIN prescriptions p ON p.id = f.prescription_id
    LEFT JOIN patients pt ON pt.id = p.patient_id
    WHERE pt.id IS NULL
  `;
  console.log(`2. Fills whose Prescription has no Patient: ${orphanByPatient[0].count}`);

  // ── 3. Fills with no Item anywhere on the chain ────────────────
  const orphanByItem = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM prescription_fills f
    JOIN prescriptions p ON p.id = f.prescription_id
    LEFT JOIN items i_fill ON i_fill.id = f.item_id
    LEFT JOIN items i_rx ON i_rx.id = p.item_id
    WHERE i_fill.id IS NULL AND i_rx.id IS NULL
  `;
  console.log(`3. Fills with no Item: ${orphanByItem[0].count}`);

  // ── 4. Items with deaSchedule but isControlled=false ───────────
  const controlMismatch = await prisma.item.count({
    where: { isControlled: false, deaSchedule: { not: null } },
  });
  console.log(`\n4. Items with deaSchedule + isControlled=false: ${controlMismatch}`);
  console.log(`   → run scripts/cleanup-drx-controlled-flag.ts to fix`);

  // ── 5. Items with junk names ──────────────────────────────────
  const allItems = await prisma.item.findMany({
    select: { name: true, genericName: true, brandName: true, ndc: true },
  });
  const junkItems = allItems.filter((it) => isJunkName(it.name));
  const junkWithFallback = junkItems.filter(
    (it) => !isJunkName(it.genericName) || !isJunkName(it.brandName) || !!it.ndc
  );
  console.log(
    `5. Items with junk names: ${junkItems.length} (${junkWithFallback.length} have a usable fallback)`
  );
  console.log(`   → run scripts/cleanup-drx-junk-item-names.ts to fix`);

  // ── 6. Fills stuck > 30 days in active status ─────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeStatuses = [
    "intake",
    "adjudicating",
    "rejected",
    "rph_rejected",
    "print",
    "scan",
    "verify",
    "waiting_bin",
  ];
  const longStuck = await prisma.prescriptionFill.findMany({
    where: {
      status: { in: activeStatuses },
      createdAt: { lt: thirtyDaysAgo },
    },
    select: { id: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\n6. Fills stuck in active status > 30 days: ${longStuck.length}`);

  if (longStuck.length > 0) {
    const byStatus = new Map<string, number>();
    for (const row of longStuck) {
      byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
    }
    console.log("   distribution by status:");
    for (const [s, n] of [...byStatus.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`     ${n.toString().padStart(5)}  ${s}`);
    }
    const oldest = longStuck[0];
    const oldestDays = Math.floor((Date.now() - oldest.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    console.log(`   oldest: ${oldest.id} in "${oldest.status}" for ${oldestDays} days`);
  }

  console.log("\n[audit-orphan-fills] done. no rows were modified.");
}

main()
  .catch((e) => {
    console.error("[audit-orphan-fills] ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
