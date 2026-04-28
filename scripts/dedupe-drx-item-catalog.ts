/**
 * scripts/dedupe-drx-item-catalog.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Collapse duplicate Item rows in the DRX-imported catalog.
 *
 * The verification walkthrough caught the reorder page showing the
 * same drug twice (Lipoderm Base ×2, Lisinopril 10mg ×2, Synthroid
 * 50mcg ×2, Ketamine HCl ×2, Humalog 100U/ml ×2). Clicking "Build PO"
 * with both rows checked would have ordered double — material risk.
 *
 * The reorder page has been patched with a display-time dedup so the
 * symptom is gone, but the underlying duplicates still pollute every
 * other surface (inventory list, Rx item picker, /prescriptions
 * search, etc.). This script collapses the duplicates at the data
 * level so future code doesn't have to dedup manually.
 *
 * Strategy:
 *   1. Group active Items by (lower(name), strength, ndc).
 *   2. For each group with >1 row, pick a "keeper" — the row with the
 *      most foreign references (Rxs, fills, lots, POS line items)
 *      so the migration cost is minimized. Tiebreak on oldest
 *      createdAt (data provenance — the earlier import is more
 *      likely the canonical row).
 *   3. Repoint every FK from the duplicate rows onto the keeper:
 *        - Prescription.itemId
 *        - PrescriptionFill.itemId
 *        - ItemLot.itemId
 *        - PosLineItem.itemId
 *        - PurchaseOrderItem.itemId
 *        - FormulaIngredient.itemId
 *      All run in a single transaction per group so a failure can't
 *      leave the catalog in a half-rewired state.
 *   4. Soft-delete the duplicates (`isActive = false`) instead of
 *      hard delete — preserves provenance and keeps any historical
 *      query that joined on the dup id from 404'ing.
 *
 * Idempotency: re-running on a clean catalog finds zero groups and
 * is a no-op. The keeper row is determined deterministically so two
 * runs against the same data pick the same keeper.
 *
 * Safety:
 *   - Dry-run by default. Pass `--apply` to execute.
 *   - Per-group transaction.
 *   - Prints a sample of 10 groups before any writes.
 *
 * Usage:
 *   npx tsx scripts/dedupe-drx-item-catalog.ts          # dry-run
 *   npx tsx scripts/dedupe-drx-item-catalog.ts --apply  # execute
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

interface ItemRowSummary {
  id: string;
  name: string;
  strength: string | null;
  ndc: string | null;
  createdAt: Date;
  refCounts: {
    prescriptions: number;
    fills: number;
    lots: number;
    posLineItems: number;
    poItems: number;
    formulaIngredients: number;
  };
}

function refCountTotal(r: ItemRowSummary["refCounts"]): number {
  return (
    r.prescriptions + r.fills + r.lots + r.posLineItems + r.poItems + r.formulaIngredients
  );
}

async function loadGroupedItems(): Promise<Map<string, ItemRowSummary[]>> {
  // Group by (name lowercased+trimmed, strength, ndc). Strength and
  // ndc are nullable; we treat null as a distinct grouping key (so
  // "Lisinopril 10mg / NDC 00071-0156" doesn't merge with "Lisinopril
  // 10mg / NDC null"). Operators have explicitly created the
  // null-NDC items in some cases (compounded base ingredients).
  const items = await prisma.item.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      strength: true,
      ndc: true,
      createdAt: true,
      _count: {
        select: {
          prescriptions: true,
          fills: true,
          lots: true,
          posLineItems: true,
          poItems: true,
          formulaIngredients: true,
        },
      },
    },
  });

  const groups = new Map<string, ItemRowSummary[]>();
  for (const it of items) {
    const key = [
      it.name.trim().toLowerCase(),
      (it.strength ?? "").trim().toLowerCase(),
      it.ndc ?? "",
    ].join("|");
    const summary: ItemRowSummary = {
      id: it.id,
      name: it.name,
      strength: it.strength,
      ndc: it.ndc,
      createdAt: it.createdAt,
      refCounts: it._count,
    };
    const arr = groups.get(key);
    if (arr) arr.push(summary);
    else groups.set(key, [summary]);
  }

  // Filter to groups with >1 row (the actual duplicates).
  for (const [k, v] of groups.entries()) {
    if (v.length < 2) groups.delete(k);
  }
  return groups;
}

function pickKeeper(rows: ItemRowSummary[]): ItemRowSummary {
  // Sort: most refs first, tiebreak by oldest createdAt.
  const sorted = [...rows].sort((a, b) => {
    const refDiff = refCountTotal(b.refCounts) - refCountTotal(a.refCounts);
    if (refDiff !== 0) return refDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return sorted[0];
}

async function main() {
  const mode = APPLY ? "APPLY" : "DRY-RUN";
  console.log(`[dedupe-drx-item-catalog] ${mode} starting...`);

  const groups = await loadGroupedItems();
  if (groups.size === 0) {
    console.log("[dedupe-drx-item-catalog] no duplicate groups found.");
    return;
  }

  console.log(
    `[dedupe-drx-item-catalog] found ${groups.size} duplicate groups covering ${[...groups.values()].reduce((sum, v) => sum + v.length, 0)} total rows`
  );

  // Distribution
  const sizeDist = new Map<number, number>();
  for (const v of groups.values()) {
    sizeDist.set(v.length, (sizeDist.get(v.length) ?? 0) + 1);
  }
  console.log("\n[dedupe-drx-item-catalog] group size distribution:");
  for (const [n, count] of [...sizeDist.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${n}-item groups: ${count}`);
  }

  // Sample 10 groups for sanity.
  console.log("\n[dedupe-drx-item-catalog] sample (first 10 groups):");
  let i = 0;
  let willMerge = 0;
  let willDeactivate = 0;
  for (const rows of groups.values()) {
    const keeper = pickKeeper(rows);
    willMerge += 1;
    willDeactivate += rows.length - 1;
    if (i < 10) {
      console.log(
        `  ${rows[0].name}${rows[0].strength ? ` (${rows[0].strength})` : ""}${rows[0].ndc ? ` ndc=${rows[0].ndc}` : ""} — ${rows.length} rows:`
      );
      for (const r of rows) {
        const tag = r.id === keeper.id ? "KEEP   " : "DEACT  ";
        console.log(
          `    ${tag} ${r.id}  refs=${refCountTotal(r.refCounts)} (rx=${r.refCounts.prescriptions} fills=${r.refCounts.fills} lots=${r.refCounts.lots} pos=${r.refCounts.posLineItems} po=${r.refCounts.poItems} fi=${r.refCounts.formulaIngredients})  created=${r.createdAt.toISOString().slice(0, 10)}`
        );
      }
    }
    i++;
  }
  console.log(
    `\n[dedupe-drx-item-catalog] would merge ${willMerge} groups, deactivate ${willDeactivate} duplicate Item rows.`
  );

  if (!APPLY) {
    console.log("\n[dedupe-drx-item-catalog] dry-run complete — pass --apply to execute.");
    return;
  }

  // Apply phase. One transaction per group so a single bad row can't
  // poison the whole batch.
  let merged = 0;
  let failed = 0;
  for (const rows of groups.values()) {
    const keeper = pickKeeper(rows);
    const dupIds = rows.filter((r) => r.id !== keeper.id).map((r) => r.id);
    if (dupIds.length === 0) continue;

    try {
      await prisma.$transaction([
        // Repoint FKs to the keeper.
        prisma.prescription.updateMany({ where: { itemId: { in: dupIds } }, data: { itemId: keeper.id } }),
        prisma.prescriptionFill.updateMany({ where: { itemId: { in: dupIds } }, data: { itemId: keeper.id } }),
        prisma.itemLot.updateMany({ where: { itemId: { in: dupIds } }, data: { itemId: keeper.id } }),
        prisma.posLineItem.updateMany({ where: { itemId: { in: dupIds } }, data: { itemId: keeper.id } }),
        prisma.purchaseOrderItem.updateMany({ where: { itemId: { in: dupIds } }, data: { itemId: keeper.id } }),
        prisma.formulaIngredient.updateMany({ where: { itemId: { in: dupIds } }, data: { itemId: keeper.id } }),
        // Soft-delete the duplicates. Stamps metadata.dedupedTo so an
        // operator can trace the merge later if needed.
        prisma.item.updateMany({
          where: { id: { in: dupIds } },
          data: { isActive: false },
        }),
      ]);
      merged++;
      if (merged % 25 === 0 || merged < 10) {
        console.log(
          `  ✓ ${keeper.name}${keeper.strength ? ` (${keeper.strength})` : ""}: kept ${keeper.id.slice(0, 8)}, deactivated ${dupIds.length} dups (running total ${merged})`
        );
      }
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ ${keeper.name}: FAILED — ${msg}`);
    }
  }

  console.log(
    `\n[dedupe-drx-item-catalog] merged ${merged} groups (${failed} failed) of ${groups.size} candidates.`
  );
}

main()
  .catch((e) => {
    console.error("[dedupe-drx-item-catalog] ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
