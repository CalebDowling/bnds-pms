import { getErrorMessage } from "@/lib/errors";

/**
 * Parsed NCPDP SCRIPT NEWRX message
 * Supports both XML (SCRIPT 10.6+) and JSON (FHIR) formats
 */
export interface ParsedNewRx {
  messageId: string;
  messageType: "NEWRX" | "REFREQ" | "RXCHG" | "CANRX";
  sentAt: string;

  // Patient
  patient: {
    firstName: string;
    lastName: string;
    middleName?: string;
    suffix?: string;
    dateOfBirth: string; // YYYY-MM-DD
    gender: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zip: string;
    };
    phone?: string;
    ssnLast4?: string;
  };

  // Prescriber
  prescriber: {
    firstName: string;
    lastName: string;
    suffix?: string;
    npi: string;
    deaNumber?: string;
    stateLicense?: string;
    licenseState?: string;
    phone?: string;
    fax?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zip: string;
    };
    specialty?: string;
  };

  // Medication
  medication: {
    drugName: string;
    ndc?: string;
    strength?: string;
    dosageForm?: string;
    route?: string;
    quantity: number;
    daysSupply: number;
    directions: string; // SIG
    refillsAuthorized: number;
    dawCode?: string;
    isCompound: boolean;
    deaSchedule?: string;
    ingredients?: Array<{
      name: string;
      ndc?: string;
      quantity: number;
      unit: string;
    }>;
  };

  // Dates
  dateWritten: string;
  effectiveDate?: string;

  // Notes
  prescriberNotes?: string;
  pharmacyNotes?: string;
}

/**
 * Parse NCPDP SCRIPT XML format (SCRIPT 10.6+)
 * Simple regex/string parser for extracting elements
 */
export function parseNewRxXml(xml: string): ParsedNewRx {
  // Helper function to extract element text content
  const extractText = (xml: string, tagName: string): string => {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, "i");
    const match = xml.match(regex);
    return match ? match[1].trim() : "";
  };

  // Helper function to extract nested structure
  const extractElement = (xml: string, tagName: string): string => {
    const regex = new RegExp(
      `<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`,
      "i"
    );
    const match = xml.match(regex);
    return match ? match[1] : "";
  };

  // Extract header info
  const messageId = extractText(xml, "MessageID");
  const messageType = (extractText(xml, "MessageType") || "NEWRX") as
    | "NEWRX"
    | "REFREQ"
    | "RXCHG"
    | "CANRX";
  const sentAt = extractText(xml, "SentTime") || new Date().toISOString();

  // Extract patient info
  const patientXml = extractElement(xml, "Patient");
  const patient = {
    firstName: extractText(patientXml, "FirstName"),
    lastName: extractText(patientXml, "LastName"),
    middleName: extractText(patientXml, "MiddleName") || undefined,
    suffix: extractText(patientXml, "Suffix") || undefined,
    dateOfBirth: extractText(patientXml, "DateOfBirth"),
    gender: extractText(patientXml, "Gender"),
    phone: extractText(patientXml, "PhoneNumber") || undefined,
    ssnLast4: extractText(patientXml, "SSNLast4") || undefined,
    address: (() => {
      const addr1 = extractText(patientXml, "AddressLine1");
      if (!addr1) return undefined;
      return {
        line1: addr1,
        line2: extractText(patientXml, "AddressLine2") || undefined,
        city: extractText(patientXml, "City"),
        state: extractText(patientXml, "State"),
        zip: extractText(patientXml, "ZipCode"),
      };
    })(),
  };

  // Extract prescriber info
  const prescriberXml = extractElement(xml, "Prescriber");
  const prescriber = {
    firstName: extractText(prescriberXml, "FirstName"),
    lastName: extractText(prescriberXml, "LastName"),
    suffix: extractText(prescriberXml, "Suffix") || undefined,
    npi: extractText(prescriberXml, "NPI"),
    deaNumber: extractText(prescriberXml, "DEANumber") || undefined,
    stateLicense: extractText(prescriberXml, "StateLicense") || undefined,
    licenseState: extractText(prescriberXml, "LicenseState") || undefined,
    phone: extractText(prescriberXml, "PhoneNumber") || undefined,
    fax: extractText(prescriberXml, "FaxNumber") || undefined,
    specialty: extractText(prescriberXml, "Specialty") || undefined,
    address: (() => {
      const addr1 = extractText(prescriberXml, "AddressLine1");
      if (!addr1) return undefined;
      return {
        line1: addr1,
        line2: extractText(prescriberXml, "AddressLine2") || undefined,
        city: extractText(prescriberXml, "City"),
        state: extractText(prescriberXml, "State"),
        zip: extractText(prescriberXml, "ZipCode"),
      };
    })(),
  };

  // Extract medication info
  const medicationXml = extractElement(xml, "MedicationPrescribed");
  const ingredientsXml = extractElement(medicationXml, "Ingredients");
  const ingredients = ingredientsXml
    ? Array.from(ingredientsXml.matchAll(/<Ingredient[^>]*>([\s\S]*?)<\/Ingredient>/gi)).map(
        (match) => ({
          name: extractText(match[1], "Name"),
          ndc: extractText(match[1], "NDC") || undefined,
          quantity: parseFloat(extractText(match[1], "Quantity")) || 0,
          unit: extractText(match[1], "Unit"),
        })
      )
    : undefined;

  const medication = {
    drugName: extractText(medicationXml, "DrugName"),
    ndc: extractText(medicationXml, "NDC") || undefined,
    strength: extractText(medicationXml, "Strength") || undefined,
    dosageForm: extractText(medicationXml, "DosageForm") || undefined,
    route: extractText(medicationXml, "Route") || undefined,
    quantity: parseFloat(extractText(medicationXml, "Quantity")) || 0,
    daysSupply: parseFloat(extractText(medicationXml, "DaysSupply")) || 0,
    directions: extractText(medicationXml, "SIG"),
    refillsAuthorized: parseInt(extractText(medicationXml, "RefillsAuthorized")) || 0,
    dawCode: extractText(medicationXml, "DAWCode") || undefined,
    isCompound: extractText(medicationXml, "IsCompound")?.toLowerCase() === "true",
    deaSchedule: extractText(medicationXml, "DEASchedule") || undefined,
    ingredients,
  };

  // Extract dates
  const dateWritten = extractText(xml, "DateWritten");
  const effectiveDate = extractText(xml, "EffectiveDate") || undefined;

  // Extract notes
  const prescriberNotes = extractText(xml, "PrescriberNotes") || undefined;
  const pharmacyNotes = extractText(xml, "PharmacyNotes") || undefined;

  return {
    messageId,
    messageType,
    sentAt,
    patient,
    prescriber,
    medication,
    dateWritten,
    effectiveDate,
    prescriberNotes,
    pharmacyNotes,
  };
}

