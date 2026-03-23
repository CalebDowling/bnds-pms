import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

export type NotificationType =
  | "low_stock"
  | "expiring_lot"
  | "refill_due"
  | "claim_rejected"
  | "batch_expiring"
  | "new_erx"
  | "erx_needs_review"
  | "new_portal_order";

export interface NotificationMetadata {
  itemId?: string;
  itemName?: string;
  lotNumber?: string;
  daysUntilExpiry?: number;
  prescriptionId?: string;
  rxNumber?: string;
  patientId?: string;
  patientName?: string;
  claimNumber?: string;
  rejectionCode?: string;
  batchId?: string;
  [key: string]: any;
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: NotificationMetadata
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata || {},
      },
    });

    return notification;
  } catch (error) {
    console.error(`Failed to create notification for user ${userId}:`, error);
    // Non-blocking: don't throw, just log
    return null;
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string, limit = 20) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return notifications;
  } catch (error) {
    console.error(`Failed to fetch unread notifications for user ${userId}:`, error);
    return [];
  }
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string) {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return count;
  } catch (error) {
    console.error(`Failed to fetch unread count for user ${userId}:`, error);
    return 0;
  }
}

/**
 * Get paginated notifications for a user
 */
export async function getNotifications(
  userId: string,
  { page = 1, limit = 20, unreadOnly = false } = {}
) {
  try {
    const where = { userId, ...(unreadOnly && { isRead: false }) };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error(`Failed to fetch notifications for user ${userId}:`, error);
    return { notifications: [], pagination: { page, limit, total: 0, pages: 0 } };
  }
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string) {
  try {
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return notification;
  } catch (error) {
    console.error(`Failed to mark notification ${notificationId} as read:`, error);
    return null;
  }
}

/**
 * Mark multiple notifications as read
 */
export async function markManyAsRead(notificationIds: string[]) {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: { isRead: true },
    });

    return result;
  } catch (error) {
    console.error("Failed to mark notifications as read:", error);
    return null;
  }
}

/**
 * Mark all unread notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return result;
  } catch (error) {
    console.error(`Failed to mark all notifications as read for user ${userId}:`, error);
    return null;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    const notification = await prisma.notification.delete({
      where: { id: notificationId },
    });

    return notification;
  } catch (error) {
    console.error(`Failed to delete notification ${notificationId}:`, error);
    return null;
  }
}

/**
 * Delete old notifications (older than specified days)
 */
export async function deleteOldNotifications(olderThanDays = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    return result;
  } catch (error) {
    console.error("Failed to delete old notifications:", error);
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTIONS
// ═════════════════════════════════════════════════════════════════

export type NotificationCallback = (notification: any) => void;

/**
 * Subscribe to new notifications for a user using Supabase Realtime
 * Returns an unsubscribe function to clean up the subscription
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: NotificationCallback,
  onError?: (error: Error) => void
): () => void {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Subscribe to INSERT events on notifications table where userId matches
    const channel = supabase
      .channel(`notifications:user:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          try {
            onNotification(payload.new);
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    return () => {};
  }
}

/**
 * Subscribe to new portal orders via notifications
 * Used by pharmacy staff to listen for new prescriber portal orders
 */
export function subscribeToPortalOrders(
  onNewOrder: (notification: any) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Subscribe to new notifications of type "new_portal_order"
    const channel = supabase
      .channel("notifications:portal-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `type=eq.new_portal_order`,
        },
        (payload) => {
          try {
            onNewOrder(payload.new);
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    return () => {};
  }
}
