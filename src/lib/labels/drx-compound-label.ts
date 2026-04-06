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
// Layout constants — absolute positions, row-based cursor advancement
// ---------------------------------------------------------------------------

// Left panel: x 0–234, Right panel: x 240–572
const LEFT_X = 4;
const LEFT_W = 226;
const RIGHT_X = 240;
const RIGHT_W = 332;

// ---------------------------------------------------------------------------
// Section 1: MAIN LABEL — Left panel, top (y: 4–168)
// ---------------------------------------------------------------------------

async function drawMainLabel(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): Promise<void> {
  let y = 4;

  // Row 1: RX# | Doctor | Qty
  placeText(doc, `RX# ${data.rxNumber}`, LEFT_X, y, { fontSize: 8 });
  placeText(doc, `Doctor: ${data.doctorFirstName} ${data.doctorLastName}`, LEFT_X + 100, y, { fontSize: 5 });
  placeText(doc, `Qty: ${data.dispensedQuantity} ${data.qtyType}`, LEFT_X + 180, y, { fontSize: 6 });
  y += 11;

  // Row 2: Patient Name (bold 11pt uppercase)
  placeText(doc, `${data.patientLastName}, ${data.patientFirstName}`, LEFT_X, y, {
    fontSize: 11, bold: true, upperCase: true,
  });
  y += 14;

  // Row 3: Drug Name
  placeText(doc, data.itemPrintName, LEFT_X, y, { fontSize: 10 });
  y += 13;

  // Row 4: Generic For (only if brandName exists)
  if (data.brandName) {
    placeText(doc, `Generic For: ${data.brandName}`, LEFT_X, y, { fontSize: 10 });
    y += 13;
  }

  // Row 5: SIG directions (9pt, maxWidth 226pt — may wrap 2-3 lines)
  placeText(doc, data.sig, LEFT_X, y, { fontSize: 9, maxWidth: LEFT_W });
  // Estimate wrapped height
  const sigCharWidth = 4.5; // approx char width at 9pt
  const sigLines = Math.max(1, Math.ceil((data.sig.length * sigCharWidth) / LEFT_W));
  y += sigLines * 12;

  // Row 6: Toll Free
  placeText(doc, data.tollFreeNumber || "Toll Free 1-855-305-2110", LEFT_X, y, { fontSize: 8 });
  y += 11;

  // Row 7: MFG
  placeText(doc, `MFG: ${data.manufacturer}`, LEFT_X, y, { fontSize: 7, upperCase: true });
  y += 10;

  // Row 8: RPH + Comp/Partial
  placeText(doc, `RPH: ${data.pharmacistFirstName[0]} ${data.pharmacistLastName}`, LEFT_X, y, { fontSize: 6 });
  let rphX = LEFT_X + 80;
  if (data.completionQuantity) {
    placeText(doc, "Comp", rphX, y, { fontSize: 6, bold: true });
    rphX += 30;
  }
  if (data.partialQuantity) {
    placeText(doc, "Partial", rphX, y, { fontSize: 6, bold: true });
  }
  y += 9;

  // Row 9: Formula | Batch | Use By
  const fbParts: string[] = [];
  if (data.formulaId) fbParts.push(`Formula: ${data.formulaId}`);
  if (data.batchId) fbParts.push(`Batch: ${data.batchId}`);
  if (data.batchExpiration) fbParts.push(`Use By: ${data.batchExpiration}`);
  if (fbParts.length > 0) {
    placeText(doc, fbParts.join(" | "), LEFT_X, y, { fontSize: 6 });
  }
  y += 9;

  // Row 10: BARCODE — horizontal, full width
  try {
    const bcText = `b${data.fillId}:${data.labelVersion}`;
    const png = await generateBarcodePNG(bcText, 10);
    doc.image(png, LEFT_X, y, { height: 22, fit: [200, 22] });
  } catch {
    placeText(doc, `[BC] b${data.fillId}:${data.labelVersion}`, LEFT_X, y, { fontSize: 6 });
  }
}

// ---------------------------------------------------------------------------
// Section 2: BOTTOM LABEL — Left panel, bottom (y: 172–284)
// ---------------------------------------------------------------------------

