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

// Elements that share the same position with another element and are mutually
// exclusive in practice (e.g. a fill is either partial OR complete, never both).
// In preview mode (no real data), suppress these to avoid visual overlap.
const PREVIEW_SUPPRESS_KEYS = new Set([
  "completion_quantity",       // overlaps partial_quantity at same position
  "partial_quantity",          // overlaps completion_quantity at same position
  "fill_date_plus_365_days",   // overlaps compound_batch.expiration_date
  "patient_education_url",     // QR code placeholder, renders as huge text without QR
  "compound_disclaimer",       // never auto-show — only when rx.isCompound = true
  "compound_batch.id",         // compound-only fields, suppressed for non-compounds
  "compound_batch.compound_formula_id",
  "compound_batch.expiration_date",
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
  let isRealData = val !== undefined;

  // Also try dotted path variations: "patient.first_name" -> "patientFirstName"
  if (val === undefined) {
    const camelKey = key.replace(/[._]([a-z])/g, (_, c) => c.toUpperCase());
    val = data[camelKey];
    if (val !== undefined) isRealData = true;
  }

  // Fall back to example text.
  // For known watermark overlay elements and mutually-exclusive elements,
  // skip the fallback so they only appear when real data provides a value.
  if (val === undefined || val === null) {
    if (WATERMARK_KEYS.has(key) || PREVIEW_SUPPRESS_KEYS.has(key)) {
      val = "";
    } else {
      val = element.exampleText || "";
    }
  }

  // Apply slice for real data only.
  // For list elements (aux_labels), sliceStart/End are array indices — split by newline.
  // For string elements (item.print_name), sliceStart/End are character indices.
  // When using exampleText, skip slicing — the example already represents this element's slot.
  if (isRealData && val && (element.sliceStart != null || element.sliceEnd != null)) {
    const start = element.sliceStart ?? 0;
    const end = element.sliceEnd ?? undefined;

    // If the value contains newlines, treat slicing as array indices
    if (val.includes("\n")) {
      const items = val.split("\n");
      val = items.slice(start, end).join("\n").trim();
    } else {
      // Character slicing (e.g. long drug name split across lines)
      val = val.slice(start, end ?? val.length).trim();
    }
  }

  // Apply template string (e.g. "Use By: {{el}}", or static "Signature: ____")
  if (element.template) {
    if (element.template.includes("{{el}}")) {
      val = val ? element.template.replace(/\{\{el\}\}/gi, val) : "";
    } else if (isRealData && val === "") {
      // Element has both an elementData key and a static template. The data
      // pipeline explicitly resolved this slot to empty (e.g. compound_disclaimer
      // when isCompound = false). Honor that intent — don't fall back to the
      // template's static text. This matters for conditional fields whose
      // template carries the human-readable copy ("This medication has been
      // compounded by this pharmacy") that must NOT appear on regular fills.
      val = "";
    } else {
      // Static template text (no placeholder) — always show it
      val = element.template;
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

/**
 * Render a single element.
 *
 * When `landscape` info is provided the DRX portrait coordinates are
 * converted to landscape on-the-fly:
 *   landscape_x  = portrait_y   (DRX y-up → landscape left-to-right)
 *   landscape_y  = pageWidth − portrait_x  (DRX x-right → landscape top-to-bottom, inverted)
 *   rotation     = 0  (text is rendered horizontal; the -90° is absorbed by the conversion)
 */
interface LandscapeCtx {
  pageWidthIn: number;  // portrait page width in inches (e.g. 4)
}

/**
 * Layout override for a single element — positions in points (post-transform).
 * Used when the user has repositioned/resized elements in the interactive editor.
 */
export interface LayoutOverride {
  id: string;           // element id (matches `el-{drxElementId}`)
  x: number;            // x position in points
  y: number;            // y position in points
  fontSize?: number;    // font size in points (already FONT_SCALE'd)
  bold?: boolean;
  maxWidth?: number;    // in points
  rotation?: number;
  barcodeWidth?: number;
  barcodeHeight?: number;
}

async function renderElement(
  doc: InstanceType<typeof PDFDocument>,
  element: DRXElement,
  data: Record<string, string>,
  groupOffsetX: number,
  groupOffsetY: number,
  landscape?: LandscapeCtx,
  pageWidthIn?: number,
  pageHeightIn?: number,
  layoutOverride?: LayoutOverride
): Promise<void> {
  if (!shouldDisplay(element, data)) return;

  const value = resolveValue(element, data);
  if (!value && !element.displayBase64Jpeg && !element.base64Image) return;

  // If we have a layout override from the editor, use those positions directly
  // (they're already in points, post-transform)
  let xIn: number;
  let yIn: number;
  let rotation: number;

  if (layoutOverride) {
    xIn = layoutOverride.x / IN;
    yIn = layoutOverride.y / IN;
    rotation = layoutOverride.rotation ?? 0;
  } else if (landscape) {
    // Portrait coordinates (DRX native)
    const portraitX = element.xPosition + groupOffsetX;
    const portraitY = element.yPosition + groupOffsetY;
    // DRX uses y-up (PDF-native) coordinates on a portrait page.
    // Convert to landscape (8×4) with PDFKit y-down:
    //   landscape_x = portrait_y   (y increases upward → x increases rightward)
    //   landscape_y = pageWidth - portrait_x  (x increases right in portrait → y increases downward in landscape, inverted)
    xIn = portraitY;
    yIn = landscape.pageWidthIn - portraitX;
    // 4-tier vertical compression with continuous boundaries:
    // Tier 1 (y < 0.5"): sparse aux labels — compress 40% to close top gap
    // Tier 2 (0.5" - 2.0"): dense content — 5% compression
    // Tier 3a (2.0" - 2.7"): mid-bottom — gentle 10% expansion
    // Tier 3b (>= 2.7"): bottom-right cluster — stronger 18% expansion to
    //   clear the documented overlap among signature line, expiration,
    //   prescriber, and lot/BUD blocks. Final yIn is clamped to page
    //   height − 0.05" so elements never bleed off the bottom.
    if (yIn < 0.5) {
      yIn = yIn * 0.60;
    } else if (yIn < 2.0) {
      // At boundary y=0.5: tier1 gives 0.30, so offset = 0.5 - 0.30 = 0.20
      const t1Offset = 0.20;
      yIn = (yIn - t1Offset) * 0.95;
    } else if (yIn < 2.7) {
      // At boundary y=2.0: tier2 gives (2.0 - 0.20) * 0.95 = 1.71
      // Anchor tier3a at 1.71 and stretch by 10% to give bottom-mid
      // blocks (e.g. expiration row) clear separation from tier 2.
      yIn = 1.71 + (yIn - 2.0) * 1.10;
    } else {
      // At boundary y=2.7: tier3a gives 1.71 + 0.7 * 1.10 = 2.48
      // Tier 3b takes over for the dense bottom-right cluster
      // (signature line, prescriber, lot/BUD). Stronger 18% spread.
      yIn = 2.48 + (yIn - 2.7) * 1.18;
    }
    // Safety clamp so no element drops off the page bottom edge.
    if (pageHeightIn && yIn > pageHeightIn - 0.05) {
      yIn = pageHeightIn - 0.05;
    }
    rotation = 0; // text rendered horizontal
  } else {
    const portraitX = element.xPosition + groupOffsetX;
    const portraitY = element.yPosition + groupOffsetY;
    xIn = portraitX;
    yIn = portraitY;
    rotation = element.rotationAngle || 0;
  }

  // fontSize override from layout editor (already scaled, use directly)
  const fontSizeOvr = layoutOverride?.fontSize || undefined;

  // ── Barcode Code128 ──
  if (element.displayBarcodeCode128 && value) {
    try {
      const barcodeHeightIn = (element.height && element.height > 1)
        ? 0.3
        : Math.min(element.height || 0.3, 0.4);
      const heightPt = barcodeHeightIn * IN;
      const widthPt = (element.width ? element.width * IN * 0.8 : heightPt * 3);
      const png = await generateBarcodePNG(value, Math.round(barcodeHeightIn * 25.4));

      doc.save();
      doc.translate(xIn * IN, yIn * IN);
      if (rotation) doc.rotate(rotation);
      doc.image(png, 0, 0, { fit: [widthPt, heightPt] });
      doc.restore();
    } catch {
      renderTextElement(doc, `[BC] ${value}`, xIn, yIn, element, rotation, pageWidthIn, pageHeightIn, fontSizeOvr);
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
      renderTextElement(doc, "[QR]", xIn, yIn, element, rotation, pageWidthIn, pageHeightIn, fontSizeOvr);
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

  // ── Auto-detect QR code ──
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
      renderTextElement(doc, value, xIn, yIn, element, rotation, pageWidthIn, pageHeightIn, fontSizeOvr);
    }
    return;
  }

  // ── Text element (default) ──
  renderTextElement(doc, value, xIn, yIn, element, rotation, pageWidthIn, pageHeightIn, fontSizeOvr);
}

// DRX font sizes are calibrated for a different rendering engine.
// PDFKit renders text slightly larger at the same nominal point size,
// causing overlap on tightly-packed labels. This factor scales them down
// so text fits within the intended bounding boxes.
const FONT_SCALE = 0.95;

function renderTextElement(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  xIn: number,
  yIn: number,
  element: DRXElement,
  rotation: number,
  pageWidthIn?: number,
  pageHeightIn?: number,
  fontSizeOverride?: number
): void {
  if (!text) return;

  const rawFontSize = element.fontSize || 8;
  const fontSize = fontSizeOverride || Math.max(4, Math.round(rawFontSize * FONT_SCALE * 10) / 10);
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
    textOptions.lineGap = 0.5;
  }

  if (element.textAlign) {
    textOptions.align = element.textAlign as "left" | "center" | "right";
    if (!textOptions.width && element.width) {
      textOptions.width = element.width * IN;
    }
  }

  // If the element has a defined width, use it as a max width.
  if (!textOptions.width && element.width) {
    textOptions.width = element.width * IN;
  }

  // For elements WITHOUT a defined width, compute available space from
  // the element position to the page edge to prevent horizontal overflow.
  if (!textOptions.width && pageWidthIn) {
    const availableIn = Math.max(0.5, pageWidthIn - xIn - 0.05);
    textOptions.width = availableIn * IN;
  }

  // Constrain height to prevent vertical overflow.
  // Many DRX templates have oversized height values (e.g., 20" on a 4" label)
  // which are effectively "no limit" — not actual bounding boxes.
  const maxReasonableHeightIn = pageHeightIn ? pageHeightIn * 0.5 : 2;
  const hasMultiLineIntent = !!element.paragraphWidth;

  // Compute remaining vertical space to the bottom of the page
  const remainingHeightPt = pageHeightIn
    ? Math.max(fontSize * 1.2, (pageHeightIn - yIn - 0.02) * IN)
    : fontSize * 4;

  if (element.height && element.height > 0.05 && element.height <= maxReasonableHeightIn) {
    // Reasonable height — use it as a bounding box, clamped to page bottom
    const heightPt = Math.min(element.height * IN, remainingHeightPt);
    textOptions.height = heightPt;
    textOptions.ellipsis = "…";
    if (heightPt < fontSize * 2.2) {
      textOptions.lineBreak = false;
    }
  } else if (hasMultiLineIntent) {
    // Element has paragraphWidth (designed for wrapping) but oversized/no height.
    // Allow up to 3 lines, clamped to page bottom.
    textOptions.height = Math.min(fontSize * 3.6, remainingHeightPt);
    textOptions.ellipsis = "…";
  } else {
    // No height, no paragraphWidth — constrain to single line
    textOptions.height = Math.min(fontSize * 1.4, remainingHeightPt);
    textOptions.lineBreak = false;
    textOptions.ellipsis = "…";
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
 * For portrait templates with -90° rotated text (like 4×8 pharmacy labels),
 * coordinates are converted from DRX's portrait/y-up system to a landscape
 * page with PDFKit's y-down system:
 *   landscape_x = portrait_y
 *   landscape_y = pageWidth − portrait_x
 * Text is rendered horizontally (rotation stripped).
 */
export async function renderDRXTemplate(
  doc: InstanceType<typeof PDFDocument>,
  template: DRXTemplate,
  data: Record<string, string>,
  useLandscape: boolean = false,
  layoutOverrides?: LayoutOverride[]
): Promise<void> {
  // Group elements by labelGroupId for offset application
  const groupMap = new Map<number, DRXLabelGroup>();
  for (const el of template.elements) {
    if (el.labelGroup && el.labelGroupId) {
      groupMap.set(el.labelGroupId, el.labelGroup);
    }
  }

  // Build lookup map for layout overrides by element ID
  const overrideMap = new Map<number, LayoutOverride>();
  if (layoutOverrides) {
    for (const ovr of layoutOverrides) {
      // IDs from the editor are "el-{drxElementId}"
      const match = ovr.id.match(/^el-(\d+)$/);
      if (match) {
        overrideMap.set(parseInt(match[1], 10), ovr);
      }
    }
  }

  const landscapeCtx: LandscapeCtx | undefined = useLandscape
    ? { pageWidthIn: template.pageWidth }
    : undefined;

  // Compute actual rendered page dimensions in inches for text bounding
  const renderedPageWidthIn = useLandscape ? template.pageHeight : template.pageWidth;
  const renderedPageHeightIn = useLandscape ? template.pageWidth : template.pageHeight;

  for (const element of template.elements) {
    // Skip sub-template references (handled separately if needed)
    if (element.subLabelTemplateId) continue;

    const group = element.labelGroupId ? groupMap.get(element.labelGroupId) : null;
    const gx = group?.xOffset || 0;
    const gy = group?.yOffset || 0;

    const override = overrideMap.get(element.id);

    try {
      await renderElement(doc, element, data, gx, gy, landscapeCtx, renderedPageWidthIn, renderedPageHeightIn, override);
    } catch (err) {
      console.error(`Error rendering element ${element.id} (${element.elementData}):`, err);
    }
  }

  // Render custom fields added by the user in the editor
  if (layoutOverrides) {
    for (const ovr of layoutOverrides) {
      if (!ovr.id.startsWith("custom-")) continue;
      const customOvr = ovr as LayoutOverride & { value?: string; label?: string; isBarcode?: boolean; isQrCode?: boolean; isCustom?: boolean; qrSize?: number };
      if (!customOvr.value && !customOvr.isBarcode && !customOvr.isQrCode) continue;

      const xIn = (customOvr.x || 0) / IN;
      const yIn = (customOvr.y || 0) / IN;
      const fontSize = customOvr.fontSize || 8;
      const value = customOvr.value || "";

      if (customOvr.isBarcode && value) {
        try {
          const heightPt = 22;
          const widthPt = customOvr.barcodeWidth || 65;
          const png = await generateBarcodePNG(value, Math.round(22 / 72 * 25.4));
          doc.save();
          doc.translate(xIn * IN, yIn * IN);
          doc.image(png, 0, 0, { fit: [widthPt, heightPt] });
          doc.restore();
        } catch {
          doc.save();
          doc.font("Helvetica").fontSize(fontSize);
          doc.text(`[BC] ${value}`, xIn * IN, yIn * IN);
          doc.restore();
        }
      } else if (customOvr.isQrCode && value) {
        try {
          const sizePt = customOvr.qrSize || 54;
          const png = await generateQRPNG(value, Math.round(sizePt));
          if (png.length > 0) {
            doc.save();
            doc.translate(xIn * IN, yIn * IN);
            doc.image(png, 0, 0, { width: sizePt, height: sizePt });
            doc.restore();
          }
        } catch {
          doc.save();
          doc.font("Helvetica").fontSize(fontSize);
          doc.text("[QR]", xIn * IN, yIn * IN);
          doc.restore();
        }
      } else if (value) {
        // Text field
        const fontName = customOvr.bold ? "Helvetica-Bold" : "Helvetica";
        doc.save();
        doc.font(fontName).fontSize(fontSize).fillColor("#000000");
        doc.translate(xIn * IN, yIn * IN);
        const textOpts: PDFKit.Mixins.TextOptions = {};
        if (customOvr.maxWidth) {
          textOpts.width = customOvr.maxWidth;
        } else {
          textOpts.width = Math.max(36, (renderedPageWidthIn - xIn - 0.05) * IN);
        }
        textOpts.height = fontSize * 3;
        textOpts.ellipsis = "…";
        doc.text(value, 0, 0, textOpts);
        doc.restore();
      }
    }
  }
}

/**
 * Generate a PDF buffer from a DRX template and variable data.
 *
 * For portrait templates with -90° rotated text (4×8 pharmacy labels),
 * the PDF page is created in LANDSCAPE (8×4) and DRX portrait coordinates
 * are converted on-the-fly:
 *   landscape_x = portrait_y
 *   landscape_y = pageWidth − portrait_x
 * Text is rendered horizontally (the -90° rotation is absorbed by the
 * coordinate conversion).
 */
export async function generateTemplatePreviewPDF(
  template: DRXTemplate,
  data: Record<string, string>,
  layoutOverrides?: LayoutOverride[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const useLandscape = needsLandscapeTransform(template);

    // For landscape templates, swap width/height to create a landscape page.
    // DRX portrait 4×8 → PDF landscape 8×4.
    const pageWidth = useLandscape
      ? template.pageHeight * IN   // 8" = 576pt
      : template.pageWidth * IN;
    const pageHeight = useLandscape
      ? template.pageWidth * IN    // 4" = 288pt
      : template.pageHeight * IN;

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

    renderDRXTemplate(doc, template, data, useLandscape, layoutOverrides)
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

// ─── Canvas element extraction ────────────────────────────────────

/**
 * Represents a single element positioned for the canvas editor,
 * with the same coordinate transforms applied as the PDF renderer.
 */
export interface CanvasElement {
  id: number;
  key: string;           // elementData
  label: string;
  value: string;         // resolved display value
  xPt: number;           // x position in points (72 per inch)
  yPt: number;           // y position in points
  fontSize: number;      // after FONT_SCALE
  bold: boolean;
  italic: boolean;
  maxWidthPt?: number;   // text width constraint in points
  maxHeightPt?: number;  // text height constraint in points
  isBarcode: boolean;
  isQR: boolean;
  isImage: boolean;
  rotation: number;
  widthIn?: number;      // raw element width in inches
  heightIn?: number;     // raw element height in inches
  hasParagraphWidth: boolean;
  barcodeWidthPt?: number;  // barcode render width in points (matching PDF)
  barcodeHeightPt?: number; // barcode render height in points (matching PDF)
  qrSizePt?: number;       // QR code size in points (matching PDF)
}

/**
 * Extract all elements from a DRX template with canvas-ready positions.
 * Applies the same landscape transform, vertical compression, font scaling,
 * and text bounding as the PDF renderer — so the canvas matches the PDF output.
 */
export function extractCanvasElements(
  template: DRXTemplate,
  data: Record<string, string>
): { elements: CanvasElement[]; canvasWidthPt: number; canvasHeightPt: number; isLandscape: boolean } {
  const useLandscape = needsLandscapeTransform(template);

  const renderedPageWidthIn = useLandscape ? template.pageHeight : template.pageWidth;
  const renderedPageHeightIn = useLandscape ? template.pageWidth : template.pageHeight;
  const canvasWidthPt = Math.round(renderedPageWidthIn * IN);
  const canvasHeightPt = Math.round(renderedPageHeightIn * IN);

  // Group elements by labelGroupId for offset application
  const groupMap = new Map<number, DRXLabelGroup>();
  for (const el of template.elements) {
    if (el.labelGroup && el.labelGroupId) {
      groupMap.set(el.labelGroupId, el.labelGroup);
    }
  }

  const result: CanvasElement[] = [];

  for (const element of template.elements) {
    if (element.subLabelTemplateId) continue;
    if (!shouldDisplay(element, data)) continue;

    const value = resolveValue(element, data);
    if (!value && !element.displayBase64Jpeg && !element.base64Image) continue;

    const group = element.labelGroupId ? groupMap.get(element.labelGroupId) : null;
    const gx = group?.xOffset || 0;
    const gy = group?.yOffset || 0;

    const portraitX = element.xPosition + gx;
    const portraitY = element.yPosition + gy;

    let xIn: number;
    let yIn: number;

    if (useLandscape) {
      xIn = portraitY;
      yIn = template.pageWidth - portraitX;
      // 4-tier vertical compression (must match PDF renderer above)
      if (yIn < 0.5) {
        yIn = yIn * 0.60;
      } else if (yIn < 2.0) {
        const t1Offset = 0.20;
        yIn = (yIn - t1Offset) * 0.95;
      } else if (yIn < 2.7) {
        // Tier 3a: gentle bottom-mid stretch
        yIn = 1.71 + (yIn - 2.0) * 1.10;
      } else {
        // Tier 3b: stronger stretch for the bottom-right cluster
        yIn = 2.48 + (yIn - 2.7) * 1.18;
      }
      // Clamp to page bottom (must match PDF renderer)
      if (renderedPageHeightIn && yIn > renderedPageHeightIn - 0.05) {
        yIn = renderedPageHeightIn - 0.05;
      }
    } else {
      xIn = portraitX;
      yIn = portraitY;
    }

    // Font scaling (same as PDF renderer)
    const rawFontSize = element.fontSize || 8;
    const fontSize = Math.max(4, Math.round(rawFontSize * FONT_SCALE * 10) / 10);

    const isBold = (element.fontStyle || "").toLowerCase().includes("bold");
    const isItalic = (element.fontStyle || "").toLowerCase().includes("italic");

    // Compute width constraint (same logic as renderTextElement)
    let maxWidthPt: number | undefined;
    if (element.paragraphWidth) {
      maxWidthPt = element.paragraphWidth * IN;
    } else if (element.textAlign && element.width) {
      maxWidthPt = element.width * IN;
    } else if (element.width) {
      maxWidthPt = element.width * IN;
    } else if (renderedPageWidthIn) {
      maxWidthPt = Math.max(0.5, renderedPageWidthIn - xIn - 0.05) * IN;
    }

    // Compute height constraint (same logic as renderTextElement)
    const maxReasonableHeightIn = renderedPageHeightIn * 0.5;
    const hasMultiLineIntent = !!element.paragraphWidth;
    const remainingHeightPt = Math.max(fontSize * 1.2, (renderedPageHeightIn - yIn - 0.02) * IN);

    let maxHeightPt: number | undefined;
    if (element.height && element.height > 0.05 && element.height <= maxReasonableHeightIn) {
      maxHeightPt = Math.min(element.height * IN, remainingHeightPt);
    } else if (hasMultiLineIntent) {
      maxHeightPt = Math.min(fontSize * 3.6, remainingHeightPt);
    } else {
      maxHeightPt = Math.min(fontSize * 1.4, remainingHeightPt);
    }

    // Compute barcode dimensions matching PDF renderer formula
    let barcodeWidthPt: number | undefined;
    let barcodeHeightPt: number | undefined;
    let qrSizePt: number | undefined;

    if (element.displayBarcodeCode128) {
      const barcodeHeightIn = (element.height && element.height > 1)
        ? 0.3
        : Math.min(element.height || 0.3, 0.4);
      barcodeHeightPt = barcodeHeightIn * IN;
      barcodeWidthPt = element.width ? element.width * IN * 0.8 : barcodeHeightPt * 3;
    }

    if (element.displayBarcodeQr) {
      const qrW = element.width && element.width <= 2 ? element.width : 0.75;
      const qrH = element.height && element.height <= 2 ? element.height : 0.75;
      qrSizePt = Math.min(qrW * IN, qrH * IN);
    }

    result.push({
      id: element.id,
      key: element.elementData || `element_${element.id}`,
      label: humanizeKey(element.elementData || `Element ${element.id}`),
      value,
      xPt: Math.round(xIn * IN * 10) / 10,
      yPt: Math.round(yIn * IN * 10) / 10,
      fontSize,
      bold: isBold,
      italic: isItalic,
      maxWidthPt,
      maxHeightPt,
      isBarcode: !!element.displayBarcodeCode128,
      isQR: !!element.displayBarcodeQr,
      isImage: !!(element.displayBase64Jpeg && element.base64Image),
      rotation: useLandscape ? 0 : (element.rotationAngle || 0),
      widthIn: element.width || undefined,
      heightIn: element.height || undefined,
      hasParagraphWidth: !!element.paragraphWidth,
      barcodeWidthPt,
      barcodeHeightPt,
      qrSizePt,
    });
  }

  return { elements: result, canvasWidthPt, canvasHeightPt, isLandscape: useLandscape };
}
