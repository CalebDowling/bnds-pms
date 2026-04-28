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

  // Dedupe by NDC+name. The DRX item catalog has duplicate rows (same
  // NDC, same name) for several drugs — Lipoderm Base, Lisinopril 10mg,
  // Synthroid 50mcg, Ketamine, Humalog. The walkthrough caught the
  // reorder list showing each twice, which would order double if the
  // operator clicked Build PO. Keep the row with the highest urgency
  // score (lowest current stock relative to par).
  const dedupeKey = (a: typeof alerts[number]) =>
    `${a.ndc ?? "—"}|${a.itemName.toLowerCase().trim()}`;
  const dedupedAlerts = Array.from(
    alerts
      .reduce((acc, a) => {
        const key = dedupeKey(a);
        const existing = acc.get(key);
        if (!existing || existing.urgencyScore < a.urgencyScore) {
          acc.set(key, a);
        }
        return acc;
      }, new Map<string, typeof alerts[number]>())
      .values()
  );

  // Fetch the item to get NDC + strength + manufacturer for nicer display.
  // getReorderAlerts already returns name + ndc but no strength/manufacturer
  // — for the cards-display we want title-cased names with proper fallbacks.
  const rows: ReorderRow[] = dedupedAlerts.map((a) => {
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
      // Surface "Set at order" when no supplier (or fallback)
      // resolved — operators recognize that as "I'll pick when I
      // build the PO" rather than "—" which suggests broken data.
      vendor: a.supplierName ?? "Set at order",
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
