export const dynamic = "force-dynamic";

import { getOrders } from "./actions";
import { PurchaseOrdersClient } from "./client";

export default async function PurchaseOrdersPage() {
  let initialOrders: Awaited<ReturnType<typeof getOrders>> = [];

  try {
    initialOrders = await getOrders();
  } catch (error) {
    console.error("Failed to load purchase orders:", error);
  }

  return <PurchaseOrdersClient initialOrders={initialOrders} />;
}
