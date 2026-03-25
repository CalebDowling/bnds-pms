import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { twilioClient } from "@/lib/integrations/twilio";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { fillId, patientId, phone, patientName, rxNumber } = body;

  if (!phone) {
    return NextResponse.json({ error: "No phone number provided" }, { status: 400 });
  }

  const message = `Boudreaux's Pharmacy: Your prescription${rxNumber ? ` (Rx #${rxNumber})` : ""} is ready for pickup. Please visit us at your convenience. Reply STOP to opt out.`;

  const result = await twilioClient.sendSMS(phone, message);

  if (result.success) {
    // Log the notification
    try {
      await prisma.notification.create({
        data: {
          type: "SMS_PICKUP",
          title: `Pickup SMS sent to ${patientName || phone}`,
          message,
          userId: user.id,
          isRead: true,
        },
      });
    } catch {
      // Non-critical — don't fail the SMS send if logging fails
    }

    return NextResponse.json({
      success: true,
      sid: result.data?.sid,
      status: result.data?.status,
    });
  }

  return NextResponse.json(
    { error: result.error || "Failed to send SMS" },
    { status: 500 }
  );
}
