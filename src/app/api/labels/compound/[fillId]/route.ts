import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCompoundLabelPDF, type CompoundLabelData } from "@/lib/labels/drx-compound-label";

/**
 * GET /api/labels/compound/{fillId}
 * Generates a compound label PDF for a specific prescription fill.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fillId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fillId } = await params;
  const download = request.nextUrl.searchParams.get("download") === "true";

  const fill = await prisma.prescriptionFill.findUnique({
    where: { id: fillId },
    include: {
      prescription: {
        include: {
          patient: {
            include: {
              addresses: { where: { isDefault: true }, take: 1 },
              phoneNumbers: { take: 2 },
            },
          },
          item: true,
          formula: true,
          prescriber: true,
        },
      },
      batch: {
        include: {
          formulaVersion: { include: { formula: true } },
        },
      },
      itemLot: true,
    },
  });

  if (!fill) {
    return NextResponse.json({ error: "Fill not found" }, { status: 404 });
  }

  const rx = fill.prescription;
  const patient = rx.patient;
  const doctor = rx.prescriber;
  const addr = patient.addresses[0];
  const patPhone = patient.phoneNumbers.find((p: any) => p.type === "home" || p.type === "mobile") || patient.phoneNumbers[0];
  const patCell = patient.phoneNumbers.find((p: any) => p.type === "mobile");

  const labelData: CompoundLabelData = {
    patientFirstName: patient.firstName,
    patientLastName: patient.lastName,
    patientDOB: patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString("en-US") : "",
    patientAddressLine1: addr?.line1 || "",
    patientAddressLine2: addr?.line2 || "",
    patientCity: addr?.city || "",
    patientState: addr?.state || "",
    patientZip: addr?.zip || "",
    patientPhone: patPhone?.number || "",
    patientCellPhone: patCell?.number || "",
    patientDeliveryMethod: (rx as any).deliveryMethod || "",
    patientComments: (patient as any).comments || "",

    rxNumber: rx.rxNumber || "",
    fillNumber: fill.fillNumber,
    fillDate: new Date(fill.createdAt).toLocaleDateString("en-US"),
    sig: (rx as any).sigTranslated || (rx as any).sig || "",
    refillsLeft: (rx as any).refillsRemaining ?? 0,
    rxExpires: (rx as any).dateExpires ? new Date((rx as any).dateExpires).toLocaleDateString("en-US") : "",

    itemName: rx.item?.name || rx.formula?.name || "",
    itemPrintName: (rx.item as any)?.printName || rx.item?.name || rx.formula?.name || "",
    brandName: (rx.item as any)?.brandName || "",
    ndc: rx.item?.ndc || "",
    manufacturer: (rx.item as any)?.manufacturer || "",
    boh: "",

    dispensedQuantity: String(Number(fill.quantity)),
    qtyType: (rx as any).quantityType || "",
    copay: String(Number((fill as any).copay || 0)),

    doctorFirstName: doctor?.firstName || "",
    doctorLastName: doctor?.lastName || "",
    doctorAddressLine1: doctor?.addressLine1 || "",
    doctorAddressLine2: "",
    doctorCity: doctor?.city || "",
    doctorState: doctor?.state || "",
    doctorZip: doctor?.zip || "",
    doctorPhone: doctor?.phone || "",
    doctorDEA: doctor?.deaNumber || "",
    doctorNPI: doctor?.npi || "",

    pharmacistFirstName: (user as any).firstName || "",
    pharmacistLastName: (user as any).lastName || "",

    primaryInsurance: "",

    batchId: fill.batch?.batchNumber || "",
    formulaId: fill.batch?.formulaVersion?.formula?.formulaCode || "",
    batchExpiration: fill.batch?.budDate ? new Date(fill.batch.budDate).toLocaleDateString("en-US") : "",

    auxLabels: [],
    fillTags: [],
    pickupTime: "",
    noClaimWarning: false,
    holdWarning: false,

    completionQuantity: "",
    partialQuantity: "",

    fillId: fill.id,
    labelVersion: "0",
    itemId: rx.item?.id || rx.formula?.id || "",

    patientEducationUrl: "",
    tollFreeNumber: "Toll Free 1-855-305-2110",
  };

  const pdf = await generateCompoundLabelPDF(labelData);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": download
        ? `attachment; filename="label-${rx.rxNumber}-${fill.fillNumber}.pdf"`
        : `inline; filename="label-${rx.rxNumber}-${fill.fillNumber}.pdf"`,
    },
  });
}
