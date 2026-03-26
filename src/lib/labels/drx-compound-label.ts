import PDFDocument from "pdfkit";
// @ts-expect-error — bwip-js has its own types but TS doesn't resolve them cleanly
import bwipjs from "bwip-js/lib/bwip-js-node";

/**
 * DRX-format compound label generator
 *
 * Based on "Boudreaux CMPD-CA COPY" (template ID 95) from DRX.
 * Page: 4" wide x 8" tall (288pt x 576pt at 72 DPI)
 * Units: inches (converted to points: 1in = 72pt)
 * All text is rotated -90° (sideways) unless noted
 *
 * Label groups:
 *   BOTTOM LABEL  – patient info, Rx#, drug, price, qty (y: 0.1–4.5)
 *   Backtag       – manufacturer, doctor, refills, NDC (y: 0.1–7.5)
 *   MAIN LABEL    – patient name, SIG, drug, RPH, barcode (y: 0.1–3.5)
 *   AUX           – aux warnings, batch info (y: 3.0–)
 *   Patient Notes  – notes, tags, hold/no-claim warnings (y: 4.4–)
 *   Signature      – signature line, barcodes (y: 4.6–)
 *   Signature2     – second signature section (y: 4.6–)
 */

// Page dimensions in points (4" x 8")
const PAGE_WIDTH = 4 * 72;   // 288pt
const PAGE_HEIGHT = 8 * 72;  // 576pt

// Conversion: inches to points
const IN = 72;

/**
 * Data interface for compound label — maps to DRX element_data fields
 */
export interface CompoundLabelData {
  // Patient
  patientFirstName: string;
  patientLastName: string;
  patientDOB: string;              // formatted MM/DD/YYYY
  patientAddressLine1: string;
  patientAddressLine2: string;
  patientCity: string;
  patientState: string;
  patientZip: string;
  patientPhone: string;
  patientCellPhone: string;
  patientDeliveryMethod: string;
  patientComments: string;

  // Prescription
  rxNumber: string;
  fillNumber: number;
  fillDate: string;                // formatted MM/DD/YYYY
  sig: string;                     // translated directions
  refillsLeft: number;
  rxExpires: string;               // formatted MM/DD/YYYY

  // Drug / Item
  itemName: string;                // item.name (long form)
  itemPrintName: string;           // item.print_name (display form)
  brandName: string;               // brand_name_if_generic
  ndc: string;
  manufacturer: string;
  boh: string;                     // balance on hand

  // Quantities
  dispensedQuantity: string;
  qtyType: string;
  copay: string;

  // Prescriber
  doctorFirstName: string;
  doctorLastName: string;
  doctorAddressLine1: string;
  doctorAddressLine2: string;
  doctorCity: string;
  doctorState: string;
  doctorZip: string;
  doctorPhone: string;
  doctorDEA: string;
  doctorNPI: string;

  // Pharmacist
  pharmacistFirstName: string;
  pharmacistLastName: string;

  // Insurance
  primaryInsurance: string;

  // Compound batch
  batchId: string;
  formulaId: string;
  batchExpiration: string;

  // Labels & warnings
  auxLabels: string[];
  fillTags: string[];
  pickupTime: string;
  noClaimWarning: boolean;
  holdWarning: boolean;

  // Completion / partial
  completionQuantity: string;
  partialQuantity: string;

  // Fill ID (for barcodes)
  fillId: string;
  labelVersion: string;
  itemId: string;

  // QR code URL
  patientEducationUrl: string;

  // Pharmacy toll free
  tollFreeNumber: string;
}

/**
 * Helper: draw text at absolute position with -90° rotation
 * In DRX, x_position is measured from left edge, y_position from top edge
 * With -90° rotation, text reads bottom-to-top
 */