async function drawBottomLabel(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): Promise<void> {
  let y = 174;

  // Row 1: RX# | Filled | Doctor
  placeText(doc, `RX# ${data.rxNumber}`, LEFT_X, y, { fontSize: 11, bold: true });
  placeText(doc, `Filled: ${data.fillDate}`, LEFT_X + 100, y, { fontSize: 9 });
  placeText(doc, `${data.doctorFirstName} ${data.doctorLastName}`, LEFT_X + 170, y, { fontSize: 8 });
  y += 14;

  // Row 2: Patient Name (bold 12pt uppercase)
  placeText(doc, `${data.patientFirstName} ${data.patientLastName}`, LEFT_X, y, {
    fontSize: 12, bold: true, upperCase: true,
  });
  y += 15;

  // Row 3: DOB | Doctor Address
  placeText(doc, `DOB: ${data.patientDOB}`, LEFT_X, y, { fontSize: 8, bold: true });
  placeText(doc, data.doctorAddressLine1, LEFT_X + 100, y, { fontSize: 7 });
  y += 11;

  // Row 4: Patient Address | Doctor City/State/Zip
  const addrFull = [data.patientAddressLine1, data.patientAddressLine2].filter(Boolean).join(" ");
  placeText(doc, addrFull, LEFT_X, y, { fontSize: 7 });
  const drCSZ = [data.doctorCity, `${data.doctorState} ${data.doctorZip}`].filter(Boolean).join(", ");
  placeText(doc, drCSZ, LEFT_X + 100, y, { fontSize: 7 });
  y += 10;

  // Row 5: Patient City/State/Zip | Doctor Phone
  const patCSZ = [data.patientCity, `${data.patientState} ${data.patientZip}`].filter(Boolean).join(", ");
  placeText(doc, patCSZ, LEFT_X, y, { fontSize: 7 });
  placeText(doc, data.doctorPhone, LEFT_X + 100, y, { fontSize: 7 });
  y += 10;

  // Row 6: Phone | Cell | Insurance
  const phoneLine = [data.patientPhone, data.patientCellPhone, data.primaryInsurance].filter(Boolean).join(" | ");
  placeText(doc, phoneLine, LEFT_X, y, { fontSize: 7, maxWidth: LEFT_W });
  y += 10;

  // Row 7: Delivery Method | Price
  placeText(doc, data.patientDeliveryMethod, LEFT_X, y, { fontSize: 10, bold: true, upperCase: true });
  placeText(doc, `Price: $${data.copay}`, LEFT_X + 100, y, { fontSize: 9, bold: true });
  y += 13;

  // Row 8: Drug Name Full
  placeText(doc, data.itemName, LEFT_X, y, { fontSize: 7, bold: true, upperCase: true, maxWidth: LEFT_W });
  y += 10;

  // Row 9: QTY | FILL#
  placeText(doc, `QTY: ${data.dispensedQuantity} ${data.qtyType} | FILL#: ${data.fillNumber}`, LEFT_X, y, {
    fontSize: 7, bold: true,
  });
  y += 10;

  // Row 10: BARCODE — vertical, placed at right edge of section
  try {
    const bcText = `b${data.fillId}:${data.labelVersion}`;
    const png = await generateBarcodePNG(bcText, 8);
    doc.save();
    doc.translate(210, 268);
    doc.rotate(-90);
    doc.image(png, 0, 0, { height: 18, fit: [70, 18] });
    doc.restore();
  } catch {
    placeText(doc, `[BC] b${data.fillId}:${data.labelVersion}`, 200, y, { fontSize: 6 });
  }
}

// ---------------------------------------------------------------------------
// Section 3: AUX LABELS — Right panel, top (y: 4–100)
// ---------------------------------------------------------------------------

async function drawAuxSection(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): Promise<void> {
  let y = 4;
  const pw = RIGHT_W;

  // Rows 1-4: auxLabels[0..3]
  for (let i = 0; i < 4; i++) {
    if (data.auxLabels[i]) {
      placeText(doc, data.auxLabels[i], RIGHT_X, y, { fontSize: 8, upperCase: true, maxWidth: pw });
    }
    y += 11;
  }

  // Row 5: Compounded notice
  placeText(doc, "This medication has been compounded by this pharmacy", RIGHT_X, y, {
    fontSize: 7, maxWidth: pw,
  });
  y += 10;

  // Row 6: FormulaID
  if (data.formulaId) {
    placeText(doc, `FormulaID: ${data.formulaId}`, RIGHT_X, y, { fontSize: 6 });
  }
  y += 9;

  // Row 7: Batch
  if (data.batchId) {
    placeText(doc, `Batch: ${data.batchId}`, RIGHT_X, y, { fontSize: 6 });
  }
  y += 9;

  // Row 8: Use By
  if (data.batchExpiration) {
    placeText(doc, `Use By: ${data.batchExpiration}`, RIGHT_X, y, { fontSize: 6 });
  }
  y += 9;

  // Row 9: QR code (40x40pt)
  if (data.patientEducationUrl) {
    try {
      const qrPng = await generateQRPNG(data.patientEducationUrl, 40);
      if (qrPng.length > 0) {
        doc.image(qrPng, RIGHT_X, y, { width: 40, height: 40 });
      }
    } catch {
      placeText(doc, "[QR]", RIGHT_X, y, { fontSize: 6 });
    }
  }
}

