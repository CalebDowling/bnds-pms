import PDFDocument from "pdfkit";
import { LabelData } from "./rx-label";

/**
 * Standard pharmacy label size: 4" x 2.5" (288pt x 180pt at 72 DPI)
 */
const LABEL_WIDTH = 288;
const LABEL_HEIGHT = 180;

/**
 * Margins in points
 */
const MARGIN = 8;
const CONTENT_WIDTH = LABEL_WIDTH - MARGIN * 2;

/**
 * Font sizes
 */
const PHARMACY_HEADER_SIZE = 9;
const RX_NUMBER_SIZE = 11;
const PATIENT_NAME_SIZE = 10;
const DRUG_NAME_SIZE = 10;
const DIRECTIONS_SIZE = 8;
const FOOTER_SIZE = 7;

/**
 * Generate a single prescription label PDF page
 */
function drawLabel(doc: InstanceType<typeof PDFDocument>, data: LabelData): void {
  // Draw page boundary (for debugging, comment out in production)
  // doc.rect(0, 0, LABEL_WIDTH, LABEL_HEIGHT).stroke();

  let y = MARGIN;

  // === PHARMACY HEADER ===
  doc.fontSize(PHARMACY_HEADER_SIZE).font("Helvetica-Bold");
  doc.text(data.pharmacyName, MARGIN, y, {
    width: CONTENT_WIDTH,
    align: "center",
  });
  y += 12;

  doc.fontSize(PHARMACY_HEADER_SIZE - 1).font("Helvetica");
  const pharmacyAddrLine1 = `${data.pharmacyAddress}, ${data.pharmacyCity}, ${data.pharmacyState} ${data.pharmacyZip}`;
  doc.text(pharmacyAddrLine1, MARGIN, y, {
    width: CONTENT_WIDTH,
    align: "center",
  });
  y += 10;

  doc.fontSize(PHARMACY_HEADER_SIZE - 1);
  doc.text(`Phone: ${data.pharmacyPhone}`, MARGIN, y, {
    width: CONTENT_WIDTH,
    align: "center",
  });
  y += 8;

  // === RX NUMBER & FILL DATE ===
  doc.fontSize(RX_NUMBER_SIZE).font("Helvetica-Bold");
  doc.text(`Rx #${data.rxNumber} (Fill ${data.fillNumber})`, MARGIN, y, {
    width: CONTENT_WIDTH,
  });
  y += 12;

  doc.fontSize(FOOTER_SIZE).font("Helvetica");
  const fillDate = data.fillDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  doc.text(`Filled: ${fillDate}`, MARGIN, y, { width: CONTENT_WIDTH });
  y += 8;

  // === PATIENT NAME & DOB ===
  doc.fontSize(PATIENT_NAME_SIZE).font("Helvetica-Bold");
  const patientName = `${data.patientFirstName} ${data.patientLastName}`;
  doc.text(patientName, MARGIN, y, { width: CONTENT_WIDTH });
  y += 10;

  doc.fontSize(FOOTER_SIZE).font("Helvetica");
  const dob = data.patientDateOfBirth.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  doc.text(`DOB: ${dob}`, MARGIN, y, { width: CONTENT_WIDTH });
  y += 7;

  // === DRUG NAME & STRENGTH ===
  doc.fontSize(DRUG_NAME_SIZE).font("Helvetica-Bold");
  const drugLabel = data.strength
    ? `${data.drugName} ${data.strength}`
    : data.drugName;
  doc.text(drugLabel, MARGIN, y, { width: CONTENT_WIDTH });
  y += 10;

  if (data.ndc) {
    doc.fontSize(FOOTER_SIZE).font("Helvetica");
    doc.text(`NDC: ${data.ndc}`, MARGIN, y, { width: CONTENT_WIDTH });
    y += 6;
  }

  // === DIRECTIONS (WORD WRAPPED) ===
  doc.fontSize(DIRECTIONS_SIZE).font("Helvetica");
  const directionsOptions = {
    width: CONTENT_WIDTH,
    align: "left" as const,
    lineGap: 1,
  };
  const height = doc.heightOfString(data.directions, directionsOptions);
  doc.text(data.directions, MARGIN, y, directionsOptions);
  y += height + 4;

  // === QUANTITY, DAYS SUPPLY, REFILLS ===
  doc.fontSize(FOOTER_SIZE).font("Helvetica");
  const qtyLine = `Qty: ${data.quantity}`;
  const daysLine = data.daysSupply ? ` Days: ${data.daysSupply}` : "";
  const refillsLine = ` Refills: ${data.refillsRemaining}`;
  doc.text(qtyLine + daysLine + refillsLine, MARGIN, y, {
    width: CONTENT_WIDTH,
  });
  y += 6;

  // === PRESCRIBER ===
  doc.fontSize(FOOTER_SIZE).font("Helvetica");
  const prescriberLine = data.prescriberDea
    ? `Prescriber: ${data.prescriberName} (DEA: ${data.prescriberDea})`
    : `Prescriber: ${data.prescriberName}`;
  doc.text(prescriberLine, MARGIN, y, { width: CONTENT_WIDTH });
  y += 6;

  // === LOT & EXPIRATION ===
  if (data.lotNumber) {
    const budLine = data.budDate
      ? `Lot: ${data.lotNumber} BUD: ${data.budDate.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })}`
      : `Lot: ${data.lotNumber}`;
    doc.text(budLine, MARGIN, y, { width: CONTENT_WIDTH });
    y += 6;
  }

  // === ALLERGIES WARNING ===
  if (data.allergies.length > 0) {
    doc.fontSize(FOOTER_SIZE).font("Helvetica-Bold");
    const allergyWarning = `ALLERGIES: ${data.allergies.join(", ")}`;
    doc.text(allergyWarning, MARGIN, y, {
      width: CONTENT_WIDTH,
      align: "center",
    });
  }
}

/**
 * Generate a single label as a PDF Buffer
 */
export async function generateLabelPDF(labelData: LabelData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [LABEL_WIDTH, LABEL_HEIGHT],
      margin: 0,
    });

    const chunks: Uint8Array[] = [];

    doc.on("data", (chunk: Uint8Array) => {
      chunks.push(chunk);
    });

    doc.on("end", () => {
      // Combine Uint8Array chunks into a single buffer
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const buffer = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(buffer);
    });

    doc.on("error", reject);

    drawLabel(doc, labelData);
    doc.end();
  });
}

/**
 * Generate multiple labels on separate pages
 */
export async function generateBatchLabels(
  labelDataArray: LabelData[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [LABEL_WIDTH, LABEL_HEIGHT],
      margin: 0,
    });

    const chunks: Uint8Array[] = [];

    doc.on("data", (chunk: Uint8Array) => {
      chunks.push(chunk);
    });

    doc.on("end", () => {
      // Combine Uint8Array chunks into a single buffer
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const buffer = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(buffer);
    });

    doc.on("error", reject);

    labelDataArray.forEach((labelData, index) => {
      if (index > 0) {
        doc.addPage();
      }
      drawLabel(doc, labelData);
    });

    doc.end();
  });
}
