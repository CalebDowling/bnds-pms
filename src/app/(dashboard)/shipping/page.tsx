/**
 * /shipping — Shipments board (real data).
 *
 * Replaces the previous mock-data ShippingPage (SHP-2204 / Yvette
 * Robichaux etc.) with a real Shipment query via the existing
 * getShipments() action.
 *
 * The mock used 4 lanes (pack / manifest / transit / delivered) which
 * roughly map to Shipment.status values. We keep that visual layout but
 * pull rows from the real table grouped by status.
 */
import { getShipments, getShippingStats } from "./actions";
import { formatPatientName } from "@/lib/utils/formatters";
import ShippingClient, { type LaneId, type ShipmentCard } from "./ShippingClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<{ q?: string; search?: string }>;
}

// Map raw Shipment.status values into the 4 visual lanes the design uses.
// Anything not in the bucket map is dropped from the board (terminal /
// admin states like cancelled aren't actionable here).
const STATUS_TO_LANE: Record<string, LaneId> = {
  pending: "pack",
  packing: "pack",
  packed: "manifest",
  ready: "manifest",
  awaiting_pickup: "manifest",
  in_transit: "transit",
  out_for_delivery: "transit",
  delivered: "delivered",
};

export default async function ShippingPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const search = (sp.q ?? sp.search ?? "").trim();

  // Pull a generous slice across all statuses; the board groups by
  // lane client-side. 200 is a sensible upper bound — most pharmacy
  // shipping boards run with tens of active shipments at a time.
  const [{ shipments }, stats] = await Promise.all([
    getShipments({ search, limit: 200 }),
    getShippingStats(),
  ]);

  // Group into the 4 visual lanes.
  const lanes: Record<LaneId, ShipmentCard[]> = {
    pack: [],
    manifest: [],
    transit: [],
    delivered: [],
  };

  for (const s of shipments as any[]) {
    const lane = STATUS_TO_LANE[s.status];
    if (!lane) continue;

    const dest = s.address
      ? [s.address.city, s.address.state].filter(Boolean).join(", ") || "—"
      : "—";

    const card: ShipmentCard = {
      id: s.id,
      shipmentNumber: s.shipmentNumber || s.id.slice(0, 8),
      patient: s.patient ? formatPatientName(s.patient) : "Unknown",
      itemCount: s.itemCount ?? 0,
      destination: dest,
      service:
        s.carrier && s.serviceLevel
          ? `${s.carrier} · ${s.serviceLevel}`
          : s.carrier ?? s.serviceLevel ?? "—",
      tracking: s.trackingNumber ?? null,
      priority: s.priority === "high" || s.priority === "rush",
      cold: !!s.requiresRefrigeration,
      eta: s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString() : null,
      delivered: s.deliveredAt ? new Date(s.deliveredAt).toLocaleString() : null,
    };
    lanes[lane].push(card);
  }

  return (
    <ShippingClient
      lanes={lanes}
      stats={{
        active: stats.pending + stats.shipped,
        deliveredToday: stats.shippedToday,
        coldChain: shipments.filter((s: any) => s.requiresRefrigeration).length,
      }}
      search={search}
    />
  );
}