// ---------------------------------------------------------------------------
// Section 4: SIGNATURE + NOTES — Right panel, middle (y: 104–196)
// ---------------------------------------------------------------------------

async function drawSignatureAndNotes(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): Promise<void> {
  let y = 106;

  // Row 1: Patient Name | Home Phone | Cell Phone
  placeText(doc, `${data.patientFirstName} ${data.patientLastName}`, RIGHT_X, y, {
    fontSize: 7, bold: true,
  });
  placeText(doc, `Home: ${data.patientPhone}`, RIGHT_X + 80, y, { fontSize: 6 });
  placeText(doc, `Cell: ${data.patientCellPhone}`, RIGHT_X + 155, y, { fontSize: 6 });
  y += 10;

  // Row 2: BOH
  if (data.boh) {
    placeText(doc, `BOH: ${data.boh}`, RIGHT_X, y, { fontSize: 7, bold: true });
  }
  y += 10;

  // Row 3: Patient Name (second signature) | Home | Cell
  placeText(doc, `${data.patientFirstName} ${data.patientLastName}`, RIGHT_X, y, {
    fontSize: 7, bold: true,
  });
  placeText(doc, `Home: ${data.patientPhone}`, RIGHT_X + 80, y, { fontSize: 6 });
  placeText(doc, `Cell: ${data.patientCellPhone}`, RIGHT_X + 155, y, { fontSize: 6 });
  y += 10;

  // Row 4: Signature line
  placeText(doc, "Signature: __________________________", RIGHT_X, y, { fontSize: 6 });
  y += 9;

  // Row 5: Patient Comments (may wrap)
  if (data.patientComments) {
    placeText(doc, data.patientComments, RIGHT_X, y, { fontSize: 7, maxWidth: 200 });
    const cmtCharWidth = 3.5;
    const cmtLines = Math.max(1, Math.ceil((data.patientComments.length * cmtCharWidth) / 200));
    y += cmtLines * 10;
  }

  // Row 6: Fill Tags
  if (data.fillTags.length > 0) {
    placeText(doc, `Tags: ${data.fillTags.join(", ")}`, RIGHT_X, y, { fontSize: 7 });
  }
  y += 10;

  // Row 7: Promised
  if (data.pickupTime) {
    placeText(doc, `Promised: ${data.pickupTime}`, RIGHT_X, y, { fontSize: 6 });
  }
  y += 9;

  // Row 8: Disp Qty | Filled | NDC
  placeText(doc, `Disp Qty: ${data.dispensedQuantity} | Filled: ${data.fillDate} | NDC: ${data.ndc}`, RIGHT_X, y, {
    fontSize: 5,
  });
  y += 8;

  // Row 9: Barcodes — item ID vertical | sig barcode vertical, side by side
  try {
    if (data.itemId) {
      const itemBcPng = await generateBarcodePNG(`i:${data.itemId}`, 6);
      doc.save();
      doc.translate(RIGHT_X, y + 50);
      doc.rotate(-90);
      doc.image(itemBcPng, 0, 0, { height: 14, fit: [50, 14] });
      doc.restore();
    }
  } catch {
    placeText(doc, `[BC] i:${data.itemId}`, RIGHT_X, y, { fontSize: 5 });
  }

  try {
    const sigBcPng = await generateBarcodePNG(`b${data.fillId}:${data.fillNumber}`, 6);
    doc.save();
    doc.translate(RIGHT_X + 20, y + 50);
    doc.rotate(-90);
    doc.image(sigBcPng, 0, 0, { height: 14, fit: [50, 14] });
    doc.restore();
  } catch {
    placeText(doc, `[BC] b${data.fillId}:${data.fillNumber}`, RIGHT_X + 20, y, { fontSize: 5 });
  }
}

// ---------------------------------------------------------------------------
// BACKTAG — Right panel, bottom (y: 200–284)
// ---------------------------------------------------------------------------

