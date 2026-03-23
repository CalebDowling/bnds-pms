import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrescriberFromRequest } from "@/lib/prescriber-auth";
import { getErrorMessage } from "@/lib/errors";

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

    // Get prescriber record
    const prescriberRecord = await prisma.prescriber.findUnique({
      where: { id: prescriber.prescriberId },
    });

    if (!prescriberRecord) {
      return NextResponse.json(
        { error: "Prescriber not found" },
        { status: 404 }
      );
    }

    // Get order statistics
    const [totalOrders, pendingOrders, completedOrders, activePatients] =
      await Promise.all([
        prisma.prescription.count({
          where: { prescriberId: prescriber.prescriberId },
        }),
        prisma.prescription.count({
          where: {
            prescriberId: prescriber.prescriberId,
            status: { in: ["intake", "pending", "in_progress"] },
          },
        }),
        prisma.prescription.count({
          where: {
            prescriberId: prescriber.prescriberId,
            status: "completed",
          },
        }),
        prisma.patient.findMany({
          distinct: ["id"],
          where: {
            prescriptions: {
              some: { prescriberId: prescriber.prescriberId },
            },
          },
          select: { id: true },
        }),
      ]);

    // Get recent orders (last 10)
    const recentOrders = await prisma.prescription.findMany({
      where: { prescriberId: prescriber.prescriberId },
      select: {
        id: true,
        status: true,
        dateReceived: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        formula: {
          select: {
            name: true,
          },
        },
        item: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { dateReceived: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        activePatients: activePatients.length,
      },
      recentOrders: recentOrders.map((rx) => ({
        id: rx.id,
        patientName: `${rx.patient.firstName} ${rx.patient.lastName}`,
        medication: rx.formula?.name || rx.item?.name || "Unknown",
        status: rx.status,
        dateReceived: rx.dateReceived,
      })),
      prescriber: {
        id: prescriberRecord.id,
        firstName: prescriberRecord.firstName,
        lastName: prescriberRecord.lastName,
        npi: prescriberRecord.npi,
        email: prescriberRecord.email,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Dashboard fetch error:", message);

    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