function drawRotatedText(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  xIn: number,
  yIn: number,
  options: {
    font?: string;
    fontSize?: number;
    bold?: boolean;
    upperCase?: boolean;
    maxWidth?: number;      // paragraph_width in inches
    rotation?: number;
  } = {}
): void {
  if (!text) return;

  const {
    font = "Helvetica",
    fontSize = 8,
    bold = false,
    upperCase = false,
    maxWidth,
    rotation = -90,
  } = options;

  const displayText = upperCase ? text.toUpperCase() : text;
  const fontName = bold
    ? (font === "Helvetica" ? "Helvetica-Bold" : "Helvetica-Bold")
    : (font === "Helvetica" ? "Helvetica" : "Helvetica");

  doc.save();
  doc.font(fontName).fontSize(fontSize);

  // Convert inches to points
  const xPt = xIn * IN;
  const yPt = yIn * IN;

  // Translate to position, then rotate
  doc.translate(xPt, yPt);
  doc.rotate(rotation);

  if (maxWidth) {
    doc.text(displayText, 0, 0, {
      width: maxWidth * IN,
      lineGap: 1,
    });
  } else {
    doc.text(displayText, 0, 0);
  }

  doc.restore();
}

/**
 * Generate a real Code128 barcode PNG buffer using bwip-js
 */
async function generateBarcodePNG(text: string, height: number): Promise<Buffer> {
  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale: 2,
    height: Math.max(5, Math.min(height, 30)),
    includetext: true,
    textxalign: "center",
    textsize: 8,
  });
  return Buffer.from(png);
}

/**
 * Generate a QR code PNG buffer
 */
async function generateQRPNG(text: string, size: number): Promise<Buffer> {
  try {
    const QRCode = await import("qrcode");
    const png = await QRCode.toBuffer(text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
    });
    return Buffer.from(png);
  } catch {
    // Fallback: return empty buffer if QR generation fails
    return Buffer.alloc(0);
  }
}

/**
 * Draw a real scannable Code128 barcode on the PDF
 */
async function drawBarcode128(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  xIn: number,
  yIn: number,
  heightPt: number,
  rotation: number = -90
): Promise<void> {
  if (!text) return;

  try {
    const png = await generateBarcodePNG(text, Math.round(heightPt * 0.8));

    doc.save();
    const xPt = xIn * IN;
    const yPt = yIn * IN;
    doc.translate(xPt, yPt);
    doc.rotate(rotation);
    doc.image(png, 0, 0, { height: heightPt, fit: [heightPt * 4, heightPt] });
    doc.restore();
  } catch {
    // Fallback: draw text if barcode generation fails
    drawRotatedText(doc, `[BC] ${text}`, xIn, yIn, { fontSize: 6, rotation });
  }
}

// =========================================================================
// MAIN LABEL DRAWING
// =========================================================================

