import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";

/**
 * Generic DRX template PDF renderer.
 *
 * Reads a stored DRX template (as imported by /api/settings/print-templates/import-drx)
 * and renders it to a PDF buffer, substituting variable values where provided.
 */

// ─── Template types (matches import-drx schema) ───────────────────

export interface DRXLabelGroup {
  id: number;
  name: string;
  xOffset: number;
  yOffset: number;
}

export interface DRXElement {
  id: number;
  elementData: string;       // variable key e.g. "patient.first_name"
  exampleText: string | null;
  fontName: string | null;
  fontSize: number | null;
  fontStyle: string | null;   // "bold", "italic", "bold_italic", null
  textAlign: string | null;   // "left", "center", "right"
  xPosition: number;          // in page units (inches)
  yPosition: number;
  width: number | null;
  height: number | null;
  color: string | null;
  fillColor: string | null;
  textColor: string | null;
  rotationAngle: number | null;
  paragraphWidth: number | null;
  maxTextLength: number | null;
  forceUpperCase: boolean | null;
  forceLowerCase: boolean | null;
  displayBarcodeCode128: boolean | null;
  displayBarcodeQr: boolean | null;
  displayBase64Jpeg: boolean | null;
  base64Image: string | null;
  renderAsTable: boolean | null;
  columns: number | null;
  maxPerColumn: number | null;
  maxPerPage: number | null;
  page: number | null;
  sliceStart: number | null;
  sliceEnd: number | null;
  repeatingElement: boolean | null;
  repeatingSpacer: number | null;
  horizontalRepeatingSpacer: number | null;
  footer: boolean | null;
  rightMargin: number | null;
  joinMultipleWith: string | null;
  formatting: string | null;
  cellPadding: number | null;
  truthyOverride: string | null;
  falseyOverride: string | null;
  customFontDataBase64: string | null;
  template: string | null;
  ifElementData: string | null;
  ifXOffset: number | null;
  ifYOffset: number | null;
  ifDisplay: string | null;
  ifElementData2: string | null;
  ifXOffset2: number | null;
  ifYOffset2: number | null;
  ifDisplay2: string | null;
  subLabelTemplateId: number | null;
  labelGroupId: number | null;
  labelGroup: DRXLabelGroup | null;
  subLabelTemplate: { id: number; name: string } | null;
}

export interface DRXTemplate {
  id: number;
  drxId: number;
  name: string;
  type: string;
  size: string;
  pageWidth: number;    // inches
  pageHeight: number;   // inches
  pageUnits: string;
  leftMargin: number;
  topMargin: number;
  downloadNoPreview: boolean;
  chainTemplateId: number | null;
  chainConditionData: string | null;
  source: string;
  elements: DRXElement[];
}

// Points per inch
const IN = 72;

// Known watermark/overlay element keys that should only display with real data.
// These are large-font elements (30-40pt) that overlay the entire label in DRX
// (e.g. "NO PAID CLAIM", "HOLD") and should be suppressed in preview mode.
const WATERMARK_KEYS = new Set([
  "no_paid_claim_warning",
  "hold_warning",
]);

// ─── Helpers ───────────────────────────────────────────────────────

function parseColor(color: string | null): string {
  if (!color) return "#000000";
  if (color.startsWith("#")) return color;
  if (color.startsWith("rgb")) {
    const m = color.match(/\d+/g);
    if (m && m.length >= 3) {
      return `#${parseInt(m[0]).toString(16).padStart(2, "0")}${parseInt(m[1]).toString(16).padStart(2, "0")}${parseInt(m[2]).toString(16).padStart(2, "0")}`;
    }
  }
  return "#000000";
}

