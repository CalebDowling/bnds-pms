import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrescriberFromRequest } from "@/lib/prescriber-auth";
import { getErrorMessage } from "@/lib/errors";

interface SendMessageBody {
  toAddress?: string;
  subject?: string;
  body?: string;
  channel?: "email" | "sms";
  conversationId?: string;
  message?: string;
  newConversation?: boolean;
  pharmacyContext?: string;
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
            id: msg.id,
            channel: msg.channel,
            participant: otherParty,
            contextLabel: msg.subject || "General Inquiry",
            lastMessage: msg.body || "",
            timestamp: msg.createdAt,
            unread: msg.status === "pending",
            unreadCount: 0,
            messages: [],
          };
        }

        // Count unread messages
        if (msg.status === "pending") {
          acc[key].unreadCount++;
        }

        acc[key].messages.push({
          id: msg.id,
          senderName: msg.direction === "outbound" ? "You" : "Pharmacy",
          isFromPharmacy: msg.direction === "inbound",
          timestamp: msg.createdAt,
          text: msg.body || "",
          isRead: msg.status !== "pending",
        });

        return acc;
      },
      {} as Record<
        string,
        {
          id: string;
          channel: string;
          participant: string;
          contextLabel: string;
          lastMessage: string;
          timestamp: Date;
          unread: boolean;
          unreadCount: number;
          messages: any[];
        }
      >
    );

    const conversationsList = Object.values(conversations)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .map((conv) => ({
        ...conv,
        messages: conv.messages.sort((a: any, b: any) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
      }));

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
    const { toAddress, subject, body: messageBody, channel = "email", conversationId, message, newConversation, pharmacyContext } = body;

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

    // Handle new conversation
    if (newConversation) {
      const communication = await prisma.communicationLog.create({
        data: {
          channel: "email",
          direction: "outbound",
          prescriberId: prescriber.prescriberId,
          fromAddress: prescriberRecord.email,
          toAddress: "pharmacy@pharmacy.local",
          subject: pharmacyContext || "General Inquiry",
          body: "Conversation started",
          status: "delivered",
        },
      });

      return NextResponse.json({
        success: true,
        conversationId: communication.id,
      });
    }

    // Handle message in conversation
    if (conversationId && message) {
      const communication = await prisma.communicationLog.create({
        data: {
          channel: "email",
          direction: "outbound",
          prescriberId: prescriber.prescriberId,
          fromAddress: prescriberRecord.email,
          toAddress: "pharmacy@pharmacy.local",
          subject: "Re: Conversation",
          body: message,
          status: "pending",
        },
      });

      return NextResponse.json({
        success: true,
        message: communication,
      });
    }

    // Legacy behavior - direct message
    if (!toAddress || !subject || !messageBody) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
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