function drawBacktag(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): void {
  let y = 202;
  const btX = RIGHT_X;

  // Row 1: RX# | DOB | Filled
  placeText(doc, `RX ${data.rxNumber}`, btX, y, { fontSize: 5, bold: true });
  placeText(doc, `DOB: ${data.patientDOB}`, btX + 60, y, { fontSize: 5 });
  placeText(doc, `Filled ${data.fillDate}`, btX + 140, y, { fontSize: 5 });
  y += 8;

  // Row 2: Patient Name | Doctor Name
  placeText(doc, `${data.patientFirstName} ${data.patientLastName}`, btX, y, {
    fontSize: 6, bold: true, upperCase: true,
  });
  placeText(doc, `${data.doctorFirstName} ${data.doctorLastName}`, btX + 140, y, {
    fontSize: 5, upperCase: true,
  });
  y += 9;

  // Row 3: Patient Address | Doctor Address
  const btAddrFull = [data.patientAddressLine1, data.patientAddressLine2].filter(Boolean).join(" ");
  placeText(doc, btAddrFull, btX, y, { fontSize: 5 });
  const drAddrFull = [data.doctorAddressLine1, data.doctorCity, `${data.doctorState} ${data.doctorZip}`].filter(Boolean).join(", ");
  placeText(doc, drAddrFull, btX + 140, y, { fontSize: 5, maxWidth: 180 });
  y += 8;

  // Row 4: Patient City/State/Zip | DEA | NPI
  const btPatCSZ = [data.patientCity, `${data.patientState}, ${data.patientZip}`].filter(Boolean).join(", ");
  placeText(doc, btPatCSZ, btX, y, { fontSize: 5, upperCase: true });
  placeText(doc, `DEA: ${data.doctorDEA}`, btX + 140, y, { fontSize: 5 });
  placeText(doc, `NPI: ${data.doctorNPI}`, btX + 220, y, { fontSize: 5 });
  y += 8;

  // Row 5: Drug Name (full, uppercase)
  placeText(doc, data.itemName, btX, y, { fontSize: 5, maxWidth: 320, upperCase: true });
  y += 8;

  // Row 6: SIG
  placeText(doc, data.sig, btX, y, { fontSize: 5, maxWidth: 320 });
  const sigCharWidth = 2.5;
  const sigLines = Math.max(1, Math.ceil((data.sig.length * sigCharWidth) / 320));
  y += sigLines * 8;

  // Row 7: NDC | QTY | INS | Filled
  placeText(doc, `NDC: ${data.ndc} | QTY: ${data.dispensedQuantity} | INS: $${data.copay} | Filled: ${data.fillDate}`, btX, y, {
    fontSize: 5,
  });
  y += 8;

  // Row 8: Refills
  placeText(doc, `${data.refillsLeft} Refill(s) left until ${data.rxExpires}`, btX, y, { fontSize: 5 });
}

// ---------------------------------------------------------------------------
// Watermarks (overlaid with opacity, slight angle)
// ---------------------------------------------------------------------------

function drawWatermarks(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): void {
  if (data.holdWarning) {
    doc.save();
    doc.fillOpacity(0.5);
    doc.font("Helvetica-Bold").fontSize(30);
    doc.translate(300, 140);
    doc.rotate(-15);
    doc.text("HOLD", 0, 0, { lineBreak: false });
    doc.restore();
  }

  if (data.noClaimWarning) {
    doc.save();
    doc.fillOpacity(0.5);
    doc.font("Helvetica-Bold").fontSize(30);
    doc.translate(260, 180);
    doc.rotate(-15);
    doc.text("NO PAID CLAIM", 0, 0, { lineBreak: false });
    doc.restore();
  }
}

// ---------------------------------------------------------------------------
// Separator lines
// ---------------------------------------------------------------------------

function drawSeparators(doc: InstanceType<typeof PDFDocument>): void {
  doc.save();
  doc.lineWidth(0.5).strokeColor("#999999");

  // Horizontal line in left panel between main label and bottom label (y=170)
  doc.moveTo(LEFT_X, 170).lineTo(234, 170).stroke();

  // Vertical line between left and right panels (x=236)
  doc.moveTo(236, 0).lineTo(236, PDF_H).stroke();

  // Horizontal line in right panel between AUX and Signature sections (y=102)
  doc.moveTo(RIGHT_X, 102).lineTo(572, 102).stroke();

  // Horizontal line in right panel between Signature and Backtag (y=200)
  doc.moveTo(RIGHT_X, 200).lineTo(572, 200).stroke();

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
  await drawAuxSection(doc, data);
  await drawSignatureAndNotes(doc, data);
  drawBacktag(doc, data);
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
