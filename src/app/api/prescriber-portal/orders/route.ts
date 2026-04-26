import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrescriberFromRequest } from "@/lib/prescriber-auth";
import { getErrorMessage } from "@/lib/errors";
import { logCreate } from "@/lib/audit";
import { generateMRN } from "@/lib/utils/mrn";
import { createNotification } from "@/lib/notifications";

interface OrderRequestBody {
  patientFirstName: string;
  patientLastName: string;
  patientDob: string;
  patientPhone?: string;
  patientAddress?: string;
  patientGender?: string;
  formulaId?: string;
  customCompound?: {
    name: string;
    ingredients: Array<{
      name: string;
      quantity: number;
      unit: string;
    }>;
  };
  quantity: number;
  daysSupply: number;
  directions: string;
  refills: number;
  priority: "normal" | "urgent" | "stat";
  notes?: string;
}

/**
 * Generate the next RX number
 */
async function generateRxNumber(): Promise<string> {
  const lastRx = await prisma.prescription.findFirst({
    orderBy: { rxNumber: "desc" },
    select: { rxNumber: true },
  });

  let nextNumber = 100001;
  if (lastRx?.rxNumber) {
    const num = parseInt(lastRx.rxNumber, 10);
    if (!isNaN(num)) nextNumber = num + 1;
  }

  return nextNumber.toString();
}

/**
 * POST - Submit a new compound prescription order
 */
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

    const body: OrderRequestBody = await request.json();

    // Validate required fields
    const requiredFields = [
      "patientFirstName",
      "patientLastName",
      "patientDob",
      "quantity",
      "daysSupply",
      "directions",
      "refills",
    ];

    for (const field of requiredFields) {
      if (!body[field as keyof OrderRequestBody]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Either formulaId or customCompound required
    if (!body.formulaId && !body.customCompound) {
      return NextResponse.json(
        { error: "Either formulaId or customCompound is required" },
        { status: 400 }
      );
    }

    // Find or create patient
    const patientDob = new Date(body.patientDob);
    let patient = await prisma.patient.findFirst({
      where: {
        firstName: body.patientFirstName,
        lastName: body.patientLastName,
        dateOfBirth: patientDob,
      },
    });

    if (!patient) {
      const mrn = await generateMRN();
      patient = await prisma.patient.create({
        data: {
          mrn,
          firstName: body.patientFirstName,
          lastName: body.patientLastName,
          dateOfBirth: patientDob,
          gender: body.patientGender || undefined,
        },
      });
    }

    // Get the prescriber from the database
    const prescriberRecord = await prisma.prescriber.findUnique({
      where: { id: prescriber.prescriberId },
    });

    if (!prescriberRecord) {
      return NextResponse.json(
        { error: "Prescriber not found" },
        { status: 404 }
      );
    }

    // Generate RX number
    const rxNumber = await generateRxNumber();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create prescription + initial Fill at status="intake" so the order
    // lands in the Workflow Queue's Intake stage immediately. (DRX parity:
    // every Rx — keyed in, prescriber portal, or SureScripts — starts at
    // Intake and walks the same pipeline.)
    const prescription = await prisma.prescription.create({
      data: {
        rxNumber,
        patientId: patient.id,
        prescriberId: prescriberRecord.id,
        status: "intake",
        priority: body.priority || "normal",
        source: "prescriber_portal",
        formulaId: body.formulaId || undefined,
        isCompound: !!body.formulaId || !!body.customCompound,
        quantityPrescribed: body.quantity,
        daysSupply: body.daysSupply,
        directions: body.directions,
        refillsAuthorized: body.refills || 0,
        refillsRemaining: body.refills || 0,
        dateWritten: today,
        prescriberNotes: body.notes,
        metadata: {
          customCompound: body.customCompound || null,
          patientPhone: body.patientPhone || null,
          patientAddress: body.patientAddress || null,
        },
        fills: {
          create: {
            fillNumber: 0,
            status: "intake",
            quantity: body.quantity,
            daysSupply: body.daysSupply,
          },
        },
      },
      select: {
        id: true,
        rxNumber: true,
        status: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log audit
    await logCreate(
      prescriber.prescriberId,
      "prescriptions",
      prescription.id,
      {
        rxNumber: prescription.rxNumber,
        patientName: `${patient.firstName} ${patient.lastName}`,
        source: "prescriber_portal",
        priority: body.priority,
      }
    );

    // Create notifications for pharmacy staff
    // Get all users with pharmacy staff roles from the store
    const pharmacyStaff = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: {
                in: ["pharmacist", "pharmacy_staff", "admin"],
              },
            },
          },
        },
        isActive: true,
      },
      select: { id: true },
    });

    // Send notification to all pharmacy staff
    const notificationPromises = pharmacyStaff.map((staff) =>
      createNotification(
        staff.id,
        "new_portal_order",
        "New Prescriber Portal Order",
        `New compound order received from ${prescriberRecord.firstName} ${prescriberRecord.lastName} for patient ${patient.firstName} ${patient.lastName} (RX: ${prescription.rxNumber})`,
        {
          prescriptionId: prescription.id,
          rxNumber: prescription.rxNumber,
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          prescriberId: prescriberRecord.id,
          prescriberName: `${prescriberRecord.firstName} ${prescriberRecord.lastName}`,
          priority: body.priority || "normal",
        }
      )
    );

    // Fire notifications in background (non-blocking)
    Promise.all(notificationPromises).catch((error) => {
      console.error("Failed to send notifications to pharmacy staff:", error);
    });

    return NextResponse.json({
      success: true,
      prescription: {
        id: prescription.id,
        rxNumber: prescription.rxNumber,
        status: prescription.status,
        patient: prescription.patient,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Order submission error:", message);

    return NextResponse.json(
      { error: "Failed to submit order" },
      { status: 500 }
    );
  }
}

/**
 * GET - List prescriber's submitted orders
 */
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

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const skip = (page - 1) * limit;

    // Fetch prescriptions for this prescriber
    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where: { prescriberId: prescriber.prescriberId },
        select: {
          id: true,
          rxNumber: true,
          status: true,
          priority: true,
          dateReceived: true,
          dateWritten: true,
          daysSupply: true,
          patient: {
            select: {
              firstName: true,
              lastName: true,
              dateOfBirth: true,
            },
          },
          formula: {
            select: {
              name: true,
              dosageForm: true,
            },
          },
          item: {
            select: {
              name: true,
              strength: true,
            },
          },
          fills: {
            select: {
              id: true,
              fillNumber: true,
              status: true,
            },
          },
        },
        orderBy: { dateReceived: "desc" },
        skip,
        take: limit,
      }),
      prisma.prescription.count({
        where: { prescriberId: prescriber.prescriberId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      prescriptions: prescriptions.map((rx) => ({
        id: rx.id,
        rxNumber: rx.rxNumber,
        status: rx.status,
        priority: rx.priority,
        patientName: `${rx.patient.firstName} ${rx.patient.lastName}`,
        patientDob: rx.patient.dateOfBirth,
        medication: rx.formula?.name || rx.item?.name || "Unknown",
        dosageForm: rx.formula?.dosageForm,
        daysSupply: rx.daysSupply,
        dateReceived: rx.dateReceived,
        dateWritten: rx.dateWritten,
        fillCount: rx.fills.length,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Orders fetch error:", message);

    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
