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
// DRX coordinate conversion helpers
// ---------------------------------------------------------------------------

/**
 * Convert DRX x_position, y_position to PDF landscape coordinates.
 * PDF is 576pt × 288pt (8" × 4" landscape at 72 DPI).
 *
 *   PDF_X = drxY × 72       (DRX y_position → horizontal)
 *   PDF_Y = (4 - drxX) × 72 - fontSize  (DRX x_position → vertical, inverted)
 *
 * All DRX text elements have rotation=-90 (read sideways on portrait) which
 * maps to normal horizontal text in landscape. Elements with rotation=null/0
 * are horizontal in DRX portrait and become vertical in landscape.
 */
function drx(drxX: number, drxY: number, fontSize: number): { x: number; y: number } {
  return {
    x: drxY * 72,
    y: (4 - drxX) * 72 - fontSize,
  };
}

// ---------------------------------------------------------------------------
// Toll Free line (separate helper called from drawMainLabel)
// ---------------------------------------------------------------------------

function drawTollFree(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): void {
  // DRX: x:2.35 y:0.1 fs:10 "Toll Free 1-855-305-2110"
  const pos = drx(2.35, 0.1, 10);
  placeText(doc, data.tollFreeNumber || "Toll Free 1-855-305-2110", pos.x, pos.y, {
    fontSize: 10,
  });
}

// ---------------------------------------------------------------------------
// Section 1: MAIN LABEL — Left half, top portion
// DRX elements with rotation=-90 → horizontal text via placeText
// ---------------------------------------------------------------------------

