import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrescriberFromRequest } from "@/lib/prescriber-auth";
import { getErrorMessage } from "@/lib/errors";

interface SendMessageBody {
  toAddress: string;
  subject: string;
  body: string;
  channel?: "email" | "sms";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify prescriber authentication
    const prescriber = await getPrescriberFromRequest(request);
    if (!prescriber) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get prescriber record to find their email
    const prescriberRecord = await prisma.prescriber.findUnique({
      where: { id: prescriber.prescriberId },
      select: { email: true },
    });

    if (!prescriberRecord?.email) {
      return NextResponse.json(
        { error: "Prescriber email not found" },
        { status: 404 }
      );
    }

    // Get communication logs involving this prescriber
    const communications = await prisma.communicationLog.findMany({
      where: {
        prescriberId: prescriber.prescriberId,
      },
      select: {
        id: true,
        channel: true,
        direction: true,
        subject: true,
        body: true,
        toAddress: true,
        fromAddress: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Group into conversations by unique participants
    const conversations = communications.reduce(
      (acc, msg) => {
        const otherParty =
          msg.direction === "outbound" ? msg.toAddress : (msg.fromAddress || "unknown");
        const key = `${msg.channel}:${otherParty}`;

        if (!acc[key]) {
          acc[key] = {
            channel: msg.channel,
            participant: otherParty,
            lastMessage: msg.createdAt,
            messages: [],
          };
        }

        acc[key].messages.push({
          id: msg.id,
          direction: msg.direction,
          subject: msg.subject,
          body: msg.body,
          status: msg.status,
          createdAt: msg.createdAt,
        });

        return acc;
      },
      {} as Record<
        string,
        {
          channel: string;
          participant: string;
          lastMessage: Date;
          messages: any[];
        }
      >
    );

    const conversationsList = Object.values(conversations).sort(
      (a, b) => b.lastMessage.getTime() - a.lastMessage.getTime()
    );

    return NextResponse.json({
      success: true,
      conversations: conversationsList,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Messages fetch error:", message);

    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify prescriber authentication
    const prescriber = await getPrescriberFromRequest(request);
    if (!prescriber) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: SendMessageBody = await request.json();
    const { toAddress, subject, body: messageBody, channel = "email" } = body;

    // Validate required fields
    if (!toAddress || !subject || !messageBody) {
      return NextResponse.json(
        { error: "toAddress, subject, and body are required" },
        { status: 400 }
      );
    }

    // Get prescriber record
    const prescriberRecord = await prisma.prescriber.findUnique({
      where: { id: prescriber.prescriberId },
      select: { email: true },
    });

    if (!prescriberRecord?.email) {
      return NextResponse.json(
        { error: "Prescriber email not found" },
        { status: 404 }
      );
    }

    // Create communication log entry
    const communication = await prisma.communicationLog.create({
      data: {
        channel,
        direction: "outbound",
        prescriberId: prescriber.prescriberId,
        fromAddress: prescriberRecord.email,
        toAddress,
        subject,
        body: messageBody,
        status: "pending",
      },
      select: {
        id: true,
        channel: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: communication,
      notice: "Message has been queued for delivery",
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Message send error:", message);

    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
