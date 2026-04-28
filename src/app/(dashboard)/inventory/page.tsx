/**
 * /inventory — Inventory list (real data).
 *
 * Replaces the previous mock-data hardcoded ITEMS array (Lisinopril,
 * Metformin, etc.) with a real Prisma-backed list. Server-fetches via
 * getItems() which already returns enriched rows (totalOnHand,
 * earliestExpiry, isLow) computed from ItemLot rollups.
 *
 * Search and category filter are wired via URL params (?q, ?category)
 * so the URL is bookmarkable and the page stays a server component.
 *
 * Drug names route through formatItemDisplayName so the 170k DRX rows
 * with item.name=null fall through to genericName/brandName/NDC
 * instead of rendering as raw nulls.
 */
import { getItems } from "./actions";
import { formatItemDisplayName, formatDrugWithStrength, formatDate } from "@/lib/utils/formatters";
import InventoryClient, { type InventoryRow } from "./InventoryClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<{ q?: string; search?: string; category?: string; page?: string }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const search = (sp.q ?? sp.search ?? "").trim();
  const category = sp.category ?? "all";
  const page = Number(sp.page ?? 1);

  const { items, total, pages } = await getItems({ search, category, page, limit: 50 });

  const rows: InventoryRow[] = items.map((item) => {
    // Drug class label: prefer DEA schedule when controlled (e.g. "C-II"),
    // then "Refrigerated" for cold-chain, then "OTC", else "Rx".
    const cls = item.isControlled
      ? (item.deaSchedule ?? "Controlled")
      : item.isRefrigerated
      ? "Rx · CHL"
      : item.isOtc
      ? "OTC"
      : "Rx";

    // Status pill — out/low/ok rule mirrors the mock's tri-state.
    const onHand = Number(item.totalOnHand ?? 0);
    const par = item.reorderPoint != null ? Number(item.reorderPoint) : null;
    const status: "ok" | "low" | "out" =
      onHand <= 0 ? "out" : item.isLow ? "low" : "ok";

    return {
      id: item.id,
      ndc: item.ndc ?? "—",
      name: formatDrugWithStrength(formatItemDisplayName(item), item.strength),
      cls,
      onHand,
      par,
      status,
      // Location isn't stored on Item directly. Future enhancement:
      // pull from a per-store ItemLocation table or metadata.location.
      // For now, omit (mock had values like "A-12" but those were fake).
      location: null,
      earliestExpiry: item.earliestExpiry ? formatDate(item.earliestExpiry) : "—",
      lotCount: item._count?.lots ?? 0,
    };
  });

  return (
    <InventoryClient
      rows={rows}
      total={total}
      page={page}
      totalPages={pages}
      search={search}
      category={category}
    />
  );
}
