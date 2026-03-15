import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getNotifications,
  markAsRead,
  markManyAsRead,
  markAllAsRead,
  getUnreadCount,
} from "@/lib/notifications";

/**
 * GET /api/notifications
 * Get notifications for the current user
 *
 * Query parameters:
 *   - page: number (default 1)
 *   - limit: number (default 20, max 100)
 *   - unreadOnly: boolean (default false)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const result = await getNotifications(user.id, { page, limit, unreadOnly });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching notifications:", error);

    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 *
 * Body:
 *   - notificationIds?: string[] (mark specific notifications)
 *   - markAllAsRead?: boolean (mark all unread as read)
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const { notificationIds, markAll } = body;

    if (markAll === true) {
      await markAllAsRead(user.id);
      const unreadCount = await getUnreadCount(user.id);
      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
        unreadCount,
      });
    }

    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await markManyAsRead(notificationIds);
      const unreadCount = await getUnreadCount(user.id);
      return NextResponse.json({
        success: true,
        message: `${notificationIds.length} notifications marked as read`,
        unreadCount,
      });
    }

    return NextResponse.json({ error: "No action specified" }, { status: 400 });
  } catch (error) {
    console.error("Error updating notifications:", error);

    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update notifications" },
      { status: 500 }
    );
  }
}