async function drawMainLabel(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): Promise<void> {
  // x:3.35 y:0.1 fs:8 "RX# {{el}}"
  const rxPos = drx(3.35, 0.1, 8);
  placeText(doc, `RX# ${data.rxNumber}`, rxPos.x, rxPos.y, { fontSize: 8 });

  // x:3.35 y:1.6 fs:5 doctor name
  const drPos = drx(3.35, 1.6, 5);
  placeText(doc, `${data.doctorFirstName} ${data.doctorLastName}`, drPos.x, drPos.y, {
    fontSize: 5, upperCase: true,
  });

  // x:3.2 y:1.8 fs:6 "Quantity: {{el}}"
  const qtyPos = drx(3.2, 1.8, 6);
  placeText(doc, `Quantity: ${data.dispensedQuantity} ${data.qtyType}`, qtyPos.x, qtyPos.y, {
    fontSize: 6,
  });

  // x:3.15 y:0.1 fs:10 patient.last_name, first_name
  const patPos = drx(3.15, 0.1, 10);
  placeText(doc, `${data.patientLastName}, ${data.patientFirstName}`, patPos.x, patPos.y, {
    fontSize: 10, bold: true, upperCase: true,
  });

  // x:2.95 y:0.1 fs:12 item.print_name (show only iftrue)
  const itemPos = drx(2.95, 0.1, 12);
  placeText(doc, data.itemPrintName, itemPos.x, itemPos.y, { fontSize: 12 });

  // x:2.8 y:0.1 fs:12 brand_name_if_generic
  if (data.brandName) {
    const brandPos = drx(2.8, 0.1, 12);
    placeText(doc, `Generic For ${data.brandName}`, brandPos.x, brandPos.y, { fontSize: 12 });
  }

  // x:2.75 y:0.1 fs:10 item.print_name second line (slice 24-50)
  if (data.itemPrintName.length > 24) {
    const item2Pos = drx(2.75, 0.1, 10);
    placeText(doc, data.itemPrintName.slice(24, 50), item2Pos.x, item2Pos.y, { fontSize: 10 });
  }

  // x:2.6 y:0.1 fs:12 prescription.sig_translated pw:3.4
  const sigPos = drx(2.6, 0.1, 12);
  placeText(doc, data.sig, sigPos.x, sigPos.y, {
    fontSize: 12, maxWidth: 3.4 * 72,
  });

  // x:2.35 y:0.1 fs:10 toll free
  drawTollFree(doc, data);

  // x:2.2 y:0.1 fs:8 "MFG: ..." pw:3.8
  const mfgPos = drx(2.2, 0.1, 8);
  placeText(doc, `MFG: ${data.manufacturer}`, mfgPos.x, mfgPos.y, {
    fontSize: 8, upperCase: true, maxWidth: 3.8 * 72,
  });

  // x:2.2 y:1.35 fs:6 "Formula: {{el}}"
  const fmPos = drx(2.2, 1.35, 6);
  if (data.formulaId) {
    placeText(doc, `Formula: ${data.formulaId}`, fmPos.x, fmPos.y, { fontSize: 6 });
  }

  // x:2.1 y:1.35 fs:6 "Batch: {{el}}"
  const bchPos = drx(2.1, 1.35, 6);
  if (data.batchId) {
    placeText(doc, `Batch: ${data.batchId}`, bchPos.x, bchPos.y, { fontSize: 6 });
  }

  // x:2.0 y:0.1 fs:6 "RPH: Emily"
  const rphPos = drx(2.0, 0.1, 6);
  placeText(doc, `RPH: ${data.pharmacistFirstName}`, rphPos.x, rphPos.y, { fontSize: 6 });

  // x:2.0 y:0.5 fs:6 "Bychkov" (pharmacist last name)
  const rph2Pos = drx(2.0, 0.5, 6);
  placeText(doc, data.pharmacistLastName, rph2Pos.x, rph2Pos.y, { fontSize: 6 });

  // x:2.0 y:0.9 fs:8 BOLD "Comp"
  if (data.completionQuantity) {
    const compPos = drx(2.0, 0.9, 8);
    placeText(doc, `Comp`, compPos.x, compPos.y, { fontSize: 8, bold: true });
  }

  // x:2.0 y:1.3 fs:8 BOLD "Partial"
  if (data.partialQuantity) {
    const partPos = drx(2.0, 1.3, 8);
    placeText(doc, `Partial`, partPos.x, partPos.y, { fontSize: 8, bold: true });
  }

  // x:2.0 y:2.5 rot:null [BC128] "b154687:0" — HORIZONTAL barcode
  // DRX rotation=null → place horizontally with doc.image()
  try {
    const bcText = `b${data.fillId}:${data.labelVersion}`;
    const png = await generateBarcodePNG(bcText, 10);
    const bcPos = drx(2.0, 2.5, 22); // use barcode height as fontSize offset
    doc.image(png, bcPos.x, bcPos.y, { height: 22, fit: [200, 22] });
  } catch {
    const bcPos = drx(2.0, 2.5, 6);
    placeText(doc, `[BC] b${data.fillId}:${data.labelVersion}`, bcPos.x, bcPos.y, { fontSize: 6 });
  }
}

// ---------------------------------------------------------------------------
// Section 2: BOTTOM LABEL — Left half, bottom portion
// ---------------------------------------------------------------------------

