import { getRealTimeStats } from "@/app/(dashboard)/dashboard/stats-actions";
import { requireUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireUser();
    const stats = await getRealTimeStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error in stats API:", error);
    return NextResponse.json(
      {
        paidClaims: 0,
        rxSold: 0,
        grossProfit: 0,
        efficiency: 0,
        postEdits: 0,
        packagesShipped: 0,
      },
      { status: 500 }
    );
  }
}