async function drawBottomLabel(doc: InstanceType<typeof PDFDocument>, data: CompoundLabelData): Promise<void> {
  // Patient name — bold 12pt at (1.1, 0.1)
  drawRotatedText(doc, `${data.patientFirstName} ${data.patientLastName}`, 1.1, 0.1, {
    fontSize: 12, bold: true, upperCase: true,
  });

  // RX# — bold 11pt at (1.3, 0.1)
  drawRotatedText(doc, `RX# ${data.rxNumber}`, 1.3, 0.1, {
    fontSize: 11, bold: true,
  });

  // City, State, Zip — 8pt at (0.76, 0.1)
  const cityStateZip = [data.patientCity, data.patientState, data.patientZip].filter(Boolean).join(", ");
  drawRotatedText(doc, cityStateZip, 0.76, 0.1, {
    fontSize: 8, upperCase: true,
  });

  // DOB — bold 8pt at (0.96, 0.1)
  drawRotatedText(doc, `DOB: ${data.patientDOB}`, 0.96, 0.1, {
    fontSize: 8, bold: true, upperCase: true,
  });

  // Delivery method — bold 12pt at (0.35, 0.1)
  drawRotatedText(doc, data.patientDeliveryMethod, 0.35, 0.1, {
    fontSize: 12, bold: true, upperCase: true,
  });

  // Phone — 8pt at (0.66, 0.1)
  drawRotatedText(doc, data.patientPhone, 0.66, 0.1, {
    fontSize: 8, upperCase: true,
  });

  // Item name (drug) — bold 10pt at (0.2, 0.1), paragraph_width 4.3
  drawRotatedText(doc, data.itemName, 0.2, 0.1, {
    fontSize: 10, bold: true, upperCase: true, maxWidth: 4.3,
  });

  // Address — 8pt at (0.86, 0.1)
  const addressFull = [data.patientAddressLine1, data.patientAddressLine2].filter(Boolean).join(" ");
  drawRotatedText(doc, addressFull, 0.86, 0.1, {
    fontSize: 8, upperCase: true,
  });

  // Cell phone — 8pt at (0.66, 1.2)
  drawRotatedText(doc, data.patientCellPhone, 0.66, 1.2, {
    fontSize: 8, upperCase: true,
  });

  // Fill date — 10pt at (1.3, 1.2)
  drawRotatedText(doc, `Filled: ${data.fillDate}`, 1.3, 1.2, {
    fontSize: 10,
  });

  // Insurance — bold 8pt at (0.66, 2.2)
  drawRotatedText(doc, data.primaryInsurance, 0.66, 2.2, {
    fontSize: 8, bold: true, upperCase: true,
  });

  // Doctor city/state/zip — 8pt at (1.1, 2.4)
  const drCityStateZip = [data.doctorCity, `${data.doctorState} ${data.doctorZip}`].filter(Boolean).join(", ");
  drawRotatedText(doc, drCityStateZip, 1.1, 2.4, {
    fontSize: 8, upperCase: true,
  });

  // Doctor address — 8pt at (1.2, 2.4)
  drawRotatedText(doc, data.doctorAddressLine1, 1.2, 2.4, { fontSize: 8 });

  // Doctor phone — 8pt at (1.0, 2.4)
  drawRotatedText(doc, data.doctorPhone, 1.0, 2.4, { fontSize: 8 });

  // Doctor name — 9pt at (1.3, 2.4)
  drawRotatedText(doc, `${data.doctorFirstName} ${data.doctorLastName}`, 1.3, 2.4, {
    fontSize: 9, upperCase: true,
  });

  // Quantity — bold 8pt at (0.1, 3.0)
  drawRotatedText(doc, `Qty: ${data.dispensedQuantity} ${data.qtyType}`, 0.1, 3.0, {
    fontSize: 8, bold: true, upperCase: true,
  });

  // Price — bold 10pt at (0.3, 3.0)
  drawRotatedText(doc, `Price: $${data.copay}`, 0.3, 3.0, {
    fontSize: 10, bold: true,
  });

  // Fill number — bold 8pt at (0.1, 3.6)
  drawRotatedText(doc, `Fill#: ${data.fillNumber}`, 0.1, 3.6, {
    fontSize: 8, bold: true,
  });

  // Bottom barcode — 1pt text, h=6 at (0.4, 4.2)
  await drawBarcode128(doc, `b${data.fillId}:${data.labelVersion}`, 0.4, 4.2, 6);
}