async function drawBottomLabel(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): Promise<void> {
  // x:1.3 y:0.1 fs:11 BOLD "RX# 154687"
  const rxPos = drx(1.3, 0.1, 11);
  placeText(doc, `RX# ${data.rxNumber}`, rxPos.x, rxPos.y, { fontSize: 11, bold: true });

  // x:1.3 y:1.2 fs:10 "Filled: 21/12/2022"
  const fillPos = drx(1.3, 1.2, 10);
  placeText(doc, `Filled: ${data.fillDate}`, fillPos.x, fillPos.y, { fontSize: 10 });

  // x:1.3 y:2.4 fs:9 "CHARLES MURPHY" (doctor name)
  const drNamePos = drx(1.3, 2.4, 9);
  placeText(doc, `${data.doctorFirstName} ${data.doctorLastName}`, drNamePos.x, drNamePos.y, {
    fontSize: 9, upperCase: true,
  });

  // x:1.2 y:2.4 fs:8 "132 Unknown Ave" (doctor address)
  const drAddrPos = drx(1.2, 2.4, 8);
  placeText(doc, data.doctorAddressLine1, drAddrPos.x, drAddrPos.y, { fontSize: 8 });

  // x:1.1 y:0.1 fs:12 BOLD "ROLYAT GRAY" (patient name)
  const patPos = drx(1.1, 0.1, 12);
  placeText(doc, `${data.patientFirstName} ${data.patientLastName}`, patPos.x, patPos.y, {
    fontSize: 12, bold: true, upperCase: true,
  });

  // x:1.1 y:2.4 fs:8 "LAKE CHARLES, LA 01457" (doctor city/state/zip)
  const drCSZPos = drx(1.1, 2.4, 8);
  const drCSZ = [data.doctorCity, `${data.doctorState} ${data.doctorZip}`].filter(Boolean).join(", ");
  placeText(doc, drCSZ, drCSZPos.x, drCSZPos.y, { fontSize: 8, upperCase: true });

  // x:1.0 y:2.4 fs:8 "(585) 454-7777" (doctor phone)
  const drPhPos = drx(1.0, 2.4, 8);
  placeText(doc, data.doctorPhone, drPhPos.x, drPhPos.y, { fontSize: 8 });

  // x:0.96 y:0.1 fs:8 BOLD "DOB: 12/22/2022"
  const dobPos = drx(0.96, 0.1, 8);
  placeText(doc, `DOB: ${data.patientDOB}`, dobPos.x, dobPos.y, { fontSize: 8, bold: true });

  // x:0.86 y:0.1 fs:8 "123 UNKNOWN ADVE APT C" (patient address)
  const addrPos = drx(0.86, 0.1, 8);
  const addrFull = [data.patientAddressLine1, data.patientAddressLine2].filter(Boolean).join(" ");
  placeText(doc, addrFull, addrPos.x, addrPos.y, { fontSize: 8, upperCase: true });

  // x:0.76 y:0.1 fs:8 "LAKE CHARLES, LA, 12345" (patient city/state/zip)
  const cszPos = drx(0.76, 0.1, 8);
  const patCSZ = [data.patientCity, `${data.patientState}, ${data.patientZip}`].filter(Boolean).join(", ");
  placeText(doc, patCSZ, cszPos.x, cszPos.y, { fontSize: 8, upperCase: true });

  // x:0.66 y:0.1 fs:8 "(585) 285-4577" (patient phone)
  const phPos = drx(0.66, 0.1, 8);
  placeText(doc, data.patientPhone, phPos.x, phPos.y, { fontSize: 8 });

  // x:0.66 y:1.2 fs:8 "(585) 285-4577" (patient cell)
  const cellPos = drx(0.66, 1.2, 8);
  placeText(doc, data.patientCellPhone, cellPos.x, cellPos.y, { fontSize: 8 });

  // x:0.66 y:2.2 fs:8 BOLD "WELLCARE MEDICARE PART D" (insurance)
  const insPos = drx(0.66, 2.2, 8);
  placeText(doc, data.primaryInsurance, insPos.x, insPos.y, { fontSize: 8, bold: true, upperCase: true });

  // x:0.4 y:4.2 rot:-90 [BC128] "b154687:0" — VERTICAL barcode
  // DRX rotation=-90 → place VERTICALLY with save/translate/rotate(90)/image/restore
  try {
    const bcText = `b${data.fillId}:${data.labelVersion}`;
    const png = await generateBarcodePNG(bcText, 8);
    const bcPos = drx(0.4, 4.2, 0);
    doc.save();
    doc.translate(bcPos.x, bcPos.y);
    doc.rotate(90);
    doc.image(png, 0, 0, { height: 18, fit: [70, 18] });
    doc.restore();
  } catch {
    const bcPos = drx(0.4, 4.2, 6);
    placeText(doc, `[BC] b${data.fillId}:${data.labelVersion}`, bcPos.x, bcPos.y, { fontSize: 6 });
  }

  // x:0.35 y:0.1 fs:12 BOLD "DELIVERY"
  const delPos = drx(0.35, 0.1, 12);
  placeText(doc, data.patientDeliveryMethod, delPos.x, delPos.y, {
    fontSize: 12, bold: true, upperCase: true,
  });

  // x:0.3 y:3.0 fs:10 BOLD "Price: $12.01"
  const pricePos = drx(0.3, 3.0, 10);
  placeText(doc, `Price: $${data.copay}`, pricePos.x, pricePos.y, { fontSize: 10, bold: true });

  // x:0.2 y:0.1 fs:10 BOLD item name pw:4.3
  const itemPos = drx(0.2, 0.1, 10);
  placeText(doc, data.itemName, itemPos.x, itemPos.y, {
    fontSize: 10, bold: true, upperCase: true, maxWidth: 4.3 * 72,
  });

  // x:0.1 y:3.0 fs:8 BOLD "Qty: 120"
  const qtyPos = drx(0.1, 3.0, 8);
  placeText(doc, `Qty: ${data.dispensedQuantity}`, qtyPos.x, qtyPos.y, { fontSize: 8, bold: true });

  // x:0.1 y:3.6 fs:8 BOLD "Fill#: 1"
  const fillNPos = drx(0.1, 3.6, 8);
  placeText(doc, `Fill#: ${data.fillNumber}`, fillNPos.x, fillNPos.y, { fontSize: 8, bold: true });
}

