import { prisma } from "@/lib/prisma";
import { formatDirections } from "@/lib/labels/rx-label";

/**
 * Maps a PrescriptionFill record to a flat Record<string, string>
 * whose keys match DRX template elementData variable names.
 *
 * The DRX template renderer resolves variables by:
 *   1. Direct key match (e.g. "patient.first_name")
 *   2. camelCase conversion (e.g. "patientFirstName")
 * We emit both forms for maximum compatibility.
 */
export async function buildTemplateDataFromFill(
  fillId: string
): Promise<Record<string, string>> {
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
              insurance: { include: { thirdPartyPlan: true } },
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

  // Store info
  const store = await prisma.store.findFirst({ where: { isActive: true } });

  // Patient address
  const addr =
    patient.addresses.find((a) => a.isDefault) || patient.addresses[0];
  const addrLine1 = addr?.line1 || "";
  const addrLine2 = addr?.line2 || "";
  const city = addr?.city || "";
  const state = addr?.state || "";
  const zip = addr?.zip || "";

  // Patient phones
  const homePhone =
    patient.phoneNumbers?.find((p) => p.phoneType === "HOME")?.number || "";
  const cellPhone =
    patient.phoneNumbers?.find(
      (p) => p.phoneType === "CELL" || p.phoneType === "MOBILE"
    )?.number || "";
  const defaultPhone = homePhone || cellPhone || "";

  // Insurance
  const primaryIns = patient.insurance?.[0];

  // Date formatter — uses UTC parts so that DATE-only columns (DOB, expiration)
  // don't drift by ±1 day depending on the server timezone.
  // Prisma maps Postgres DATE → JS Date as UTC midnight; toLocaleDateString
  // would render that as the previous day in any negative-UTC zone.
  const fmt = (d: Date | null | undefined): string => {
    if (!d) return "";
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const yyyy = String(d.getUTCFullYear());
    return `${mm}/${dd}/${yyyy}`;
  };

  // Date + 365 days
  const fillDate = fill.filledAt || fill.createdAt;
  const fillDatePlus365 = new Date(fillDate);
  fillDatePlus365.setDate(fillDatePlus365.getDate() + 365);

  // SIG
  const sig = formatDirections(rx.directions);

  // Drug info
  const drugName = item?.name || formula?.name || "Unknown Drug";
  const printName = item?.name || formula?.name || drugName;
  const ndc = fill.ndc || item?.ndc || "";
  const ndcFormatted = ndc; // already formatted in DB

  // Prescriber address
  const drAddr1 = prescriber.addressLine1 || "";
  const drAddr2 = "";
  const drCity = prescriber.city || "";
  const drState = prescriber.state || "";
  const drZip = prescriber.zip || "";

  // Build the flat data map — keys match DRX template elementData values
  const data: Record<string, string> = {
    // ── Patient ──
    "patient.first_name": patient.firstName,
    "patient.last_name": patient.lastName,
    "patient.first_name|patient.last_name": `${patient.firstName} ${patient.lastName}`,
    "patient.date_of_birth": fmt(patient.dateOfBirth),
    "patient.default_address.lineOne": addrLine1,
    "patient.default_address.lineTwo": addrLine2,
    "patient.default_address.lineOne|patient.default_address.lineTwo":
      [addrLine1, addrLine2].filter(Boolean).join(" "),
    "patient.default_address.city": city,
    "patient.default_address.state": state,
    "patient.default_address.zip": zip,
    "patient.default_address.city|patient.default_address.state|patient.default_address.zip":
      [city, state, zip].filter(Boolean).join(", "),
    "patient.default_address.lineOne|patient.default_address.lineTwo|patient.default_address.city|patient.default_address.state|patient.default_address.zip":
      [addrLine1, addrLine2, city, state, zip].filter(Boolean).join(" "),
    "patient.default_phone.number": defaultPhone,
    "patient.cell_phone.number": cellPhone,
    "patient.delivery_method": "",
    "patient.easy_open": "",
    "patient.comments": "",
    "patient_education_url": "",

    // ── Prescription ──
    "prescription.sig_translated": sig,
    "prescription.refills": String(rx.refillsRemaining || 0),
    "prescription.total_qty_remaining": String(rx.refillsRemaining || 0),
    "prescription.date_expires": fmt(rx.expirationDate),
    // NB: Rx# (numeric) — NOT the row UUID. The DRX templates expect the
    // pharmacy-facing Rx number (e.g. "725366") so it can be barcoded and
    // human-read on the bottle label.
    "prescription.id": rx.rxNumber,

    // ── Fill ──
    "fill_date": fmt(fillDate),
    "fill_date_plus_365_days": fmt(fillDatePlus365),
    "fill_number": String(fill.fillNumber),
    "dispensed_quantity": String(fill.quantity || 0),
    "dispensed_quantity|qty_type": String(fill.quantity || 0),
    "completion_quantity": "",
    "partial_quantity": "",
    "copay": "",
    "total_ins_paid": "",

    // ── Barcodes ──
    "id|label_version": `b${fill.id}:0`,
    "id|fill_number": `Signature:_________________`,
    "narcotic_label|prescription.id": rx.rxNumber,

    // ── Item / Drug ──
    "item.name": drugName,
    "item.print_name": printName,
    "item.ndcFormatted": ndcFormatted,
    // Only stamp "COMPOUNDED IN-HOUSE" when the Rx itself is flagged as a
    // compound. Some manufactured drugs (e.g. Cetirizine tablets) get linked to
    // a formula record for ingredient tracking but should still print the
    // commercial manufacturer on the bottle.
    "item.manufacturer":
      item?.manufacturer || (rx.isCompound ? "COMPOUNDED IN-HOUSE" : ""),
    "item.boh": "",
    "item.id": item ? `i${item.id}` : "",

    // ── Prescriber ──
    "prescription.doctor.first_name": prescriber.firstName,
    "prescription.doctor.last_name": prescriber.lastName,
    "prescription.doctor.first_name|prescription.doctor.last_name":
      `${prescriber.firstName} ${prescriber.lastName}`,
    "prescription.doctor.dea": prescriber.deaNumber || "",
    "prescription.doctor.npi": prescriber.npi || "",
    "prescription.doctor.default_phone.number": prescriber.phone || "",
    "prescription.doctor.default_address.lineOne": drAddr1,
    "prescription.doctor.default_address.lineTwo": drAddr2,
    "prescription.doctor.default_address.lineOne|prescription.doctor.default_address.lineTwo":
      [drAddr1, drAddr2].filter(Boolean).join(" "),
    "prescription.doctor.default_address.city": drCity,
    "prescription.doctor.default_address.state": drState,
    "prescription.doctor.default_address.zip": drZip,
    "prescription.doctor.default_address.city|prescription.doctor.default_address.state|prescription.doctor.default_address.zip":
      [drCity, drState, drZip].filter(Boolean).join(", "),
    "prescription.doctor.default_address.lineOne|prescription.doctor.default_address.lineTwo|prescription.doctor.default_address.city|prescription.doctor.default_address.state|prescription.doctor.default_address.zip":
      [drAddr1, drAddr2, drCity, drState, drZip].filter(Boolean).join(" "),

    // ── Pharmacist ──
    "pharmacist.first_name": "",
    "pharmacist.last_name": "",

    // ── Compounding ──
    "compound_batch.id": "",
    "compound_batch.compound_formula_id": formula?.id || "",
    "compound_batch.expiration_date": "",

    // ── Insurance ──
    "primary_third_party.name": primaryIns?.thirdPartyPlan?.planName || "",

    // ── Labels & Warnings ──
    "aux_labels": "",
    "prescription_fill_tags": "",
    "pickup_time": "",
    "hold_warning": "",
    "no_paid_claim_warning": "",

    // ── Store / Settings ──
    "settings.name": store?.phone
      ? `Toll Free ${store.phone}`
      : "Toll Free 1-855-305-2110",
  };

  // Also add camelCase versions for the renderer's fallback resolution
  for (const [key, val] of Object.entries(data)) {
    const camelKey = key.replace(/[._|]([a-z])/g, (_, c) => c.toUpperCase());
    if (!data[camelKey]) {
      data[camelKey] = val;
    }
  }

  return data;
}
