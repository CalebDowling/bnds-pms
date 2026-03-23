import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrescriberFromRequest } from "@/lib/prescriber-auth";
import { getErrorMessage } from "@/lib/errors";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const prescriber = await getPrescriberFromRequest(request);
    if (!prescriber) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");

    // Get patients this prescriber has written orders for
    const patients = await prisma.patient.findMany({
      where: {
        prescriptions: {
          some: { prescriberId: prescriber.prescriberId },
        },
      },
      include: {
        phoneNumbers: {
          where: { isPrimary: true },
          select: { number: true },
          take: 1,
        },
        prescriptions: {
          where: { prescriberId: prescriber.prescriberId },
          select: { id: true, dateReceived: true },
          orderBy: { dateReceived: "desc" },
        },
      },
    });

    let mappedPatients = patients.map((patient) => {
      const meta = patient.metadata as Record<string, unknown> | null;
      const species = (meta?.species as string) || "human";
      const lastOrder = patient.prescriptions[0];
      const phone = patient.phoneNumbers[0]?.number || null;

      return {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        phone,
        species,
        breed: (meta?.breed as string) || null,
        ownerName: (meta?.ownerName as string) || null,
        lastOrderDate: lastOrder?.dateReceived || null,
        orderCount: patient.prescriptions.length,
        status: patient.status,
      };
    });

    if (typeFilter === "human") {
      mappedPatients = mappedPatients.filter((p) => p.species === "human");
    } else if (typeFilter === "animal") {
      mappedPatients = mappedPatients.filter((p) => p.species !== "human");
    }

    return NextResponse.json({
      success: true,
      patients: mappedPatients,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Patients fetch error:", message);
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}