// ---------------------------------------------------------------------------
// Section 3: AUX — Right of main label, y starts at 3.0
// ---------------------------------------------------------------------------

function drawAuxSection(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): void {
  const pw = 2 * 72; // print width 2" = 144pt

  // x:3.9 y:3.0 fs:10 aux_labels[0]
  if (data.auxLabels[0]) {
    const p = drx(3.9, 3.0, 10);
    placeText(doc, data.auxLabels[0], p.x, p.y, { fontSize: 10, maxWidth: pw, upperCase: true });
  }

  // x:3.5 y:3.0 fs:10 aux_labels[1]
  if (data.auxLabels[1]) {
    const p = drx(3.5, 3.0, 10);
    placeText(doc, data.auxLabels[1], p.x, p.y, { fontSize: 10, maxWidth: pw, upperCase: true });
  }

  // x:3.1 y:3.0 fs:10 aux_labels[2]
  if (data.auxLabels[2]) {
    const p = drx(3.1, 3.0, 10);
    placeText(doc, data.auxLabels[2], p.x, p.y, { fontSize: 10, maxWidth: pw, upperCase: true });
  }

  // x:2.7 y:3.0 fs:10 "This medication has been compounded..." pw:2
  const compNotice = drx(2.7, 3.0, 10);
  placeText(doc, "This medication has been compounded by this pharmacy", compNotice.x, compNotice.y, {
    fontSize: 10, maxWidth: pw,
  });

  // x:2.7 y:3.0 fs:6 aux_labels[3] (same DRX x but different fontSize — renders below the notice)
  if (data.auxLabels[3]) {
    const p = drx(2.7, 3.0, 6);
    placeText(doc, data.auxLabels[3], p.x, p.y, { fontSize: 6, maxWidth: pw });
  }

  // x:2.3 y:3.0 fs:6 "FormulaID: {{el}}"
  if (data.formulaId) {
    const p = drx(2.3, 3.0, 6);
    placeText(doc, `FormulaID: ${data.formulaId}`, p.x, p.y, { fontSize: 6 });
  }

  // x:2.2 y:3.0 fs:6 "Batch: {{el}}"
  if (data.batchId) {
    const p = drx(2.2, 3.0, 6);
    placeText(doc, `Batch: ${data.batchId}`, p.x, p.y, { fontSize: 6 });
  }

  // x:2.1 y:3.0 fs:6 "Use By: {{el}}"
  if (data.batchExpiration) {
    const p = drx(2.1, 3.0, 6);
    placeText(doc, `Use By: ${data.batchExpiration}`, p.x, p.y, { fontSize: 6 });
  }
}

// ---------------------------------------------------------------------------
// Section 4: Signature, Patient Notes, and Backtag
// ---------------------------------------------------------------------------

