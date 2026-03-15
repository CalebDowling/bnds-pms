"use server";

/**
 * Server actions for messaging dashboard
 */

import { prisma } from "@/lib/prisma";
import { notifyPatient } from "@/lib/messaging/dispatcher";
import { TemplateName, TemplateData } from "@/lib/messaging/templates";
import { Channel } from "@/lib/messaging/dispatcher";
import { requireUser } from "@/lib/auth";

/**
 * Get messaging statistics
 */
export async function getMessagingStats(): Promise<{
  totalSent: number;
  emailsSent: number;
  smsSent: number;
  lastSentAt: string | null;
  byTemplate: Record<string, number>;
}> {
  try {
    const communications = await prisma.communicationLog.findMany({
      where: {
        direction: "outbound",
        channel: { in: ["email", "sms"] },
      },
      select: {
        channel: true,
        templateName: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const emailsSent = communications.filter((c) => c.channel === "email").length;
    const smsSent = communications.filter((c) => c.channel === "sms").length;

    const byTemplate: Record<string, number> = {};
    communications.forEach((c) => {
      if (c.templateName) {
        byTemplate[c.templateName] = (byTemplate[c.templateName] || 0) + 1;
      }
    });

    return {
      totalSent: communications.length,
      emailsSent,
      smsSent,
      lastSentAt: communications[0]?.createdAt?.toISOString() || null,
      byTemplate,
    };
  } catch (error) {
    console.error("Failed to get messaging stats:", error);
    return {
      totalSent: 0,
      emailsSent: 0,
      smsSent: 0,
      lastSentAt: null,
      byTemplate: {},
    };
  }
}

/**
 * Get notification history with filters
 */
export async function getNotificationHistory(filters?: {
  templateName?: string;
  channel?: string;
  patientId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    channel: string;
    patientId: string | null;
    toAddress: string;
    subject: string | null;
    templateName: string | null;
    createdAt: Date;
  }>
> {
  try {
    const {
      templateName,
      channel,
      patientId,
      startDate,
      endDate,
      limit = 50,
    } = filters || {};

    const where: any = {
      direction: "outbound",
      channel: { in: ["email", "sms"] },
    };

    if (templateName) {
      where.templateName = templateName;
    }

    if (channel) {
      where.channel = channel;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const communications = await prisma.communicationLog.findMany({
      where,
      select: {
        id: true,
        channel: true,
        patientId: true,
        toAddress: true,
        subject: true,
        templateName: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return communications;
  } catch (error) {
    console.error("Failed to get notification history:", error);
    return [];
  }
}

/**
 * Send a manual notification to a patient
 */
export async function sendManualNotification(
  patientId: string,
  template: TemplateName,
  data: TemplateData = {},
  channels: Channel[] = ["email", "sms"]
): Promise<{
  success: boolean;
  error?: string;
  communicationLogId?: string;
}> {
  try {
    const user = await requireUser();

    // TODO: Add permission check for messaging

    const result = await notifyPatient(patientId, template, data, {
      channels,
      sentBy: user.id,
    });

    if (!result.success) {
      return {
        success: false,
        error: "Failed to send notification to patient",
      };
    }

    return {
      success: true,
      communicationLogId: result.communicationLogId,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Failed to send manual notification:", errorMsg);

    return {
      success: false,
      error: errorMsg,
    };
  }
}