function drawBacktag(doc: InstanceType<typeof PDFDocument>, data: CompoundLabelData): void {
  // Manufacturer — 8pt at (2.2, 0.1), paragraph_width 3.8
  drawRotatedText(doc, `MFG: ${data.manufacturer}`, 2.2, 0.1, {
    fontSize: 8, upperCase: true, maxWidth: 3.8,
  });

  // Patient city/state/zip — 6pt at (0.58, 4.6)
  const patCSZ = [data.patientCity, data.patientState, data.patientZip].filter(Boolean).join(", ");
  drawRotatedText(doc, patCSZ, 0.58, 4.6, {
    fontSize: 6, upperCase: true,
  });

  // Patient address — 6pt at (0.65, 4.6)
  const patAddr = [data.patientAddressLine1, data.patientAddressLine2].filter(Boolean).join(" ");
  drawRotatedText(doc, patAddr, 0.65, 4.6, {
    fontSize: 6, upperCase: true,
  });

  // Doctor full address — 6pt at (0.22, 4.6), paragraph_width 3.4
  const drFullAddr = [data.doctorAddressLine1, data.doctorAddressLine2, data.doctorCity, data.doctorState, data.doctorZip].filter(Boolean).join(" ");
  drawRotatedText(doc, drFullAddr, 0.22, 4.6, {
    fontSize: 6, upperCase: true, maxWidth: 3.4,
  });

  // Doctor DEA — 6pt at (0.3, 4.6)
  drawRotatedText(doc, `DEA: ${data.doctorDEA}`, 0.3, 4.6, { fontSize: 6 });

  // RX# — bold 7pt at (0.85, 4.6)
  drawRotatedText(doc, `RX ${data.rxNumber}`, 0.85, 4.6, {
    fontSize: 7, bold: true,
  });

  // Patient name — bold 8pt at (0.75, 4.6)
  drawRotatedText(doc, `${data.patientFirstName} ${data.patientLastName}`, 0.75, 4.6, {
    fontSize: 8, bold: true, upperCase: true,
  });

  // Doctor name — bold 8pt at (0.45, 4.6)
  drawRotatedText(doc, `${data.doctorFirstName} ${data.doctorLastName}`, 0.45, 4.6, {
    fontSize: 8, bold: true, upperCase: true,
  });

  // Doctor NPI — 6pt at (0.38, 4.6)
  drawRotatedText(doc, `NPI: ${data.doctorNPI}`, 0.38, 4.6, { fontSize: 6 });

  // Refills left — 6pt at (0.1, 4.6)
  drawRotatedText(doc, `${data.refillsLeft} Refill(s) left until`, 0.1, 4.6, { fontSize: 6 });

  // Rx expires — 6pt at (0.1, 5.3)
  drawRotatedText(doc, data.rxExpires, 0.1, 5.3, { fontSize: 6 });

  // DOB — bold 6.5pt at (0.85, 5.3)
  drawRotatedText(doc, `DOB: ${data.patientDOB}`, 0.85, 5.3, {
    fontSize: 6.5, bold: true,
  });
}

async function drawMainLabel(doc: InstanceType<typeof PDFDocument>, data: CompoundLabelData): Promise<void> {
  // Patient last, first — 10pt at (3.15, 0.1)
  drawRotatedText(doc, `${data.patientLastName}, ${data.patientFirstName}`, 3.15, 0.1, {
    fontSize: 10,
  });

  // SIG (directions) — 12pt at (2.6, 0.1), paragraph_width 3.4
  drawRotatedText(doc, data.sig, 2.6, 0.1, {
    fontSize: 12, maxWidth: 3.4,
  });

  // Item print name (first instance) — 10pt at (2.75, 0.1)
  drawRotatedText(doc, data.itemPrintName, 2.75, 0.1, { fontSize: 10 });

  // RPH first name — 6pt at (2.0, 0.1)
  drawRotatedText(doc, `RPH: ${data.pharmacistFirstName}`, 2.0, 0.1, {
    fontSize: 6, upperCase: true,
  });

  // Item print name (large, overlaid) — 12pt at (2.95, 0.1)
  drawRotatedText(doc, data.itemPrintName, 2.95, 0.1, { fontSize: 12 });

  // Brand name if generic — 12pt at (2.8, 0.1)
  if (data.brandName) {
    drawRotatedText(doc, data.brandName, 2.8, 0.1, { fontSize: 12 });
  }

  // RX# — 8pt at (3.35, 0.1)
  drawRotatedText(doc, `RX# ${data.rxNumber}`, 3.35, 0.1, { fontSize: 8 });

  // RPH last name — 6pt at (2.0, 0.5)
  drawRotatedText(doc, data.pharmacistLastName, 2.0, 0.5, {
    fontSize: 6, upperCase: true,
  });

  // Completion quantity — bold 8pt at (2.0, 0.9)
  if (data.completionQuantity) {
    drawRotatedText(doc, data.completionQuantity, 2.0, 0.9, {
      fontSize: 8, bold: true,
    });
  }

  // Partial quantity — bold 8pt at (2.0, 1.3)
  if (data.partialQuantity) {
    drawRotatedText(doc, data.partialQuantity, 2.0, 1.3, {
      fontSize: 8, bold: true,
    });
  }

  // Formula ID — 6pt at (2.2, 1.35)
  if (data.formulaId) {
    drawRotatedText(doc, `Formula: ${data.formulaId}`, 2.2, 1.35, { fontSize: 6 });
  }

  // Batch ID — 6pt at (2.1, 1.35)
  if (data.batchId) {
    drawRotatedText(doc, `Batch: ${data.batchId}`, 2.1, 1.35, { fontSize: 6 });
  }

  // Doctor name — 5pt at (3.35, 1.6)
  drawRotatedText(doc, `${data.doctorFirstName} ${data.doctorLastName}`, 3.35, 1.6, {
    fontSize: 5,
  });

  // Quantity — 6pt at (3.2, 1.8)
  drawRotatedText(doc, `Quantity: ${data.dispensedQuantity} ${data.qtyType}`, 3.2, 1.8, {
    fontSize: 6,
  });

  // Main barcode — h=6 at (2.0, 2.5), rotation 0 (horizontal)
  await drawBarcode128(doc, `b${data.fillId}:${data.labelVersion}`, 2.0, 2.5, 6, 0);
}