async function drawSignatureAndNotes(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): Promise<void> {
  // === Signature 1 (4 elements) — y starts at 4.6 ===

  // x:2.0 y:4.6 fs:8 BOLD patient name
  const s1Name = drx(2.0, 4.6, 8);
  placeText(doc, `${data.patientFirstName} ${data.patientLastName}`, s1Name.x, s1Name.y, {
    fontSize: 8, bold: true, upperCase: true,
  });

  // x:1.9 y:4.6 fs:7 "Home: (585) 454-7744"
  const s1Home = drx(1.9, 4.6, 7);
  placeText(doc, `Home: ${data.patientPhone}`, s1Home.x, s1Home.y, { fontSize: 7 });

  // x:1.9 y:5.8 fs:7 "Cell: (585) 454-7744"
  const s1Cell = drx(1.9, 5.8, 7);
  placeText(doc, `Cell: ${data.patientCellPhone}`, s1Cell.x, s1Cell.y, { fontSize: 7 });

  // x:1.7 y:5.8 fs:8 BOLD "BOH: 16"
  if (data.boh) {
    const bohPos = drx(1.7, 5.8, 8);
    placeText(doc, `BOH: ${data.boh}`, bohPos.x, bohPos.y, { fontSize: 8, bold: true });
  }

  // === Signature 2 (8 elements) — y starts at 4.6 ===

  // x:1.5 y:4.6 fs:8 BOLD patient name
  const s2Name = drx(1.5, 4.6, 8);
  placeText(doc, `${data.patientFirstName} ${data.patientLastName}`, s2Name.x, s2Name.y, {
    fontSize: 8, bold: true, upperCase: true,
  });

  // x:1.4 y:4.6 fs:7 "Home: (585) 454-7744"
  const s2Home = drx(1.4, 4.6, 7);
  placeText(doc, `Home: ${data.patientPhone}`, s2Home.x, s2Home.y, { fontSize: 7 });

  // x:1.4 y:5.8 fs:7 "Cell: (585) 454-7744"
  const s2Cell = drx(1.4, 5.8, 7);
  placeText(doc, `Cell: ${data.patientCellPhone}`, s2Cell.x, s2Cell.y, { fontSize: 7 });

  // x:1.4 y:7.1 fs:7 "Disp Qty: 120"
  const dispQty = drx(1.4, 7.1, 7);
  placeText(doc, `Disp Qty: ${data.dispensedQuantity}`, dispQty.x, dispQty.y, { fontSize: 7 });

  // x:1.3 y:7.0 fs:7 "Filled: 11/22/2022"
  const s2Fill = drx(1.3, 7.0, 7);
  placeText(doc, `Filled: ${data.fillDate}`, s2Fill.x, s2Fill.y, { fontSize: 7 });

  // x:1.2 y:7.0 fs:6 "NDC: 5555-4455-01"
  const s2Ndc = drx(1.2, 7.0, 6);
  placeText(doc, `NDC: ${data.ndc}`, s2Ndc.x, s2Ndc.y, { fontSize: 6 });

  // x:1.0 y:4.7 fs:6 "Signature: __________________________"
  const sigLine = drx(1.0, 4.7, 6);
  placeText(doc, "Signature: __________________________", sigLine.x, sigLine.y, { fontSize: 6 });

  // x:1.0 y:6.5 rot:90 [BC128] — VERTICAL barcode (signature fill ID)
  // DRX rotation=90 → place VERTICALLY with save/translate/rotate(-90)/image/restore
  try {
    const sigBcPng = await generateBarcodePNG(`b${data.fillId}:${data.fillNumber}`, 6);
    const sigBcPos = drx(1.0, 6.5, 0);
    doc.save();
    doc.translate(sigBcPos.x, sigBcPos.y);
    doc.rotate(-90);
    doc.image(sigBcPng, 0, 0, { height: 14, fit: [50, 14] });
    doc.restore();
  } catch {
    const sigBcPos = drx(1.0, 6.5, 6);
    placeText(doc, `[BC] ${data.fillId}:${data.fillNumber}`, sigBcPos.x, sigBcPos.y, { fontSize: 6 });
  }

  // === Patient Notes (7 elements) — y starts at 4.6 ===

  // x:3.8 y:4.6 fs:10 patient.comments pw:3.5
  if (data.patientComments) {
    const cmtPos = drx(3.8, 4.6, 10);
    placeText(doc, data.patientComments, cmtPos.x, cmtPos.y, {
      fontSize: 10, maxWidth: 3.5 * 72,
    });
  }

  // x:3.4 y:4.6 fs:10 prescription_fill_tags pw:3.5
  if (data.fillTags.length > 0) {
    const tagPos = drx(3.4, 4.6, 10);
    placeText(doc, data.fillTags.join(", "), tagPos.x, tagPos.y, {
      fontSize: 10, maxWidth: 3.5 * 72,
    });
  }

  // x:2.95 y:4.6 fs:7 "Promised: 01/01/2025 1:00 PM" pw:3.5
  if (data.pickupTime) {
    const promPos = drx(2.95, 4.6, 7);
    placeText(doc, `Promised: ${data.pickupTime}`, promPos.x, promPos.y, {
      fontSize: 7, maxWidth: 3.5 * 72,
    });
  }

  // x:2.6 y:7.0 fs:8 "i:71662" (text label for item barcode)
  if (data.itemId) {
    const itemTxtPos = drx(2.6, 7.0, 8);
    placeText(doc, `i:${data.itemId}`, itemTxtPos.x, itemTxtPos.y, { fontSize: 8 });
  }

  // x:2.4 y:6.5 rot:90 [BC128] "i:71662" — VERTICAL barcode
  // DRX rotation=90 → save/translate/rotate(-90)/image/restore
  if (data.itemId) {
    try {
      const itemBcPng = await generateBarcodePNG(`i:${data.itemId}`, 6);
      const itemBcPos = drx(2.4, 6.5, 0);
      doc.save();
      doc.translate(itemBcPos.x, itemBcPos.y);
      doc.rotate(-90);
      doc.image(itemBcPng, 0, 0, { height: 14, fit: [50, 14] });
      doc.restore();
    } catch {
      const itemBcPos = drx(2.4, 6.5, 6);
      placeText(doc, `i:${data.itemId}`, itemBcPos.x, itemBcPos.y, { fontSize: 6 });
    }
  }

  // Watermark elements (x:2.3 y:5.0 rot:-70 and x:1.0 y:4.4 rot:-70) are
  // drawn by drawWatermarks, not here.

  // === Backtag (20 elements) — sequential rows instead of DRX coordinates ===
  // DRX stacks these at 0.1" vertical intervals which is only 7.2pt — not enough
  // for readable text at 72 DPI. Use sequential Y positioning with 9pt line height.

  const btX = 4.6 * 72; // DRX y=4.6 → landscape X
  const btX2 = 5.9 * 72; // second column at DRX y=5.9
  const btX3 = 7.2 * 72; // third column at DRX y=7.2
  let btY = 148; // Start below signature section

  // Row 1: RX# | DOB
  placeText(doc, `RX ${data.rxNumber}`, btX, btY, { fontSize: 5, bold: true });
  placeText(doc, `DOB: ${data.patientDOB}`, btX + 55, btY, { fontSize: 5, bold: true });
  placeText(doc, `Filled ${data.fillDate}`, btX3, btY, { fontSize: 5, bold: true });
  btY += 8;

  // Row 2: Patient name | QTY
  placeText(doc, `${data.patientFirstName} ${data.patientLastName}`, btX, btY, { fontSize: 6, bold: true, upperCase: true });
  placeText(doc, `QTY: ${data.dispensedQuantity}`, btX3, btY, { fontSize: 5, bold: true });
  btY += 8;

  // Row 3: Doctor name | Comp/Partial
  placeText(doc, `${data.doctorFirstName} ${data.doctorLastName}`, btX, btY, { fontSize: 6, bold: true, upperCase: true });
  if (data.completionQuantity || data.partialQuantity) {
    placeText(doc, data.completionQuantity ? `Comp` : `Part`, btX3, btY, { fontSize: 5, bold: true });
  }
  btY += 8;

  // Row 4: Patient address | Doctor address
  const btAddrFull = [data.patientAddressLine1, data.patientAddressLine2].filter(Boolean).join(" ");
  placeText(doc, btAddrFull, btX, btY, { fontSize: 5, upperCase: true });
  const drAddrFull = [data.doctorAddressLine1, data.doctorCity, `${data.doctorState} ${data.doctorZip}`].filter(Boolean).join(", ");
  placeText(doc, drAddrFull, btX + 120, btY, { fontSize: 5, maxWidth: 180 });
  btY += 8;

  // Row 5: City/State/Zip | DEA | NPI
  const btPatCSZ = [data.patientCity, `${data.patientState}, ${data.patientZip}`].filter(Boolean).join(", ");
  placeText(doc, btPatCSZ, btX, btY, { fontSize: 5, upperCase: true });
  placeText(doc, `DEA: ${data.doctorDEA}`, btX + 100, btY, { fontSize: 5 });
  placeText(doc, `NPI: ${data.doctorNPI}`, btX + 160, btY, { fontSize: 5 });
  btY += 8;

  // Row 6: Drug name (full)
  placeText(doc, data.itemName, btX, btY, { fontSize: 5, maxWidth: 250, upperCase: true });
  btY += 12;

  // Row 7: SIG
  placeText(doc, data.sig, btX, btY, { fontSize: 5, maxWidth: 200 });
  btY += 12;

  // Row 8: NDC | QTY | INS
  placeText(doc, `NDC: ${data.ndc}`, btX, btY, { fontSize: 5 });
  placeText(doc, `QTY: ${data.dispensedQuantity}`, btX + 80, btY, { fontSize: 5 });
  placeText(doc, `INS: $${data.copay}`, btX + 130, btY, { fontSize: 5 });
  placeText(doc, `Filled: ${data.fillDate}`, btX + 180, btY, { fontSize: 5 });
  btY += 8;

  // Row 9: Refills
  placeText(doc, `${data.refillsLeft} Refill(s) left until ${data.rxExpires}`, btX, btY, { fontSize: 5 });
}