function getPDFFont(fontName: string | null, fontStyle: string | null): string {
  const base = fontName?.toLowerCase() || "helvetica";
  const style = fontStyle?.toLowerCase() || "";

  // Map common font names to PDFKit built-ins
  let family = "Helvetica";
  if (base.includes("courier") || base.includes("mono")) family = "Courier";
  else if (base.includes("times") || base.includes("serif")) family = "Times-Roman";

  if (style.includes("bold") && style.includes("italic")) {
    if (family === "Helvetica") return "Helvetica-BoldOblique";
    if (family === "Courier") return "Courier-BoldOblique";
    return "Times-BoldItalic";
  }
  if (style.includes("bold")) {
    if (family === "Helvetica") return "Helvetica-Bold";
    if (family === "Courier") return "Courier-Bold";
    return "Times-Bold";
  }
  if (style.includes("italic")) {
    if (family === "Helvetica") return "Helvetica-Oblique";
    if (family === "Courier") return "Courier-Oblique";
    return "Times-Italic";
  }
  return family;
}

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
    return Buffer.alloc(0);
  }
}

// ─── Variable resolution ───────────────────────────────────────────

function resolveValue(
  element: DRXElement,
  data: Record<string, string>
): string {
  const key = element.elementData;
  if (!key) return element.exampleText || "";

  // Check direct key match
  let val = data[key];

  // Also try dotted path variations: "patient.first_name" -> "patientFirstName"
  if (val === undefined) {
    const camelKey = key.replace(/[._]([a-z])/g, (_, c) => c.toUpperCase());
    val = data[camelKey];
  }

  // Fall back to example text.
  // For known watermark overlay elements, skip the fallback so they only
  // appear when real data explicitly provides a value.
  if (val === undefined || val === null) {
    const isWatermark = WATERMARK_KEYS.has(key);
    if (isWatermark) {
      val = "";
    } else {
      val = element.exampleText || "";
    }
  }

  // Apply text transforms
  if (element.forceUpperCase && val) val = val.toUpperCase();
  if (element.forceLowerCase && val) val = val.toLowerCase();
  if (element.maxTextLength && val && val.length > element.maxTextLength) {
    val = val.substring(0, element.maxTextLength);
  }

  // Truthy/falsey overrides (for boolean-like values)
  if (element.truthyOverride && val && val !== "0" && val.toLowerCase() !== "false") {
    val = element.truthyOverride;
  }
  if (element.falseyOverride && (!val || val === "0" || val.toLowerCase() === "false")) {
    val = element.falseyOverride;
  }

  return val;
}

function shouldDisplay(
  element: DRXElement,
  data: Record<string, string>
): boolean {
  // Check conditional display (ifElementData / ifDisplay)
  if (element.ifElementData && element.ifDisplay) {
    const condVal = data[element.ifElementData] || data[element.ifElementData.replace(/[._]([a-z])/g, (_, c) => c.toUpperCase())] || "";
    if (element.ifDisplay === "truthy" && !condVal) return false;
    if (element.ifDisplay === "falsey" && condVal) return false;
    if (element.ifDisplay !== "truthy" && element.ifDisplay !== "falsey" && condVal !== element.ifDisplay) return false;
  }
  if (element.ifElementData2 && element.ifDisplay2) {
    const condVal2 = data[element.ifElementData2] || data[element.ifElementData2.replace(/[._]([a-z])/g, (_, c) => c.toUpperCase())] || "";
    if (element.ifDisplay2 === "truthy" && !condVal2) return false;
    if (element.ifDisplay2 === "falsey" && condVal2) return false;
    if (element.ifDisplay2 !== "truthy" && element.ifDisplay2 !== "falsey" && condVal2 !== element.ifDisplay2) return false;
  }
  return true;
}

// ─── Element rendering ─────────────────────────────────────────────

