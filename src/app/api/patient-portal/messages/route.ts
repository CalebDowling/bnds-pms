import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { getErrorMessage } from "@/lib/errors";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify patient from token
    const patient = await getPatientFromRequest(request);

    if (!patient) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subject, message } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

    // Create a notification to store the message
    // This creates a record that pharmacy staff can see and respond to
    const notification = await prisma.notification.create({
      data: {
        userId: "", // Empty since this is patient->pharmacy, not user->user
        type: "new_erx" as any, // Use generic type
        title: subject,
        message: message,
        metadata: {
          messageType: "patient_message",
          patientId: patient.patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          senderType: "patient",
          threadId: `patient_${patient.patientId}_${Date.now()}`,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: {
        id: notification.id,
        subject,
        message,
        sentAt: notification.createdAt,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Message creation error:", message);

    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify patient from token
    const patient = await getPatientFromRequest(request);

    if (!patient) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all messages for this patient
    // Uses notification table filtered by patient metadata
    const messages = await prisma.notification.findMany({
      where: {
        metadata: {
          path: ["patientId"],
          equals: patient.patientId,
        },
      },
      select: {
        id: true,
        title: true,
        message: true,
        createdAt: true,
        isRead: true,
        metadata: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      messages: messages.map((msg) => {
        const meta = msg.metadata as Record<string, any> | null;
        return {
          id: msg.id,
          subject: msg.title,
          message: msg.message,
          sentAt: msg.createdAt,
          isRead: msg.isRead,
          senderType: meta?.senderType || "unknown",
        };
      }),
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