// ---------------------------------------------------------------------------
// Watermarks (overlaid with opacity)
// DRX rotation=-70 → rotate(20) in landscape (90 + (-70) = 20)
// ---------------------------------------------------------------------------

function drawWatermarks(
  doc: InstanceType<typeof PDFDocument>,
  data: CompoundLabelData
): void {
  // x:2.3 y:5.0 rot:-70 fs:40 BOLD "HOLD"
  if (data.holdWarning) {
    const pos = drx(2.3, 5.0, 0);
    doc.save();
    doc.fillOpacity(0.5);
    doc.font("Helvetica-Bold").fontSize(40);
    doc.translate(pos.x, pos.y);
    doc.rotate(20);
    doc.text("HOLD", 0, 0, { lineBreak: false });
    doc.restore();
  }

  // x:1.0 y:4.4 rot:-70 fs:30 BOLD "NO PAID CLAIM"
  if (data.noClaimWarning) {
    const pos = drx(1.0, 4.4, 0);
    doc.save();
    doc.fillOpacity(0.5);
    doc.font("Helvetica-Bold").fontSize(30);
    doc.translate(pos.x, pos.y);
    doc.rotate(20);
    doc.text("NO PAID CLAIM", 0, 0, { lineBreak: false });
    doc.restore();
  }
}