function drawAuxSection(doc: InstanceType<typeof PDFDocument>, data: CompoundLabelData): void {
  // Aux labels at staggered x positions
  const auxPositions = [3.9, 3.5, 3.1, 2.7];
  for (let i = 0; i < Math.min(data.auxLabels.length, auxPositions.length); i++) {
    drawRotatedText(doc, data.auxLabels[i], auxPositions[i], 3.0, {
      fontSize: 10, maxWidth: 2.0,
    });
  }

  // "This medication has been compounded by this pharmacy" — 10pt at (2.7, 3.0)
  drawRotatedText(doc, "This medication has been compounded by this pharmacy", 2.7, 3.0, {
    fontSize: 10, maxWidth: 2.0,
  });

  // Batch info
  if (data.batchId) {
    drawRotatedText(doc, `Batch: ${data.batchId}`, 2.2, 3.0, { fontSize: 6 });
  }
  if (data.batchExpiration) {
    drawRotatedText(doc, `Use By: ${data.batchExpiration}`, 2.1, 3.0, { fontSize: 6 });
  }
  if (data.formulaId) {
    drawRotatedText(doc, `FormulaID: ${data.formulaId}`, 2.3, 3.0, { fontSize: 6 });
  }
}

async function drawPatientNotes(doc: InstanceType<typeof PDFDocument>, data: CompoundLabelData): Promise<void> {
  // NO PAID CLAIM warning — bold 30pt at (1.0, 4.4), rotation -70
  if (data.noClaimWarning) {
    drawRotatedText(doc, "NO PAID CLAIM", 1.0, 4.4, {
      fontSize: 30, bold: true, rotation: -70,
    });
  }

  // Patient comments — 10pt at (3.8, 4.6), paragraph_width 3.5
  if (data.patientComments) {
    drawRotatedText(doc, data.patientComments, 3.8, 4.6, {
      fontSize: 10, maxWidth: 3.5,
    });
  }

  // Pickup time — 7pt at (2.95, 4.6)
  if (data.pickupTime) {
    drawRotatedText(doc, `Promised: ${data.pickupTime}`, 2.95, 4.6, {
      fontSize: 7, maxWidth: 3.5,
    });
  }

  // Fill tags — 10pt at (3.4, 4.6)
  if (data.fillTags.length > 0) {
    drawRotatedText(doc, data.fillTags.join(", "), 3.4, 4.6, {
      fontSize: 10, maxWidth: 3.5,
    });
  }

  // HOLD warning — bold 40pt at (2.3, 5.0), rotation -70
  if (data.holdWarning) {
    drawRotatedText(doc, "HOLD", 2.3, 5.0, {
      fontSize: 40, bold: true, rotation: -70,
    });
  }

  // Item ID barcode — h=6 at (2.4, 6.5), rotation 90
  await drawBarcode128(doc, `i:${data.itemId}`, 2.4, 6.5, 6, 90);

  // Item ID text — 8pt at (2.6, 7.0)
  drawRotatedText(doc, `i:${data.itemId}`, 2.6, 7.0, { fontSize: 8 });

  // QR code for patient education — at (2.8, 6.2), 1"x1"
  if (data.patientEducationUrl) {
    try {
      const qrPng = await generateQRPNG(data.patientEducationUrl, 200);
      if (qrPng.length > 0) {
        doc.image(qrPng, 2.8 * IN, 6.2 * IN, { width: 0.8 * IN, height: 0.8 * IN });
      }
    } catch { /* QR generation optional */ }
  }
}

