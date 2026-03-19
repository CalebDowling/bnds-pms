import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const trackingNumber = request.nextUrl.searchParams.get("trackingNumber");

  if (!trackingNumber) {
    return NextResponse.json(
      { error: "trackingNumber parameter required" },
      { status: 400 }
    );
  }

  try {
    const shipment = await prisma.shipment.findFirst({
      where: { trackingNumber: { equals: trackingNumber, mode: "insensitive" } },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
          },
        },
        address: {
          select: {
            line1: true,
            city: true,
            state: true,
            zip: true,
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      status: shipment.status,
      shipDate: shipment.shipDate,
      estimatedDelivery: shipment.estimatedDelivery,
      actualDelivery: shipment.actualDelivery,
      patient: {
        name: `${shipment.patient.firstName} ${shipment.patient.lastName}`,
        mrn: shipment.patient.mrn,
      },
      address: shipment.address
        ? {
            line1: shipment.address.line1,
            city: shipment.address.city,
            state: shipment.address.state,
            zip: shipment.address.zip,
          }
        : null,
      requiresColdChain: shipment.requiresColdChain,
      requiresSignature: shipment.requiresSignature,
    });
  } catch (error) {
    console.error("[SHIPPING_TRACK_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