/**
 * Parse FHIR MedicationRequest JSON format
 */
export function parseNewRxJson(
  json: Record<string, unknown>
): ParsedNewRx {
  const messageId = (json.id as string) || "";
  const messageType = "NEWRX" as const;
  const sentAt = (json.authoredOn as string) || new Date().toISOString();

  // Extract patient from subject reference or embedded object
  const subjectRef = json.subject as
    | { reference?: string; display?: string }
    | undefined;
  let patientFirstName = "";
  let patientLastName = "";
  let patientDob = "";
  let patientGender = "";

  if (json.subject && typeof json.subject === "object") {
    const subj = json.subject as Record<string, unknown>;
    if (subj.name) {
      const names = subj.name as Array<{ given?: string[]; family?: string }>;
      if (names && names[0]) {
        patientFirstName = names[0].given?.[0] || "";
        patientLastName = names[0].family || "";
      }
    }
    patientDob = (subj.birthDate as string) || "";
    patientGender = (subj.gender as string) || "";
  } else if (subjectRef?.reference) {
    patientFirstName = subjectRef.display?.split(" ")[0] || "";
    patientLastName = subjectRef.display?.split(" ")[1] || "";
  }

  // Extract prescriber from requester
  const requesterRef = json.requester as
    | { reference?: string; display?: string }
    | undefined;
  let prescriberFirstName = "";
  let prescriberLastName = "";
  let prescriberNpi = "";

  if (json.requester && typeof json.requester === "object") {
    const req = json.requester as Record<string, unknown>;
    if (req.name) {
      const names = req.name as Array<{ given?: string[]; family?: string }>;
      if (names && names[0]) {
        prescriberFirstName = names[0].given?.[0] || "";
        prescriberLastName = names[0].family || "";
      }
    }
    if (req.identifier) {
      const identifiers = req.identifier as Array<{
        system?: string;
        value?: string;
      }>;
      const npiId = identifiers?.find(
        (id) => id.system?.includes("npi")
      );
      prescriberNpi = npiId?.value || "";
    }
  } else if (requesterRef?.reference) {
    const parts = requesterRef.display?.split(" ") || [];
    prescriberFirstName = parts[0] || "";
    prescriberLastName = parts[1] || "";
  }

  // Extract medication from medicationCodeableConcept
  const medConcept = json.medicationCodeableConcept as
    | { coding?: Array<{ code?: string; display?: string }> }
    | undefined;
  let drugName = "";
  let ndc = "";

  if (medConcept?.coding) {
    for (const coding of medConcept.coding) {
      if (coding.code && coding.code.length === 11) {
        ndc = coding.code;
      }
      if (coding.display) {
        drugName = coding.display;
      }
    }
  }

  // Extract dosage and quantity from dosageInstruction
  let directions = "";
  let strength = "";
  let route = "";
  let quantity = 0;
  let daysSupply = 0;

  const dosageInstructions = json.dosageInstruction as
    | Array<Record<string, unknown>>
    | undefined;

  if (dosageInstructions && dosageInstructions[0]) {
    const dosage = dosageInstructions[0];

    if (dosage.text) {
      directions = (dosage.text as string) || "";
    }

    if (dosage.route) {
      const routeCoding = (dosage.route as Record<string, unknown>)
        .coding as Array<{ display?: string }> | undefined;
      if (routeCoding?.[0]?.display) {
        route = routeCoding[0].display;
      }
    }

    if (dosage.doseAndRate) {
      const doseRate = (dosage.doseAndRate as Array<Record<string, unknown>>)[0];
      if (doseRate?.doseQuantity) {
        const doseQty = doseRate.doseQuantity as {
          value?: number;
          unit?: string;
        };
        strength = `${doseQty.value || ""} ${doseQty.unit || ""}`.trim();
        quantity = doseQty.value || 0;
      }
    }
  }

  // Extract dispense request (quantity, days supply, refills)
  const dispenseReq = json.dispenseRequest as
    | {
        quantity?: { value?: number };
        expectedSupplyDuration?: { value?: number };
        numberOfRepeatsAllowed?: number;
      }
    | undefined;

  if (dispenseReq?.quantity?.value) {
    quantity = dispenseReq.quantity.value;
  }

  if (dispenseReq?.expectedSupplyDuration?.value) {
    daysSupply = dispenseReq.expectedSupplyDuration.value;
  }

  const refillsAuthorized = dispenseReq?.numberOfRepeatsAllowed || 0;

  const patient = {
    firstName: patientFirstName,
    lastName: patientLastName,
    dateOfBirth: patientDob,
    gender: patientGender,
  };

  const prescriber = {
    firstName: prescriberFirstName,
    lastName: prescriberLastName,
    npi: prescriberNpi,
  };

  const medication = {
    drugName,
    ndc: ndc || undefined,
    strength: strength || undefined,
    quantity,
    daysSupply,
    directions,
    route: route || undefined,
    refillsAuthorized,
    isCompound: false,
  };

  return {
    messageId,
    messageType,
    sentAt,
    patient,
    prescriber,
    medication,
    dateWritten: (json.authoredOn as string) || "",
  };
}

