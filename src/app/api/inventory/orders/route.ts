import { getCurrentUser } from "@/lib/auth";
import { getOrders, createOrder } from "@/app/(dashboard)/inventory/orders/actions";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/inventory/orders
 * List recent purchase orders with status.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await getOrders();

    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/orders
 * Create a new purchase order and submit to Cardinal Health.
 * Body: { items: [{ ndc, quantity, productName, manufacturer, unit, unitPrice }], notes?, rushDelivery? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items, notes, rushDelivery } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one line item is required. Provide items array with ndc and quantity." },
        { status: 400 }
      );
    }

    // Validate each line item
    for (const item of items) {
      if (!item.ndc || typeof item.ndc !== "string") {
        return NextResponse.json(
          { error: "Each item must have a valid NDC" },
          { status: 400 }
        );
      }
      if (!item.quantity || typeof item.quantity !== "number" || item.quantity < 1) {
        return NextResponse.json(
          { error: `Invalid quantity for NDC ${item.ndc}` },
          { status: 400 }
        );
      }
    }

    const order = await createOrder(
      items.map((item: any) => ({
        ndc: item.ndc,
        productName: item.productName || "Unknown",
        manufacturer: item.manufacturer || "Unknown",
        quantity: item.quantity,
        unit: item.unit || "EA",
        unitPrice: item.unitPrice || 0,
        strength: item.strength,
        dosageForm: item.dosageForm,
        packageSize: item.packageSize,
      })),
      { notes, rushDelivery }
    );

    return NextResponse.json({
      success: true,
      order,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return NextResponse.json(
      {
        error: "Failed to create purchase order",
        detail: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
