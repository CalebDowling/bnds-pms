import { getCurrentUser } from "@/lib/auth";
import {
  generateCompoundLabelPDF,
  createSampleLabelData,
  CompoundLabelData,
} from "@/lib/labels/drx-compound-label";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/labels/compound?fillId=xxx
 *   Generate a compound label PDF for a specific fill
 *
 * GET /api/labels/compound?sample=true
 *   Generate a sample/test compound label with dummy data
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const fillId = url.searchParams.get("fillId");
    const isSample = url.searchParams.get("sample") === "true";
    const download = url.searchParams.get("download") === "true";

    let labelData: CompoundLabelData;

    if (isSample) {
      labelData = createSampleLabelData();
    } else if (fillId) {
      labelData = await buildCompoundLabelData(fillId);
    } else {
      return NextResponse.json(
        { error: "Either fillId or sample=true is required" },
        { status: 400 }
      );
    }

    const pdfBuffer = await generateCompoundLabelPDF(labelData);

    const filename = isSample
      ? "compound-label-sample.pdf"
      : `compound-rx-${labelData.rxNumber}-fill-${labelData.fillNumber}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": download
          ? `attachment; filename="${filename}"`
          : "inline",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : "";
    console.error("Error generating compound label:", errMsg, errStack);

    if (errMsg.includes("not found")) {
      return NextResponse.json({ error: "Fill not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: `Failed to generate compound label: ${errMsg}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/labels/compound
 *   Generate a compound label PDF from custom editor data
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Map the POST body to CompoundLabelData, using defaults for missing fields
    const defaults = createSampleLabelData();
    const labelData: CompoundLabelData = {
      ...defaults,
      ...body,
      // Ensure numeric fields
      fillNumber: typeof body.fillNumber === "number" ? body.fillNumber : parseInt(body.fillNumber) || defaults.fillNumber,
      refillsLeft: typeof body.refillsLeft === "number" ? body.refillsLeft : parseInt(body.refillsLeft) || defaults.refillsLeft,
      // Ensure arrays
      auxLabels: Array.isArray(body.auxLabels) ? body.auxLabels : defaults.auxLabels,
      fillTags: Array.isArray(body.fillTags) ? body.fillTags : defaults.fillTags,
      // Ensure booleans
      noClaimWarning: typeof body.noClaimWarning === "boolean" ? body.noClaimWarning : defaults.noClaimWarning,
      holdWarning: typeof body.holdWarning === "boolean" ? body.holdWarning : defaults.holdWarning,
    };

    const pdfBuffer = await generateCompoundLabelPDF(labelData);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : "";
    console.error("Error generating compound label (POST):", errMsg, errStack);
    return NextResponse.json(
      { error: `Failed to generate compound label: ${errMsg}` },
      { status: 500 }
    );
  }
}

/**
 * Build CompoundLabelData from a real PrescriptionFill record
 */
async function buildCompoundLabelData(fillId: string): Promise<CompoundLabelData> {
  const fill = await prisma.prescriptionFill.findUniqueOrThrow({
    where: { id: fillId },
    include: {
      prescription: {
        include: {
          patient: {
            include: {
              addresses: true,
              allergies: true,
              phoneNumbers: true,
            },
          },
          prescriber: true,
          item: true,
          formula: true,
        },
      },
      itemLot: true,
    },
  });

  if (!fill.prescription) {
    throw new Error("Prescription not found for fill");
  }

  const rx = fill.prescription;
  const patient = rx.patient;
  const prescriber = rx.prescriber;
  const item = rx.item;
  const formula = rx.formula;

  // Patient address
  const defaultAddr = patient.addresses.find((a) => a.isDefault) || patient.addresses[0];
  const patientAddressLine1 = defaultAddr?.line1 || "";
  const patientAddressLine2 = defaultAddr?.line2 || "";
  const patientCity = defaultAddr?.city || "";
  const patientState = defaultAddr?.state || "";
  const patientZip = defaultAddr?.zip || "";

  // Patient phones
  const homePhone = patient.phoneNumbers?.find((p) => p.phoneType === "HOME")?.number || "";
  const cellPhone = patient.phoneNumbers?.find((p) => p.phoneType === "CELL" || p.phoneType === "MOBILE")?.number || "";

  // Format dates
  const fmtDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        })
      : "";

  // Directions — expand abbreviations
  const { formatDirections } = await import("@/lib/labels/rx-label");
  const sig = formatDirections(rx.directions);

  // Drug info
  const drugName = item?.name || formula?.name || "Unknown Drug";
  const printName = item?.name || formula?.name || "Unknown Drug";
  const ndc = fill.ndc || item?.ndc || "";

  // Store info for toll-free
  const store = await prisma.store.findFirst({ where: { isActive: true } });

  return {
    patientFirstName: patient.firstName,
    patientLastName: patient.lastName,
    patientDOB: fmtDate(patient.dateOfBirth),
    patientAddressLine1,
    patientAddressLine2,
    patientCity,
    patientState,
    patientZip,
    patientPhone: homePhone,
    patientCellPhone: cellPhone,
    patientDeliveryMethod: "",
    patientComments: "",

    rxNumber: rx.rxNumber,
    fillNumber: fill.fillNumber,
    fillDate: fmtDate(fill.filledAt || fill.createdAt),
    sig,
    refillsLeft: rx.refillsRemaining,
    rxExpires: fmtDate(rx.expirationDate),

    itemName: drugName,
    itemPrintName: printName,
    brandName: "",
    ndc,
    manufacturer: item?.manufacturer || "COMPOUNDED IN-HOUSE",
    boh: "",

    dispensedQuantity: fill.quantity?.toString() || "0",
    qtyType: "",
    copay: "",

    doctorFirstName: prescriber.firstName,
    doctorLastName: prescriber.lastName,
    doctorAddressLine1: prescriber.addressLine1 || "",
    doctorAddressLine2: "",
    doctorCity: prescriber.city || "",
    doctorState: prescriber.state || "",
    doctorZip: prescriber.zip || "",
    doctorPhone: prescriber.phone || "",
    doctorDEA: prescriber.deaNumber || "",
    doctorNPI: prescriber.npi || "",

    pharmacistFirstName: "",
    pharmacistLastName: "",

    primaryInsurance: "",

    batchId: "",
    formulaId: formula?.id || "",
    batchExpiration: "",

    auxLabels: formula ? ["This medication has been compounded by this pharmacy"] : [],
    fillTags: [],
    pickupTime: "",
    noClaimWarning: false,
    holdWarning: false,

    completionQuantity: "",
    partialQuantity: "",

    fillId: fill.id,
    labelVersion: "0",
    itemId: item?.id || "",

    patientEducationUrl: "",
    tollFreeNumber: store?.phone ? `Toll Free ${store.phone}` : "Toll Free 1-855-305-2110",
  };
}