async function renderElement(
  doc: InstanceType<typeof PDFDocument>,
  element: DRXElement,
  data: Record<string, string>,
  groupOffsetX: number,
  groupOffsetY: number,
  rotationAdjust: number = 0
): Promise<void> {
  if (!shouldDisplay(element, data)) return;

  const value = resolveValue(element, data);
  if (!value && !element.displayBase64Jpeg && !element.base64Image) return;

  const xIn = element.xPosition + groupOffsetX;
  const yIn = element.yPosition + groupOffsetY;
  const rotation = (element.rotationAngle || 0) + rotationAdjust;

  // ── Barcode Code128 ──
  if (element.displayBarcodeCode128 && value) {
    try {
      // DRX stores barcode height as a scale factor (e.g. 6), NOT inches.
      // Values > 1 are clearly not inches — use a sensible default.
      const barcodeHeightIn = (element.height && element.height > 1)
        ? 0.4
        : (element.height || 0.4);
      const heightPt = barcodeHeightIn * IN;
      const widthPt = (element.width ? element.width * IN : heightPt * 4);
      const png = await generateBarcodePNG(value, Math.round(barcodeHeightIn * 25.4));

      doc.save();
      doc.translate(xIn * IN, yIn * IN);
      if (rotation) doc.rotate(rotation);
      doc.image(png, 0, 0, { fit: [widthPt, heightPt] });
      doc.restore();
    } catch {
      // Fallback: render as text
      renderTextElement(doc, `[BC] ${value}`, xIn, yIn, element, rotation);
    }
    return;
  }

  // ── QR Code ──
  if (element.displayBarcodeQr && value) {
    try {
      const qrW = element.width && element.width <= 2 ? element.width : 0.75;
      const qrH = element.height && element.height <= 2 ? element.height : 0.75;
      const sizePt = Math.min(qrW * IN, qrH * IN);
      const png = await generateQRPNG(value, Math.round(sizePt));

      if (png.length > 0) {
        doc.save();
        doc.translate(xIn * IN, yIn * IN);
        if (rotation) doc.rotate(rotation);
        doc.image(png, 0, 0, { width: sizePt, height: sizePt });
        doc.restore();
      }
    } catch {
      renderTextElement(doc, "[QR]", xIn, yIn, element, rotation);
    }
    return;
  }

  // ── Base64 Image ──
  if (element.displayBase64Jpeg && element.base64Image) {
    try {
      const imgBuffer = Buffer.from(element.base64Image, "base64");
      const widthPt = (element.width || 1) * IN;
      const heightPt = (element.height || 1) * IN;

      doc.save();
      doc.translate(xIn * IN, yIn * IN);
      if (rotation) doc.rotate(rotation);
      doc.image(imgBuffer, 0, 0, { width: widthPt, height: heightPt });
      doc.restore();
    } catch {
      // Skip image on error
    }
    return;
  }

  // ── Auto-detect QR code for URL-like elements with square dimensions ──
  // DRX auto-generates QR codes for elements like patient_education_url
  // that have square width/height even without the displayBarcodeQr flag.
  if (
    value &&
    element.width && element.height &&
    Math.abs(element.width - element.height) < 0.1 &&
    element.width >= 0.5 &&
    (element.elementData?.toLowerCase().includes("url") ||
     element.elementData?.toLowerCase().includes("qr") ||
     value.startsWith("http"))
  ) {
    try {
      const sizePt = Math.min(element.width * IN, element.height * IN);
      const png = await generateQRPNG(value, Math.round(sizePt));

      if (png.length > 0) {
        doc.save();
        doc.translate(xIn * IN, yIn * IN);
        if (rotation) doc.rotate(rotation);
        doc.image(png, 0, 0, { width: sizePt, height: sizePt });
        doc.restore();
      }
    } catch {
      renderTextElement(doc, value, xIn, yIn, element, rotation);
    }
    return;
  }

  // ── Text element (default) ──
  renderTextElement(doc, value, xIn, yIn, element, rotation);
}

