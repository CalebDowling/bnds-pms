/**
 * scripts/cleanup-drx-junk-item-names.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Backfill `Item.name` for rows where DRX delivered junk in the name field
 * but a real value lives in `genericName` / `brandName` / `ndc`.
 *
 * Why this script exists:
 *   Phase 2 added `formatItemDisplayName` which already falls through to
 *   the same fields for display. But:
 *     1) Reports and analytics that read `item.name` directly still see
 *        "Fl" / "" / "—".
 *     2) Searching by name doesn't find the drug because the search query
 *        targets the column, not the formatter chain.
 *     3) New developers writing queries shouldn't have to remember the
 *        formatter chain — the data should just be right.
 *
 * What counts as "junk":
 *   - null, empty string, or whitespace-only
 *   - 3 chars or fewer with no digit ("Fl", "—", "OK")
 *   We deliberately allow short names containing digits because real
 *   drug rows can be e.g. "B12" or "T3".
 *
 * Safety:
 *   - Dry-run by default. Pass `--apply` to actually update rows.
 *   - Only updates when there's a non-junk fallback available.
 *   - Stamps `metadata.namePatched` with the original junk value + when
 *     so we have an audit trail.
 *
 * Usage:
 *   npx tsx scripts/cleanup-drx-junk-item-names.ts          # dry-run
 *   npx tsx scripts/cleanup-drx-junk-item-names.ts --apply  # execute
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

function isJunkName(s: string | null | undefined): boolean {
  if (!s) return true;
  const t = s.trim();
  if (t.length === 0) return true;
  if (t.length <= 3 && !/\d/.test(t)) return true;
  return false;
}

function pickFallback(item: {
  name: string | null;
  genericName: string | null;
  brandName: string | null;
  ndc: string | null;
}): { value: string; source: "generic" | "brand" | "ndc" } | null {
  if (!isJunkName(item.genericName)) {
    return { value: item.genericName!.trim(), source: "generic" };
  }
  if (!isJunkName(item.brandName)) {
    return { value: item.brandName!.trim(), source: "brand" };
  }
  if (item.ndc && item.ndc.trim()) {
    return { value: `NDC ${item.ndc.trim()}`, source: "ndc" };
  }
  return null;
}

async function main() {
  const mode = APPLY ? "APPLY" : "DRY-RUN";
  console.log(`[cleanup-drx-junk-item-names] ${mode} starting...`);

  // Pull every item — junk names are typically <1% of the catalog so
  // a full scan with in-memory filtering is fine, and the alternative
  // (a Postgres regex) is fragile across DRX's name shapes.
  const all = await prisma.item.findMany({
    select: {
      id: true,
      name: true,
      genericName: true,
      brandName: true,
      ndc: true,
      metadata: true,
    },
  });

  const candidates = all.filter((it) => isJunkName(it.name));
  const fixable = candidates
    .map((it) => ({ item: it, fallback: pickFallback(it) }))
    .filter((c): c is { item: typeof c.item; fallback: NonNullable<typeof c.fallback> } => c.fallback !== null);
  const noFallback = candidates.length - fixable.length;

  console.log(
    `[cleanup-drx-junk-item-names] scanned ${all.length} items, ${candidates.length} have junk names`
  );
  console.log(`[cleanup-drx-junk-item-names]   - ${fixable.length} have a usable fallback`);
  console.log(`[cleanup-drx-junk-item-names]   - ${noFallback} have no fallback (no genericName/brandName/ndc — left alone)`);

  if (fixable.length === 0) {
    console.log("[cleanup-drx-junk-item-names] nothing to do.");
    return;
  }

  const sample = fixable.slice(0, 20);
  console.log("\n[cleanup-drx-junk-item-names] sample (first 20):");
  for (const { item, fallback } of sample) {
    console.log(
      `  ${item.id}  "${item.name ?? "<null>"}" → "${fallback.value}" (from ${fallback.source})`
    );
  }
  if (fixable.length > sample.length) {
    console.log(`  …and ${fixable.length - sample.length} more`);
  }

  if (!APPLY) {
    console.log("\n[cleanup-drx-junk-item-names] dry-run complete — pass --apply to execute.");
    return;
  }

  const stampedAt = new Date().toISOString();
  const result = await prisma.$transaction(
    fixable.map(({ item, fallback }) => {
      const meta = (item.metadata as Prisma.JsonObject) ?? {};
      return prisma.item.update({
        where: { id: item.id },
        data: {
          name: fallback.value,
          metadata: {
            ...meta,
            namePatched: {
              originalName: item.name,
              fallbackSource: fallback.source,
              patchedAt: stampedAt,
            },
          },
        },
      });
    })
  );

  console.log(`\n[cleanup-drx-junk-item-names] applied ${result.length} updates.`);
}

main()
  .catch((e) => {
    console.error("[cleanup-drx-junk-item-names] ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