function drawSignatureSection(doc: InstanceType<typeof PDFDocument>, data: CompoundLabelData): void {
  // Signature 1 — patient name bold 8pt at (2.0, 4.6)
  drawRotatedText(doc, `${data.patientFirstName} ${data.patientLastName}`, 2.0, 4.6, {
    fontSize: 8, bold: true,
  });

  // Home phone — 7pt at (1.9, 4.6)
  drawRotatedText(doc, `Home: ${data.patientPhone}`, 1.9, 4.6, { fontSize: 7 });

  // Cell phone — 7pt at (1.9, 5.8)
  drawRotatedText(doc, `Cell: ${data.patientCellPhone}`, 1.9, 5.8, { fontSize: 7 });

  // BOH — bold 8pt at (1.7, 5.8)
  if (data.boh) {
    drawRotatedText(doc, `BOH: ${data.boh}`, 1.7, 5.8, {
      fontSize: 8, bold: true,
    });
  }
}

async function drawSignature2Section(doc: InstanceType<typeof PDFDocument>, data: CompoundLabelData): Promise<void> {
  // Patient name — bold 8pt at (1.5, 4.6)
  drawRotatedText(doc, `${data.patientFirstName} ${data.patientLastName}`, 1.5, 4.6, {
    fontSize: 8, bold: true,
  });

  // Home phone — 7pt at (1.4, 4.6)
  drawRotatedText(doc, `Home: ${data.patientPhone}`, 1.4, 4.6, { fontSize: 7 });

  // Signature line — 6pt at (1.0, 4.7)
  drawRotatedText(doc, "Signature: __________________________", 1.0, 4.7, { fontSize: 6 });

  // Cell phone — 7pt at (1.4, 5.8)
  drawRotatedText(doc, `Cell: ${data.patientCellPhone}`, 1.4, 5.8, { fontSize: 7 });

  // Signature barcode — h=6 at (1.0, 6.5), rotation 90
  await drawBarcode128(doc, `${data.fillId}:${data.fillNumber}`, 1.0, 6.5, 6, 90);

  // NDC — 6pt at (1.2, 7.0)
  drawRotatedText(doc, `NDC: ${data.ndc}`, 1.2, 7.0, { fontSize: 6 });

  // Fill date — 7pt at (1.3, 7.0)
  drawRotatedText(doc, `Filled: ${data.fillDate}`, 1.3, 7.0, { fontSize: 7 });

  // Dispensed qty — 7pt at (1.4, 7.1)
  drawRotatedText(doc, `Disp Qty: ${data.dispensedQuantity}`, 1.4, 7.1, { fontSize: 7 });
}

function drawTollFree(doc: InstanceType<typeof PDFDocument>, data: CompoundLabelData): void {
  // Toll free number — 10pt at (2.35, 0.1)
  drawRotatedText(doc, data.tollFreeNumber || "Toll Free 1-855-305-2110", 2.35, 0.1, {
    fontSize: 10,
  });
}

