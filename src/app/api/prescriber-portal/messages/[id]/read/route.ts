import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrescriberFromRequest } from "@/lib/prescriber-auth";
import { getErrorMessage } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Verify prescriber authentication
    const prescriber = await getPrescriberFromRequest(request);
    if (!prescriber) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const conversationId = params.id;

    // Mark all messages in conversation as read
    await prisma.communicationLog.updateMany({
      where: {
        id: conversationId,
        prescriberId: prescriber.prescriberId,
        direction: "inbound",
        status: "pending",
      },
      data: {
        status: "delivered",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Conversation marked as read",
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Mark read error:", message);

    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
