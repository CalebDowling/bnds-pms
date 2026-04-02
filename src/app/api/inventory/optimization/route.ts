import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  analyzeItem,
  analyzeAllItems,
} from "@/lib/inventory/optimization-engine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const itemId = searchParams.get("itemId");
    const days = parseInt(searchParams.get("days") || "90", 10);
    const includeDeadStock = searchParams.get("includeDeadStock") !== "false";

    // Clamp analysis window
    const windowDays = Math.min(Math.max(days, 7), 365);

    if (itemId) {
      // Single item analysis
      const analysis = await analyzeItem(itemId);
      return NextResponse.json(analysis);
    }

    // Full optimization analysis
    const result = await analyzeAllItems(windowDays, includeDeadStock);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Inventory Optimization API]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
