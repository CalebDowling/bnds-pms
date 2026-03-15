import { prisma } from "@/lib/prisma";

export interface LabelData {
  // Patient info
  patientFirstName: string;
  patientLastName: string;
  patientDateOfBirth: Date;
  patientAddress: string;
  patientCity: string;
  patientState: string;
  patientZip: string;

  // Prescription info
  rxNumber: string;
  fillDate: Date;
  fillNumber: number;

  // Drug info
  drugName: string;
  strength: string | null;
  ndc: string | null;

  // Dosage
  directions: string;
  quantity: string;
  daysSupply: number | null;
  refillsRemaining: number;

  // Prescriber info
  prescriberName: string;
  prescriberDea: string | null;

  // Pharmacy info
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyCity: string;
  pharmacyState: string;
  pharmacyZip: string;
  pharmacyPhone: string;

  // Fill details
  lotNumber: string | null;
  budDate: Date | null;

  // Warnings
  allergies: string[];
}

/**
 * Format a date as MM/DD/YYYY
 */
function formatDateMMDDYYYY(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

/**
 * Expand common SIG abbreviations to full directions
 */
export function formatDirections(sig: string | null): string {
  if (!sig) return "";

  const abbreviations: { [key: string]: string } = {
    // Frequency
    "\\bQID\\b": "four times daily",
    "\\bTID\\b": "three times daily",
    "\\bBID\\b": "twice daily",
    "\\bQD\\b": "once daily",
    "\\bOD\\b": "once daily",
    "\\bQOD\\b": "every other day",
    "\\bQH\\b": "every hour",
    "\\bQ\\d+H\\b": "every X hours",
    "\\bPRN\\b": "as needed",
    "\\bQ\\d+D\\b": "every X days",

    // Route
    "\\bPO\\b": "by mouth",
    "\\bPC\\b": "after meals",
    "\\bAC\\b": "before meals",
    "\\bHS\\b": "at bedtime",
    "\\bAM\\b": "in the morning",
    "\\bPM\\b": "in the evening",
    "\\bIM\\b": "intramuscularly",
    "\\bIV\\b": "intravenously",
    "\\bTOPICAL\\b": "apply to skin",
    "\\bINH\\b": "inhale",
    "\\bOPHTH\\b": "in the eye",
    "\\bOTIC\\b": "in the ear",
    "\\bINTRANASAL\\b": "in the nose",
    "\\bRECTAL\\b": "rectally",
    "\\bSL\\b": "under the tongue",
    "\\bBUCCAL\\b": "between cheek and gum",
    "\\bSC\\b": "under the skin",
    "\\bIVP\\b": "intravenous push",
    "\\bIVDRIP\\b": "intravenous drip",

    // Amount
    "\\bMEG\\b": "microgram",
    "\\bMG\\b": "milligram",
    "\\bML\\b": "milliliter",
    "\\bTSP\\b": "teaspoon",
    "\\bTBSP\\b": "tablespoon",
    "\\bTAB\\b": "tablet",
    "\\bCAP\\b": "capsule",
    "\\bDROP\\b": "drop",
    "\\bGT\\b": "drop",

    // Conditions
    "\\bWAC\\b": "with food",
    "\\bWOAC\\b": "without food",
    "\\bAFTER\\b": "after",
    "\\bBEFORE\\b": "before",

    // General
    "\\bX\\b": "for",
    "\\bUD\\b": "as directed",
    "\\bSIG\\b": "label as directed",
  };

  let formatted = sig;
  for (const [pattern, replacement] of Object.entries(abbreviations)) {
    formatted = formatted.replace(new RegExp(pattern, "gi"), replacement);
  }

  return formatted;
}

/**
 * Build complete label data from a PrescriptionFill record
 */
export async function buildLabelData(fillId: string): Promise<LabelData> {
  const fill = await prisma.prescriptionFill.findUniqueOrThrow({
    where: { id: fillId },
    include: {
      prescription: {
        include: {
          patient: {
            include: {
              addresses: true,
              allergies: true,
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

  const prescription = fill.prescription;
  const patient = prescription.patient;
  const prescriber = prescription.prescriber;
  const item = prescription.item;

  // Get default address or first address
  const defaultAddress = patient.addresses.find((a) => a.isDefault);
  const address = defaultAddress || patient.addresses[0];
  const address1 = address?.line1 || "";
  const address2 = address?.line2 || "";
  const city = address?.city || "";
  const state = address?.state || "";
  const zip = address?.zip || "";

  const patientAddress = [address1, address2].filter(Boolean).join(" ");

  // Get allergies as strings (allergen field)
  const allergies = patient.allergies?.map((a) => a.allergen) || [];

  // Drug name and strength
  const drugName = item?.name || prescription.formula?.name || "Unknown Drug";
  const strength = item?.strength || null;
  const ndc = fill.ndc || item?.ndc || null;

  // Format directions with abbreviation expansion
  const directions = formatDirections(prescription.directions);

  // Quantity
  const quantity = fill.quantity?.toString() || "0";

  // Lot information
  const lotNumber = fill.itemLot?.lotNumber || null;
  const budDate = fill.itemLot?.expirationDate || null;

  // Get pharmacy info from Store
  const store = await prisma.store.findFirst({
    where: { isActive: true },
  });

  const pharmacyName = store?.name || "Boudreaux's Pharmacy";
  const pharmacyAddress = store?.addressLine1 || "1824 Line Ave";
  const pharmacyCity = store?.city || "Shreveport";
  const pharmacyState = store?.state || "LA";
  const pharmacyZip = store?.zip || "71101";
  const pharmacyPhone = store?.phone || "(318) 221-4641";

  return {
    // Patient info
    patientFirstName: patient.firstName,
    patientLastName: patient.lastName,
    patientDateOfBirth: patient.dateOfBirth,
    patientAddress,
    patientCity: city,
    patientState: state,
    patientZip: zip,

    // Prescription info
    rxNumber: prescription.rxNumber,
    fillDate: fill.filledAt || fill.createdAt,
    fillNumber: fill.fillNumber,

    // Drug info
    drugName,
    strength,
    ndc,

    // Dosage
    directions,
    quantity,
    daysSupply: fill.daysSupply || prescription.daysSupply,
    refillsRemaining: prescription.refillsRemaining,

    // Prescriber info
    prescriberName: `${prescriber.firstName} ${prescriber.lastName}`,
    prescriberDea: prescriber.deaNumber,

    // Pharmacy info
    pharmacyName,
    pharmacyAddress,
    pharmacyCity,
    pharmacyState,
    pharmacyZip,
    pharmacyPhone,

    // Fill details
    lotNumber,
    budDate,

    // Warnings
    allergies,
  };
}
