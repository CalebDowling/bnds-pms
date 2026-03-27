import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";

/**
 * DRX-format compound label generator — STRUCTURED GRID LAYOUT
 *
 * Single 8" x 4" landscape PDF page (576pt x 288pt).
 * All content placed with explicit x,y coordinates — no translate/rotate.
 *
 * Layout (left to right):
 *   Section 1: MAIN LABEL      (x: 0–230pt,  y: 0–170pt)
 *   Section 2: BOTTOM LABEL    (x: 0–230pt,  y: 178–288pt)
 *   Section 3: RIGHT TOP       (x: 238–576pt, y: 0–144pt)   AUX / batch
 *   Section 4: RIGHT BOTTOM    (x: 238–576pt, y: 144–288pt) Signature / notes
 *   Backtag info woven into bottom-right area
 *   Watermarks overlaid with opacity
 */

// Page dimensions (landscape 8" x 4")
const PDF_W = 576; // 8 * 72
const PDF_H = 288; // 4 * 72

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple text placement — no transforms, just font + fontSize + text at x,y */
function placeText(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  x: number,
  y: number,
  opts: {
    fontSize?: number;
    bold?: boolean;
    upperCase?: boolean;
    maxWidth?: number; // in points
  } = {}
): void {
  if (!text) return;
  const { fontSize = 8, bold = false, upperCase = false, maxWidth } = opts;
  const display = upperCase ? text.toUpperCase() : text;
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
  if (maxWidth) {
    doc.text(display, x, y, { width: maxWidth, lineGap: 1 });
  } else {
    doc.text(display, x, y, { lineBreak: false });
  }
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

// ---------------------------------------------------------------------------
// Section boundaries (points)
// ---------------------------------------------------------------------------
const SEC1_LEFT = 4;
const SEC1_RIGHT = 230; // 3.2" = 230.4pt
const SEC2_TOP = 178;
const SEC3_LEFT = 238; // 3.3" = 237.6pt
const SEC3_RIGHT = 572; // leave 4pt margin
const SEC4_TOP = 144;

// ---------------------------------------------------------------------------
// Section 1: MAIN LABEL  (x: 0–3.2", y: 0–~170pt)
// ---------------------------------------------------------------------------

async function drawMainLabel(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): Promise<void> {
  const x = SEC1_LEFT;

  // Row 1: RX# ... Doctor ... Qty
  placeText(doc, `RX# ${data.rxNumber}`, x, 8, { fontSize: 8 });
  placeText(doc, `Doctor: ${data.doctorFirstName} ${data.doctorLastName}`, x + 80, 8, {
    fontSize: 5, upperCase: true,
  });
  placeText(doc, `Qty: ${data.dispensedQuantity} ${data.qtyType}`, x + 175, 8, {
    fontSize: 6, upperCase: true,
  });

  // Row 2: Patient name
  placeText(doc, `${data.patientLastName}, ${data.patientFirstName}`, x, 22, {
    fontSize: 10, bold: true, upperCase: true,
  });

  // Row 3: Drug name
  placeText(doc, data.itemPrintName, x, 36, {
    fontSize: 10, maxWidth: SEC1_RIGHT - x,
  });

  // Row 4: Generic For (if brandName exists)
  if (data.brandName) {
    placeText(doc, `Generic For: ${data.brandName}`, x, 50, { fontSize: 10 });
  }

  // Row 5: SIG
  placeText(doc, data.sig, x, 64, {
    fontSize: 9, maxWidth: 216, // 3"
  });

  // Row 6: Toll Free
  placeText(doc, data.tollFreeNumber || "Toll Free 1-855-305-2110", x, 100, {
    fontSize: 8,
  });

  // Row 7: MFG
  placeText(doc, `MFG: ${data.manufacturer}`, x, 112, {
    fontSize: 7, upperCase: true,
  });

  // Row 8: RPH | Comp | Partial
  const rphParts = [`RPH: ${data.pharmacistFirstName[0]} ${data.pharmacistLastName}`];
  if (data.completionQuantity) rphParts.push(`Comp: ${data.completionQuantity}`);
  if (data.partialQuantity) rphParts.push(`Partial: ${data.partialQuantity}`);
  placeText(doc, rphParts.join(" | "), x, 124, {
    fontSize: 6, upperCase: true,
  });

  // Row 9: Formula | Batch | Use By
  const batchParts: string[] = [];
  if (data.formulaId) batchParts.push(`Formula: ${data.formulaId}`);
  if (data.batchId) batchParts.push(`Batch: ${data.batchId}`);
  if (data.batchExpiration) batchParts.push(`Use By: ${data.batchExpiration}`);
  if (batchParts.length > 0) {
    placeText(doc, batchParts.join(" | "), x, 136, { fontSize: 6 });
  }

  // Row 10: Barcode
  try {
    const bcText = `b${data.fillId}:${data.labelVersion}`;
    const png = await generateBarcodePNG(bcText, 12);
    doc.image(png, x, 150, { height: 25, fit: [200, 25] });
  } catch {
    placeText(doc, `[BC] b${data.fillId}:${data.labelVersion}`, x, 150, { fontSize: 6 });
  }
}

// ---------------------------------------------------------------------------
// Section 2: BOTTOM LABEL  (x: 0–3.2", y: 178–288pt)
// ---------------------------------------------------------------------------

async function drawBottomLabel(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): Promise<void> {
  const x = SEC1_LEFT;
  const y0 = SEC2_TOP;

  // Row 1: RX# | Filled | Doctor
  placeText(doc, `RX# ${data.rxNumber}`, x, y0, { fontSize: 11, bold: true });
  placeText(doc, `Filled: ${data.fillDate}`, x + 90, y0 + 1, { fontSize: 10 });
  placeText(doc, `${data.doctorFirstName} ${data.doctorLastName}`, x + 175, y0 + 2, {
    fontSize: 9, upperCase: true,
  });

  // Row 2: Patient name (reversed) | Doctor address
  placeText(doc, `${data.patientFirstName} ${data.patientLastName}`, x, y0 + 14, {
    fontSize: 12, bold: true, upperCase: true,
  });
  placeText(doc, data.doctorAddressLine1, x + 160, y0 + 16, { fontSize: 8 });

  // Row 3: DOB | Doctor city/state/zip
  placeText(doc, `DOB: ${data.patientDOB}`, x, y0 + 28, {
    fontSize: 8, bold: true, upperCase: true,
  });
  const drCSZ = [data.doctorCity, `${data.doctorState} ${data.doctorZip}`].filter(Boolean).join(", ");
  placeText(doc, drCSZ, x + 160, y0 + 28, { fontSize: 8, upperCase: true });

  // Row 4: Patient address | Doctor phone
  const addrFull = [data.patientAddressLine1, data.patientAddressLine2].filter(Boolean).join(" ");
  placeText(doc, addrFull, x, y0 + 40, { fontSize: 8, upperCase: true });
  placeText(doc, data.doctorPhone, x + 160, y0 + 40, { fontSize: 8 });

  // Row 5: Phones | Insurance
  const phoneParts = [data.patientPhone, data.patientCellPhone, data.primaryInsurance]
    .filter(Boolean)
    .join(" | ");
  placeText(doc, phoneParts, x, y0 + 52, {
    fontSize: 8, upperCase: true, maxWidth: SEC1_RIGHT - x,
  });

  // Row 6: Delivery | Price
  placeText(doc, data.patientDeliveryMethod, x, y0 + 64, {
    fontSize: 12, bold: true, upperCase: true,
  });
  placeText(doc, `Price: $${data.copay}`, x + 100, y0 + 64, {
    fontSize: 10, bold: true,
  });

  // Row 7: Drug name full
  placeText(doc, data.itemName, x, y0 + 78, {
    fontSize: 8, bold: true, upperCase: true, maxWidth: 288, // 4"
  });

  // Row 8: QTY | FILL#
  placeText(doc, `QTY: ${data.dispensedQuantity} ${data.qtyType} | FILL#: ${data.fillNumber}`, x, y0 + 90, {
    fontSize: 8, bold: true,
  });

  // Row 9: Barcode
  try {
    const bcText = `b${data.fillId}:${data.labelVersion}`;
    const png = await generateBarcodePNG(bcText, 10);
    doc.image(png, x, y0 + 100, { height: 20, fit: [180, 20] });
  } catch {
    placeText(doc, `[BC] b${data.fillId}:${data.labelVersion}`, x, y0 + 100, { fontSize: 6 });
  }
}

// ---------------------------------------------------------------------------
// Section 3: RIGHT PANEL TOP  (x: 3.3"–8", y: 0–144pt)  AUX + batch
// ---------------------------------------------------------------------------

function drawAuxSection(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): void {
  const x = SEC3_LEFT;
  let y = 6;

  // Aux labels (up to 4)
  for (let i = 0; i < Math.min(data.auxLabels.length, 4); i++) {
    placeText(doc, data.auxLabels[i], x, y, {
      fontSize: 8, maxWidth: SEC3_RIGHT - x, upperCase: true,
    });
    y += 14;
  }

  // Compounded notice
  y += 4;
  placeText(doc, "This medication has been compounded by this pharmacy", x, y, {
    fontSize: 8, maxWidth: SEC3_RIGHT - x,
  });
  y += 20;

  // Batch / Formula / Use By
  if (data.formulaId) {
    placeText(doc, `FormulaID: ${data.formulaId}`, x, y, { fontSize: 6 });
    y += 10;
  }
  if (data.batchId) {
    placeText(doc, `Batch: ${data.batchId}`, x, y, { fontSize: 6 });
    y += 10;
  }
  if (data.batchExpiration) {
    placeText(doc, `Use By: ${data.batchExpiration}`, x, y, { fontSize: 6 });
  }
}

// ---------------------------------------------------------------------------
// Section 4: RIGHT PANEL BOTTOM  (x: 3.3"–8", y: 144–288pt)
// Signature area, patient notes, fill tags, barcodes, backtag
// ---------------------------------------------------------------------------

async function drawSignatureAndNotes(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): Promise<void> {
  const x = SEC3_LEFT;
  let y = SEC4_TOP + 2;

  // Signature 1: patient name | home | cell
  const sig1 = [
    `${data.patientFirstName} ${data.patientLastName}`,
    `Home: ${data.patientPhone}`,
    `Cell: ${data.patientCellPhone}`,
  ].filter(Boolean).join(" | ");
  placeText(doc, sig1, x, y, { fontSize: 7, upperCase: true });
  y += 12;

  // BOH
  if (data.boh) {
    placeText(doc, `BOH: ${data.boh}`, x, y, { fontSize: 8, bold: true });
    y += 12;
  }

  // Signature 2 (duplicate)
  const sig2 = [
    `${data.patientFirstName} ${data.patientLastName}`,
    `Home: ${data.patientPhone}`,
    `Cell: ${data.patientCellPhone}`,
  ].filter(Boolean).join(" | ");
  placeText(doc, sig2, x, y, { fontSize: 7, upperCase: true });
  y += 12;

  // Signature line
  placeText(doc, "Signature: __________________________", x, y, { fontSize: 6 });
  y += 12;

  // Patient comments
  if (data.patientComments) {
    placeText(doc, data.patientComments, x, y, {
      fontSize: 10, maxWidth: 216, // 3"
    });
    y += 22;
  }

  // Fill tags
  if (data.fillTags.length > 0) {
    placeText(doc, data.fillTags.join(", "), x, y, {
      fontSize: 10, maxWidth: 216,
    });
    y += 14;
  }

  // Promised time
  if (data.pickupTime) {
    placeText(doc, `Promised: ${data.pickupTime}`, x, y, { fontSize: 7 });
    y += 10;
  }

  // Disp Qty | Filled | NDC
  const dispLine = [
    `Disp Qty: ${data.dispensedQuantity}`,
    `Filled: ${data.fillDate}`,
    `NDC: ${data.ndc}`,
  ].join(" | ");
  placeText(doc, dispLine, x, y, { fontSize: 6 });
  y += 12;

  // Barcode + QR side by side
  try {
    const bcText = `${data.fillId}:${data.fillNumber}`;
    const png = await generateBarcodePNG(bcText, 10);
    doc.image(png, x, y, { height: 20, fit: [140, 20] });
  } catch {
    placeText(doc, `[BC] ${data.fillId}:${data.fillNumber}`, x, y, { fontSize: 6 });
  }

  if (data.patientEducationUrl) {
    try {
      const qrPng = await generateQRPNG(data.patientEducationUrl, 150);
      if (qrPng.length > 0) {
        doc.image(qrPng, x + 150, y - 5, { width: 30, height: 30 });
      }
    } catch { /* QR optional */ }
  }

  // --- Backtag info (small text, below barcodes / bottom-right) ---
  const btX = SEC3_LEFT + 200;
  let btY = SEC4_TOP + 4;

  placeText(doc, `RX ${data.rxNumber} | DOB: ${data.patientDOB} | Filled ${data.fillDate}`, btX, btY, {
    fontSize: 6,
  });
  btY += 9;

  placeText(doc, `${data.patientFirstName} ${data.patientLastName}`, btX, btY, {
    fontSize: 7, bold: true, upperCase: true,
  });
  placeText(doc, `${data.doctorFirstName} ${data.doctorLastName}`, btX + 100, btY, {
    fontSize: 6, upperCase: true,
  });
  btY += 9;

  // Doctor address / DEA / NPI
  const drAddr = [data.doctorAddressLine1, data.doctorAddressLine2, data.doctorCity, data.doctorState, data.doctorZip]
    .filter(Boolean).join(" ");
  placeText(doc, drAddr, btX, btY, { fontSize: 6, maxWidth: 130 });
  btY += 9;
  placeText(doc, `DEA: ${data.doctorDEA} | NPI: ${data.doctorNPI}`, btX, btY, { fontSize: 6 });
  btY += 9;

  // Drug / SIG / NDC / QTY
  placeText(doc, data.itemName, btX, btY, { fontSize: 6, maxWidth: 130, upperCase: true });
  btY += 18;
  placeText(doc, data.sig, btX, btY, { fontSize: 6, maxWidth: 130 });
  btY += 18;
  placeText(doc, `NDC: ${data.ndc} | QTY: ${data.dispensedQuantity} ${data.qtyType}`, btX, btY, { fontSize: 6 });
  btY += 9;

  // Comp / Partial
  const cpParts: string[] = [];
  if (data.completionQuantity) cpParts.push(`Comp: ${data.completionQuantity}`);
  if (data.partialQuantity) cpParts.push(`Partial: ${data.partialQuantity}`);
  if (cpParts.length > 0) {
    placeText(doc, cpParts.join(" | "), btX, btY, { fontSize: 6 });
    btY += 9;
  }

  // Insurance copay
  placeText(doc, `INS: $${data.copay}`, btX, btY, { fontSize: 6 });
  btY += 9;

  // Refills / expires
  placeText(doc, `${data.refillsLeft} Refill(s) left until ${data.rxExpires}`, btX, btY, { fontSize: 6 });
}

// ---------------------------------------------------------------------------
// Watermarks (overlaid with opacity)
// ---------------------------------------------------------------------------

function drawWatermarks(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): void {
  if (data.holdWarning) {
    doc.save();
    doc.fillOpacity(0.5);
    doc.font("Helvetica-Bold").fontSize(30);
    doc.save();
    doc.translate(100, 100);
    doc.rotate(-15);
    doc.text("HOLD", 0, 0, { lineBreak: false });
    doc.restore();
    doc.fillOpacity(1);
    doc.restore();
  }

  if (data.noClaimWarning) {
    doc.save();
    doc.fillOpacity(0.5);
    doc.font("Helvetica-Bold").fontSize(24);
    doc.save();
    doc.translate(80, 200);
    doc.rotate(-15);
    doc.text("NO PAID CLAIM", 0, 0, { lineBreak: false });
    doc.restore();
    doc.fillOpacity(1);
    doc.restore();
  }
}

// ---------------------------------------------------------------------------
// Separator lines
// ---------------------------------------------------------------------------

function drawSeparators(doc: InstanceType<typeof PDFDocument>): void {
  doc.save();
  doc.lineWidth(0.5).strokeColor("#999999");

  // Horizontal line between Section 1 (main label) and Section 2 (bottom label)
  doc.moveTo(SEC1_LEFT, SEC2_TOP - 2).lineTo(SEC1_RIGHT, SEC2_TOP - 2).stroke();

  // Vertical line between left and right panels
  const vx = SEC3_LEFT - 4;
  doc.moveTo(vx, 0).lineTo(vx, PDF_H).stroke();

  // Horizontal line in right panel between Section 3 and Section 4
  doc.moveTo(SEC3_LEFT, SEC4_TOP).lineTo(SEC3_RIGHT, SEC4_TOP).stroke();

  doc.restore();
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/**
 * Draw a complete DRX compound label onto a PDFDocument page
 */
export async function drawCompoundLabel(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): Promise<void> {
  drawSeparators(doc);
  await drawMainLabel(doc, data);
  await drawBottomLabel(doc, data);
  drawAuxSection(doc, data);
  await drawSignatureAndNotes(doc, data);
  drawWatermarks(doc, data);
}

/**
 * Generate a compound label PDF as a Buffer
 */
export async function generateCompoundLabelPDF(
  data: CompoundLabelData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PDF_W, PDF_H],
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