function renderTextElement(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  xIn: number,
  yIn: number,
  element: DRXElement,
  rotation: number
): void {
  if (!text) return;

  const fontSize = element.fontSize || 8;
  const fontName = getPDFFont(element.fontName, element.fontStyle);
  const textColor = parseColor(element.textColor || element.color);

  doc.save();
  doc.font(fontName).fontSize(fontSize);
  doc.fillColor(textColor);

  doc.translate(xIn * IN, yIn * IN);
  if (rotation) doc.rotate(rotation);

  const textOptions: PDFKit.Mixins.TextOptions = {};

  if (element.paragraphWidth) {
    textOptions.width = element.paragraphWidth * IN;
    textOptions.lineGap = 1;
  }

  if (element.textAlign) {
    textOptions.align = element.textAlign as "left" | "center" | "right";
    if (!textOptions.width && element.width) {
      textOptions.width = element.width * IN;
    }
  }

  doc.text(text, 0, 0, textOptions);
  doc.restore();
}

// ─── Main renderer ─────────────────────────────────────────────────

/**
 * Detect if a template needs landscape transform.
 * Portrait templates where most elements are rotated -90° should be
 * rendered in landscape for readability.
 */
function needsLandscapeTransform(template: DRXTemplate): boolean {
  if (template.pageHeight <= template.pageWidth) return false;

  const rotatedCount = template.elements.filter(
    (el) => el.rotationAngle && Math.abs(el.rotationAngle + 90) < 1
  ).length;
  const total = template.elements.length;

  // If more than half the elements are -90°, use landscape
  return total > 0 && rotatedCount / total > 0.5;
}

/**
 * Render a DRX template to a PDFKit document.
 *
 * For portrait templates where most elements are rotated -90° (like 4×8 pharmacy
 * labels), we render on a landscape page by manually converting each element's
 * portrait coordinates to landscape. This avoids matrix transform composition
 * issues that cause incorrect text rotation.
 *
 * Portrait→Landscape conversion (90° CCW page rotation):
 *   landscape_x = portrait_y
 *   landscape_y = pageWidth - portrait_x
 *   landscape_rotation = portrait_rotation + 90°
 */
export async function renderDRXTemplate(
  doc: InstanceType<typeof PDFDocument>,
  template: DRXTemplate,
  data: Record<string, string>
): Promise<void> {
  const useLandscape = needsLandscapeTransform(template);

  // Group elements by labelGroupId for offset application
  const groupMap = new Map<number, DRXLabelGroup>();
  for (const el of template.elements) {
    if (el.labelGroup && el.labelGroupId) {
      groupMap.set(el.labelGroupId, el.labelGroup);
    }
  }

  // Render elements in order
  for (const element of template.elements) {
    // Skip sub-template references (handled separately if needed)
    if (element.subLabelTemplateId) continue;

    const group = element.labelGroupId ? groupMap.get(element.labelGroupId) : null;
    const gx = group?.xOffset || 0;
    const gy = group?.yOffset || 0;

    try {
      if (useLandscape) {
        // Manually convert portrait coordinates to landscape.
        // No global matrix transform — avoids rotation composition issues.
        //
        // Portrait (4×8) → Landscape (8×4) via 90° CCW page rotation:
        //   landscape_x = portrait_y
        //   landscape_y = pageWidth - portrait_x
        //   rotation += 90°            (-90° portrait text → 0° horizontal)
        //
        // This maps DRX portrait layout correctly:
        //   MAIN LABEL (large portrait x ~2-3.5) → small landscape y → TOP
        //   BOTTOM LABEL (small portrait x ~0-1.3) → large landscape y → BOTTOM
        //   Backtag elements (large portrait y ~4.6-7.2) → right side of landscape
        const portraitX = element.xPosition + gx;
        const portraitY = element.yPosition + gy;
        const adjusted: DRXElement = {
          ...element,
          xPosition: portraitY,
          yPosition: template.pageWidth - portraitX,
          rotationAngle: (element.rotationAngle || 0) + 90,
        };
        await renderElement(doc, adjusted, data, 0, 0);
      } else {
        await renderElement(doc, element, data, gx, gy);
      }
    } catch (err) {
      console.error(`Error rendering element ${element.id} (${element.elementData}):`, err);
    }
  }
}

/**
 * Generate a PDF buffer from a DRX template and variable data.
 */
