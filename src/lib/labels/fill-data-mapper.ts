import { prisma } from "@/lib/prisma";
import { formatDirections } from "@/lib/labels/rx-label";
import { toTitleCase as sharedToTitleCase, formatDrugName } from "@/lib/utils/formatters";

/**
 * Re-export the centralized title-caser so existing imports of
 * `toTitleCase` from this module keep working. Source of truth lives
 * in `src/lib/utils/formatters.ts`.
 */
export const toTitleCase = sharedToTitleCase;

/**
 * DEA-schedule-aware expiration cutoff for a label.
 *   - Schedule II:           fillDate + 6 months
 *   - Schedules III, IV, V:  fillDate + 6 months
 *   - Non-controlled / null: fillDate + 1 year
 *
 * Returns a new Date (does not mutate input).
 */
export function computeExpirationDate(
  fillDate: Date,
  deaSchedule: string | null | undefined
): Date {
  const out = new Date(fillDate);
  const sched = (deaSchedule || "").trim().toUpperCase();
  // Match "II", "C-II", "CII", "2", etc.
  const isControlled = /^(C-?)?(II|III|IV|V|2|3|4|5)$/.test(sched);
  if (isControlled) {
    out.setMonth(out.getMonth() + 6);
  } else {
    out.setFullYear(out.getFullYear() + 1);
  }
  return out;
}

/**
 * Aux warning label map — keyed by case-insensitive substrings of the drug
 * name. The first matching rule contributes its warnings; multiple rules can
 * stack (e.g. an opioid that also matches a brand-specific rule).
 *
 * Returns a newline-joined string suitable for the DRX template's repeating
 * `aux_labels` element (which splits on \n and renders one slot per line).
 */
