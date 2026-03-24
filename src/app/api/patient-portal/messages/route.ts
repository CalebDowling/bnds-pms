import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseSession } from "@/lib/supabase-auth";
import { getErrorMessage } from "@/lib/errors";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify patient from Supabase Auth token
    const authContext = await getSupabaseSession(request);

    if (!authContext) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find patient record by email
    const patient = await prisma.patient.findFirst({
      where: {
        email: authContext.email,
        status: "active",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient record not found" },
        { status: 404 }
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
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          senderType: "patient",
          threadId: `patient_${patient.id}_${Date.now()}`,
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
    // Verify patient from Supabase Auth token
    const authContext = await getSupabaseSession(request);

    if (!authContext) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find patient record by email
    const patient = await prisma.patient.findFirst({
      where: {
        email: authContext.email,
        status: "active",
      },
      select: {
        id: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient record not found" },
        { status: 404 }
      );
    }

    // Fetch all messages for this patient
    // Uses notification table filtered by patient metadata
    const messages = await prisma.notification.findMany({
      where: {
        metadata: {
          path: ["patientId"],
          equals: patient.id,
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