/**
 * Auto-detect message format and parse accordingly
 */
export function parseIncomingMessage(
  payload: unknown,
  format: "xml" | "json" | "auto" = "auto"
): ParsedNewRx {
  if (format === "auto") {
    // Auto-detect: XML starts with < or {, JSON is object/string
    if (typeof payload === "string") {
      format = payload.trim().startsWith("<") ? "xml" : "json";
    } else if (typeof payload === "object") {
      format = "json";
    } else {
      throw new Error("Invalid payload format");
    }
  }

  if (format === "xml") {
    const xmlString =
      typeof payload === "string"
        ? payload
        : JSON.stringify(payload);
    return parseNewRxXml(xmlString);
  } else {
    const jsonObj =
      typeof payload === "string"
        ? JSON.parse(payload)
        : (payload as Record<string, unknown>);
    return parseNewRxJson(jsonObj);
  }
}

/**
 * Validate parsed RX for required fields
 */
export function validateParsedRx(
  parsed: ParsedNewRx
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Patient validation
  if (!parsed.patient.firstName) {
    errors.push("Patient first name is required");
  }
  if (!parsed.patient.lastName) {
    errors.push("Patient last name is required");
  }
  if (!parsed.patient.dateOfBirth) {
    errors.push("Patient date of birth is required");
  }

  // Prescriber validation
  if (!parsed.prescriber.firstName) {
    errors.push("Prescriber first name is required");
  }
  if (!parsed.prescriber.lastName) {
    errors.push("Prescriber last name is required");
  }
  if (!parsed.prescriber.npi) {
    errors.push("Prescriber NPI is required");
  }

  // Medication validation
  if (!parsed.medication.drugName) {
    errors.push("Medication drug name is required");
  }
  if (parsed.medication.quantity <= 0) {
    errors.push("Medication quantity must be greater than 0");
  }
  if (parsed.medication.daysSupply < 0) {
    errors.push("Medication days supply cannot be negative");
  }
  if (!parsed.medication.directions) {
    errors.push("Medication directions (SIG) are required");
  }

  // Date validation
  if (!parsed.dateWritten) {
    errors.push("Date written is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