// =========================================================================
// PUBLIC API
// =========================================================================

/**
 * Draw a complete DRX compound label onto a PDFDocument page
 */
export async function drawCompoundLabel(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): Promise<void> {
  // Draw all label groups in order (back to front)
  await drawBottomLabel(doc, data);
  drawBacktag(doc, data);
  await drawMainLabel(doc, data);
  drawTollFree(doc, data);
  drawAuxSection(doc, data);
  await drawPatientNotes(doc, data);
  drawSignatureSection(doc, data);
  await drawSignature2Section(doc, data);
}

/**
 * Generate a compound label PDF as a Buffer
 */
export async function generateCompoundLabelPDF(
  data: CompoundLabelData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE_WIDTH, PAGE_HEIGHT],
      margin: 0,
    });

    const chunks: Uint8Array[] = [];

    doc.on("data", (chunk: Uint8Array) => {
      chunks.push(chunk);
    });

    doc.on("end", () => {
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const buffer = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(buffer);
    });

    doc.on("error", reject);

    drawCompoundLabel(doc, data).then(() => doc.end()).catch(reject);
  });
}

/**
 * Create sample/test label data for "New Test Label"
 */
export function createSampleLabelData(): CompoundLabelData {
  return {
    patientFirstName: "TAYLOR",
    patientLastName: "GRAY",
    patientDOB: "12/22/1985",
    patientAddressLine1: "123 Unknown Ave",
    patientAddressLine2: "Apt C",
    patientCity: "Lake Charles",
    patientState: "LA",
    patientZip: "70601",
    patientPhone: "337-555-1234",
    patientCellPhone: "337-555-5678",
    patientDeliveryMethod: "DELIVERY",
    patientComments: "Patient prefers afternoon delivery. Allergic to latex.",

    rxNumber: "154687",
    fillNumber: 1,
    fillDate: "03/25/2026",
    sig: "Apply 1 gram topically to affected area twice daily for 30 days. Wash hands after application.",
    refillsLeft: 3,
    rxExpires: "03/25/2027",

    itemName: "Ketoprofen 10%/Cyclobenzaprine 2%/Lidocaine 5% Cream",
    itemPrintName: "Ketoprofen/Cyclobenz/Lidocaine Cream",
    brandName: "",
    ndc: "5555-4455-01",
    manufacturer: "COMPOUNDED IN-HOUSE",
    boh: "16",

    dispensedQuantity: "120",
    qtyType: "GM",
    copay: "45.00",

    doctorFirstName: "Charles",
    doctorLastName: "Murphy",
    doctorAddressLine1: "132 Medical Plaza Dr",
    doctorAddressLine2: "",
    doctorCity: "Lake Charles",
    doctorState: "LA",
    doctorZip: "70601",
    doctorPhone: "337-555-7777",
    doctorDEA: "BM1234567",
    doctorNPI: "1234567890",

    pharmacistFirstName: "Emily",
    pharmacistLastName: "Bychkov",

    primaryInsurance: "WELLCARE MEDICARE PART D",

    batchId: "B-2026-0325",
    formulaId: "F-1547",
    batchExpiration: "06/25/2026",

    auxLabels: [
      "FOR EXTERNAL USE ONLY",
      "KEEP OUT OF REACH OF CHILDREN",
      "STORE AT ROOM TEMPERATURE",
      "DO NOT USE IF ALLERGIC TO ANY INGREDIENT",
    ],
    fillTags: ["price check", "compound"],
    pickupTime: "03/25/2026 2:00 PM",
    noClaimWarning: false,
    holdWarning: false,

    completionQuantity: "",
    partialQuantity: "",

    fillId: "154687",
    labelVersion: "0",
    itemId: "71662",

    patientEducationUrl: "https://bndsrx.com/edu/154687",
    tollFreeNumber: "Toll Free 1-855-305-2110",
  };
}
