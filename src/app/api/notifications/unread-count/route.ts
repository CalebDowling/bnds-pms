import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/notifications";

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for current user
 */
export async function GET() {
  try {
    const user = await requireUser();
    const count = await getUnreadCount(user.id);

    return NextResponse.json({ unreadCount: count });
  } catch (error) {
    console.error("Error fetching unread count:", error);

    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
