/**
 * POST /api/messaging/send
 * Send a manual notification to a patient
 * Staff only
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { notifyPatient } from "@/lib/messaging/dispatcher";
import { TemplateName } from "@/lib/messaging/templates";
import { Channel } from "@/lib/messaging/dispatcher";
import { TemplateData } from "@/lib/messaging/templates";

interface SendNotificationBody {
  patientId: string;
  template: TemplateName;
  data: TemplateData;
  channels?: Channel[];
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    // TODO: Add permission check for "messaging:send" or "staff"
    // For now, just check that user exists

    const body: SendNotificationBody = await req.json();
    const { patientId, template, data, channels } = body;

    // Validate required fields
    if (!patientId || !template) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, template" },
        { status: 400 }
      );
    }

    // Send notification
    const result = await notifyPatient(patientId, template, data || {}, {
      channels,
      sentBy: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send notification", channels: result.channels },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification sent successfully",
      channels: result.channels,
      communicationLogId: result.communicationLogId,
    });
  } catch (error) {
    console.error("Error sending notification:", error);

    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send notification" },
      { status: 500 }
    );
  }
}
