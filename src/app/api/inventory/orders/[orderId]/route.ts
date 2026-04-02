import { getCurrentUser } from "@/lib/auth";
import { getOrderDetail } from "@/app/(dashboard)/inventory/orders/actions";
import { getDeliveryTracking } from "@/lib/integrations/cardinal-health";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/inventory/orders/[orderId]
 * Get full order detail with line items and tracking.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = await getOrderDetail(orderId);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Try to get tracking info if the order has been shipped
    let tracking = null;
    if (order.cardinalOrderId && ["shipped", "delivered"].includes(order.status)) {
      try {
        tracking = await getDeliveryTracking(order.cardinalOrderId);
      } catch {
        // Tracking may not be available yet
      }
    }

    return NextResponse.json({
      success: true,
      order,
      tracking,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching order detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch order detail" },
      { status: 500 }
    );
  }
}