export function buildAuxWarnings(drugName: string): string {
  if (!drugName) return "";
  const name = drugName.toLowerCase();
  const warnings: string[] = [];

  const opioidNeedles = [
    "hydrocodone",
    "oxycodone",
    "tramadol",
    "morphine",
    "codeine",
    "fentanyl",
    "hydromorphone",
    "oxymorphone",
    "buprenorphine",
    "methadone",
  ];
  const ssriNeedles = [
    "sertraline",
    "fluoxetine",
    "paroxetine",
    "citalopram",
    "escitalopram",
    "fluvoxamine",
  ];

  if (name.includes("lisinopril")) {
    warnings.push(
      "Take with or without food. May cause dizziness. Avoid potassium supplements unless directed."
    );
  }
  if (name.includes("metformin")) {
    warnings.push("Take with food to reduce stomach upset.");
  }
  if (opioidNeedles.some((n) => name.includes(n))) {
    warnings.push(
      "May cause drowsiness. Do not drink alcohol. Do not drive."
    );
  }
  if (name.includes("amoxicillin") || name.includes("penicillin")) {
    warnings.push(
      "Finish all medication unless otherwise directed by your doctor."
    );
  }
  if (ssriNeedles.some((n) => name.includes(n))) {
    warnings.push(
      "May cause drowsiness. Avoid alcohol. May take 2-4 weeks to feel full effect."
    );
  }

  return warnings.join("\n");
}

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
  // Title Case the street/city, but keep state as 2-letter uppercase
  // and zip as raw digits.
  const addrLine1 = toTitleCase(addr?.line1 || "");
  const addrLine2 = toTitleCase(addr?.line2 || "");
  const city = toTitleCase(addr?.city || "");
  const state = (addr?.state || "").toUpperCase();
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

  const fillDate = fill.filledAt || fill.createdAt;

  // Schedule-aware expiration: CII–CV → +6mo, otherwise +1yr. Wired into
  // the "Use until ___" template slot (replaces the prior naive +365 days).
  const expirationDate = computeExpirationDate(fillDate, item?.deaSchedule ?? null);

  // SIG
  const sig = formatDirections(rx.directions);

  // Drug info — preserve raw values for aux-warning matching, but render
  // labels in Title Case. formatDrugName keeps unit tokens like "mg",
  // "mL", "HCl", "ER" properly cased.
  const rawDrugName = item?.name || formula?.name || "Unknown Drug";
  const drugName = formatDrugName(rawDrugName);
  const printName = formatDrugName(item?.name || formula?.name || rawDrugName);
  const ndc = fill.ndc || item?.ndc || "";
  const ndcFormatted = ndc; // already formatted in DB

  // Aux warning labels — match against the RAW (lowercased internally)
  // drug name so opioid/SSRI/antibiotic detection isn't sensitive to
  // Title Case formatting.
  const auxWarnings = buildAuxWarnings(rawDrugName);

  // Display-only Title Case for the patient name. We do NOT mutate the DB
  // values — DRX's ALL CAPS convention is preserved upstream for matching.
  const displayFirstName = toTitleCase(patient.firstName);
  const displayLastName = toTitleCase(patient.lastName);

  // Same treatment for prescriber and manufacturer — DRX feed is ALL CAPS,
  // labels should be Title Case for readability.
  const displayPrescFirst = toTitleCase(prescriber.firstName);
  const displayPrescLast = toTitleCase(prescriber.lastName);
  const displayManufacturer = item?.manufacturer
    ? toTitleCase(item.manufacturer)
    : (rx.isCompound ? "Compounded In-House" : "");

  // Fill number defaults — guard against legacy "Fill #0" leak. Schema declares
  // PrescriptionFill.fillNumber as a 1-indexed Int with no default; the leak
  // is from imported rows where DRX seeded 0 for the original fill.
  const safeFillNumber = fill.fillNumber && fill.fillNumber > 0 ? fill.fillNumber : 1;

  // Prescriber address — Title Case for street/city, preserve state code
  // (always 2-letter uppercase) and zip (numeric).
  const drAddr1 = toTitleCase(prescriber.addressLine1 || "");
  const drAddr2 = "";
  const drCity = toTitleCase(prescriber.city || "");
  const drState = (prescriber.state || "").toUpperCase();
  const drZip = prescriber.zip || "";

  // Build the flat data map — keys match DRX template elementData values
  const data: Record<string, string> = {
    // ── Patient ──
    // Names are Title-Cased for label display only. Source-of-truth values
    // in the DB (often ALL CAPS from DRX) are not mutated.
    "patient.first_name": displayFirstName,
    "patient.last_name": displayLastName,
    "patient.first_name|patient.last_name": `${displayFirstName} ${displayLastName}`,
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
    // Use the explicit Rx expiration if present; otherwise fall back to the
    // schedule-aware computed value (CII–CV: +6mo, otherwise +1yr).
    "prescription.date_expires": fmt(rx.expirationDate ?? expirationDate),
    // NB: Rx# (numeric) — NOT the row UUID. The DRX templates expect the
    // pharmacy-facing Rx number (e.g. "725366") so it can be barcoded and
    // human-read on the bottle label.
    "prescription.id": rx.rxNumber,

    // ── Fill ──
    "fill_date": fmt(fillDate),
    // Schedule-aware expiration ("Use until ___"). Replaces the prior naive
    // +365d so CII–CV controlled fills correctly print a 6-month window.
    "fill_date_plus_365_days": fmt(expirationDate),
    "fill_number": String(safeFillNumber),
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
    "item.manufacturer": displayManufacturer,
    "item.boh": "",
    "item.id": item ? `i${item.id}` : "",

    // ── Prescriber ──
    // Display-only Title Case, parallel to patient. DB values stay raw.
    "prescription.doctor.first_name": displayPrescFirst,
    "prescription.doctor.last_name": displayPrescLast,
    "prescription.doctor.first_name|prescription.doctor.last_name":
      `${displayPrescFirst} ${displayPrescLast}`.trim(),
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
    // Compound-disclaimer fields are populated ONLY when the Rx is flagged
    // as a compound. Previously `compound_formula_id` was always set when a
    // formula record was linked (e.g. Cetirizine for ingredient tracking),
    // which caused DRX templates conditioned on that key to print the
    // "compounded by this pharmacy" disclaimer on every label.
    "compound_batch.id": rx.isCompound ? rx.id : "",
    "compound_batch.compound_formula_id": rx.isCompound ? formula?.id || "" : "",
    "compound_batch.expiration_date": rx.isCompound ? fmt(expirationDate) : "",
    // Disclaimer text element — empty unless this is a true compound.
    "compound_disclaimer": rx.isCompound
      ? "This medication has been compounded by this pharmacy"
      : "",

    // ── Insurance ──
    "primary_third_party.name": primaryIns?.thirdPartyPlan?.planName || "",

    // ── Labels & Warnings ──
    // Drug-keyed aux warnings, newline-joined for the repeating slot.
    "aux_labels": auxWarnings,
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