// ---------------------------------------------------------------------------
// Separator lines (kept as-is — use legacy section boundaries for lines)
// ---------------------------------------------------------------------------
const SEP_SEC1_LEFT = 4;
const SEP_SEC1_RIGHT = 230;
const SEP_SEC2_TOP = 178;
const SEP_SEC3_LEFT = 238;
const SEP_SEC3_RIGHT = 572;
const SEP_SEC4_TOP = 144;

function drawSeparators(doc: InstanceType<typeof PDFDocument>): void {
  doc.save();
  doc.lineWidth(0.5).strokeColor("#999999");

  // Horizontal line between Section 1 (main label) and Section 2 (bottom label)
  doc.moveTo(SEP_SEC1_LEFT, SEP_SEC2_TOP - 2).lineTo(SEP_SEC1_RIGHT, SEP_SEC2_TOP - 2).stroke();

  // Vertical line between left and right panels
  const vx = SEP_SEC3_LEFT - 4;
  doc.moveTo(vx, 0).lineTo(vx, PDF_H).stroke();

  // Horizontal line in right panel between Section 3 and Section 4
  doc.moveTo(SEP_SEC3_LEFT, SEP_SEC4_TOP).lineTo(SEP_SEC3_RIGHT, SEP_SEC4_TOP).stroke();

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