export async function generateTemplatePreviewPDF(
  template: DRXTemplate,
  data: Record<string, string>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const useLandscape = needsLandscapeTransform(template);

    // Create page in landscape if needed
    const pageWidth = useLandscape ? template.pageHeight * IN : template.pageWidth * IN;
    const pageHeight = useLandscape ? template.pageWidth * IN : template.pageHeight * IN;

    const doc = new PDFDocument({
      size: [pageWidth, pageHeight],
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

    renderDRXTemplate(doc, template, data)
      .then(() => {
        // Draw a thin black border around the label (matches DRX output)
        doc.save();
        doc.lineWidth(0.5);
        doc.strokeColor("#000000");
        doc.rect(0, 0, pageWidth, pageHeight).stroke();
        doc.restore();
        doc.end();
      })
      .catch(reject);
  });
}

// ─── Variable extraction ───────────────────────────────────────────

/**
 * Extract all unique variable names (elementData fields) from a template,
 * grouped by label group or auto-detected category.
 */
export interface TemplateVariable {
  key: string;           // elementData value
  label: string;         // human-readable label
  exampleText: string;   // sample value for preview
  category: string;      // grouping category
  isBarcode: boolean;
  isQR: boolean;
  fontSize: number;      // font size (for filtering overlays)
}

const CATEGORY_MAP: Record<string, string> = {
  "patient": "Patient",
  "prescription": "Prescription",
  "fill": "Prescription",
  "rx": "Prescription",
  "item": "Drug / Item",
  "drug": "Drug / Item",
  "doctor": "Prescriber",
  "prescriber": "Prescriber",
  "pharmacy": "Pharmacy",
  "pharmacist": "Pharmacist",
  "store": "Pharmacy",
  "insurance": "Insurance",
  "billing": "Billing",
  "copay": "Billing",
  "price": "Billing",
  "batch": "Compounding",
  "compound": "Compounding",
  "formula": "Compounding",
  "bud": "Compounding",
  "aux": "Labels & Warnings",
  "warning": "Labels & Warnings",
  "tag": "Labels & Warnings",
  "label": "Labels & Warnings",
  "barcode": "Barcodes",
  "qr": "Barcodes",
  "ndc": "Drug / Item",
  "sig": "Prescription",
  "directions": "Prescription",
  "settings": "Settings",
  "toll": "Settings",
};

function categorizeKey(key: string): string {
  const lower = key.toLowerCase();
  for (const [prefix, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.startsWith(prefix) || lower.includes(`.${prefix}`) || lower.includes(`_${prefix}`)) {
      return category;
    }
  }
  return "Other";
}

function humanizeKey(key: string): string {
  return key
    .replace(/[._]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function extractTemplateVariables(template: DRXTemplate): TemplateVariable[] {
  const seen = new Map<string, TemplateVariable>();

  for (const el of template.elements) {
    if (!el.elementData) continue;
    if (seen.has(el.elementData)) continue;

    // Try to use label group name for category, or auto-detect
    const groupName = el.labelGroup?.name;
    const category = groupName || categorizeKey(el.elementData);

    seen.set(el.elementData, {
      key: el.elementData,
      label: humanizeKey(el.elementData),
      exampleText: el.exampleText || "",
      category,
      isBarcode: !!el.displayBarcodeCode128,
      isQR: !!el.displayBarcodeQr,
      fontSize: el.fontSize || 8,
    });
  }

  // Sort by category then key
  return Array.from(seen.values()).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.key.localeCompare(b.key);
  });
}

/**
 * Build a default data object for preview mode.
 *
 * Returns an EMPTY object so that each element falls back to its own
 * `exampleText` in resolveValue(). This is important because:
 *   - Repeating elements (aux_labels) have different exampleTexts per slot
 *   - Different label sections may show different example patient names
 *   - Watermark elements are suppressed via WATERMARK_KEYS in resolveValue()
 *
 * For real prescription data, the caller builds the data object directly
 * from database fields (see fill-data-mapper.ts).
 */
export function buildDefaultData(_variables: TemplateVariable[]): Record<string, string> {
  return {};
}
