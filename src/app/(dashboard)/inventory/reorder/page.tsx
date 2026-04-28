/**
 * /inventory/reorder — Reorder list (real data).
 *
 * Replaces the mock-data hardcoded ITEMS list. Server-fetches via
 * getReorderAlerts() which scans all active items below reorderPoint
 * and computes urgency score + suggested quantity. Existing function;
 * we just connect it to the page.
 *
 * The Auto-build cart / Send orders buttons are deep-linked to the
 * existing /inventory/orders flow which already has a real form.
 */
import { getReorderAlerts } from "./actions";
import { formatItemDisplayName, formatDrugWithStrength } from "@/lib/utils/formatters";
import ReorderClient, { type ReorderRow } from "./ReorderClient";

export const dynamic = "force-dynamic";

export default async function ReorderPage() {
  const alerts = await getReorderAlerts();

  // Group counts so the subtitle ("X SKUs below par · Y out of stock")
  // is real instead of the mock "32 / 4" placeholder.
  const outOfStock = alerts.filter((a) => a.currentStock <= 0).length;
  const belowPar = alerts.length;

  // Fetch the item to get NDC + strength + manufacturer for nicer display.
  // getReorderAlerts already returns name + ndc but no strength/manufacturer
  // — for the cards-display we want title-cased names with proper fallbacks.
  const rows: ReorderRow[] = alerts.map((a) => {
    // formatItemDisplayName needs the {name, genericName, brandName, ndc}
    // shape; the alert only has name + ndc, but that's enough for the
    // common case where name is present. Junk-name DRX rows will fall
    // through to "NDC <code>" instead of "Unknown drug".
    const formattedName = formatItemDisplayName({
      name: a.itemName,
      ndc: a.ndc ?? null,
    });
    return {
      itemId: a.itemId,
      ndc: a.ndc ?? "—",
      name: formattedName,
      currentStock: a.currentStock,
      reorderPoint: a.reorderPoint,
      suggestedQuantity: a.suggestedQuantity,
      unitOfMeasure: a.unitOfMeasure ?? "",
      vendor: a.supplierName ?? "—",
      urgency: a.urgencyScore,
      status: (a.currentStock <= 0
        ? "out"
        : a.currentStock <= a.reorderPoint * 0.5
        ? "critical"
        : "low") as "out" | "critical" | "low",
    };
  });

  return (
    <ReorderClient rows={rows} outOfStockCount={outOfStock} belowParCount={belowPar} />
  );
}
