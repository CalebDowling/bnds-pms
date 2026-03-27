"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Printer,
  Download,
  RotateCcw,
  ChevronLeft,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  FileText,
  Save,
} from "lucide-react";
import Link from "next/link";
import InteractiveLabelCanvas, {
  PropertiesPanel,
  type LabelField,
  type SectionDef,
} from "@/components/labels/InteractiveLabelCanvas";

// ─── Types ─────────────────────────────────────────────────────────

interface TemplateVariable {
  key: string;
  label: string;
  exampleText: string;
  category: string;
  isBarcode: boolean;
  isQR: boolean;
  // Generic template element position data (inches)
  xPosition?: number;
  yPosition?: number;
  fontSize?: number;
  fontStyle?: string;
  maxWidth?: number;
}

interface FieldDef {
  key: string;
  label: string;
  small?: boolean;
  textarea?: boolean;
}

interface FieldGroup {
  title: string;
  fields: FieldDef[];
}

interface TemplateMeta {
  id: number;
  name: string;
  type: string;
  size: string;
  pageWidth: number;
  pageHeight: number;
  elementCount: number;
}

// ─── Rx Label field layout from drx-compound-label.ts ─────────────
// These map the hardcoded placeText() coordinates to LabelField objects.

const SEC1_LEFT = 4;
const SEC1_RIGHT = 230;
const SEC2_TOP = 178;
const SEC3_LEFT = 238;
const SEC3_RIGHT = 572;
const SEC4_TOP = 144;

const RX_LABEL_SECTIONS: SectionDef[] = [
  { label: "MAIN LABEL", x: 0, y: 0, w: 234, h: 176 },
  { label: "BOTTOM LABEL", x: 0, y: SEC2_TOP, w: 234, h: 288 - SEC2_TOP },
  { label: "AUX", x: SEC3_LEFT, y: 0, w: SEC3_RIGHT - SEC3_LEFT, h: SEC4_TOP },
  { label: "SIGNATURE / BACKTAG", x: SEC3_LEFT, y: SEC4_TOP, w: SEC3_RIGHT - SEC3_LEFT, h: 288 - SEC4_TOP },
];

function buildRxLabelFields(formData: Record<string, string>): LabelField[] {
  const x = SEC1_LEFT;
  const fields: LabelField[] = [];

  // Helper to get form value or fallback
  const v = (key: string, fallback = "") => formData[key] || fallback;

  // ── Section 1: MAIN LABEL ─────────────────────────────────────
  fields.push(
    { id: "ml-rxnum", label: "RX Number", value: `RX# ${v("rxNumber", "154687")}`, x, y: 8, fontSize: 8, bold: false },
    { id: "ml-doctor", label: "Doctor", value: `Doctor: ${v("doctorFirstName", "Charles")} ${v("doctorLastName", "Murphy")}`.toUpperCase(), x: x + 80, y: 8, fontSize: 5, bold: false },
    { id: "ml-qty", label: "Quantity", value: `Qty: ${v("dispensedQuantity", "120")} ${v("qtyType", "GM")}`.toUpperCase(), x: x + 175, y: 8, fontSize: 6, bold: false },
    { id: "ml-patient", label: "Patient Name", value: `${v("patientLastName", "GRAY")}, ${v("patientFirstName", "TAYLOR")}`.toUpperCase(), x, y: 22, fontSize: 10, bold: true },
    { id: "ml-drug", label: "Drug Name", value: v("itemPrintName", "Ketoprofen/Cyclobenz/Lidocaine Cream"), x, y: 36, fontSize: 10, bold: false, maxWidth: SEC1_RIGHT - x },
    { id: "ml-sig", label: "SIG (Directions)", value: v("sig", "Apply 1 gram topically to affected area twice daily for 30 days."), x, y: 64, fontSize: 9, bold: false, maxWidth: 216 },
    { id: "ml-tollfree", label: "Toll Free", value: v("tollFreeNumber", "Toll Free 1-855-305-2110"), x, y: 100, fontSize: 8, bold: false },
    { id: "ml-mfg", label: "Manufacturer", value: `MFG: ${v("manufacturer", "COMPOUNDED IN-HOUSE")}`.toUpperCase(), x, y: 112, fontSize: 7, bold: false },
    { id: "ml-rph", label: "Pharmacist / Comp / Partial", value: `RPH: ${(v("pharmacistFirstName", "Emily") || "E")[0]} ${v("pharmacistLastName", "Bychkov")}`.toUpperCase(), x, y: 124, fontSize: 6, bold: false },
    { id: "ml-barcode", label: "Main Barcode (fill ID)", value: `b${v("fillId", "154687")}:${v("labelVersion", "0")}`, x, y: 150, fontSize: 6, bold: false, isBarcode: true, rotation: 0, barcodeWidth: 20, barcodeHeight: 180 },
  );

  // Brand name (conditional)
  if (v("brandName")) {
    fields.push(
      { id: "ml-brand", label: "Generic For", value: `Generic For: ${v("brandName")}`, x, y: 50, fontSize: 10, bold: false }
    );
  }

  // Batch info
  const batchParts: string[] = [];
  if (v("formulaId")) batchParts.push(`Formula: ${v("formulaId")}`);
  if (v("batchId")) batchParts.push(`Batch: ${v("batchId")}`);
  if (v("batchExpiration")) batchParts.push(`Use By: ${v("batchExpiration")}`);
  if (batchParts.length > 0) {
    fields.push(
      { id: "ml-batch", label: "Batch Info", value: batchParts.join(" | "), x, y: 136, fontSize: 6, bold: false }
    );
  }

  // ── Section 2: BOTTOM LABEL ───────────────────────────────────
  const y0 = SEC2_TOP;
  fields.push(
    { id: "bl-rxnum", label: "Rx Number (Bottom)", value: `RX# ${v("rxNumber", "154687")}`, x, y: y0, fontSize: 11, bold: true },
    { id: "bl-filled", label: "Filled Date", value: `Filled: ${v("fillDate", "03/25/2026")}`, x: x + 90, y: y0 + 1, fontSize: 10, bold: false },
    { id: "bl-drname", label: "Doctor (Bottom)", value: `${v("doctorFirstName", "Charles")} ${v("doctorLastName", "Murphy")}`.toUpperCase(), x: x + 175, y: y0 + 2, fontSize: 9, bold: false },
    { id: "bl-patient", label: "Patient (Bottom)", value: `${v("patientFirstName", "TAYLOR")} ${v("patientLastName", "GRAY")}`.toUpperCase(), x, y: y0 + 14, fontSize: 12, bold: true },
    { id: "bl-draddr", label: "Doctor Address", value: v("doctorAddressLine1", "132 Medical Plaza Dr"), x: x + 160, y: y0 + 16, fontSize: 8, bold: false },
    { id: "bl-dob", label: "DOB", value: `DOB: ${v("patientDOB", "12/22/1985")}`.toUpperCase(), x, y: y0 + 28, fontSize: 8, bold: true },
    { id: "bl-drcsz", label: "Doctor City/State/Zip", value: `${v("doctorCity", "Lake Charles")}, ${v("doctorState", "LA")} ${v("doctorZip", "70601")}`.toUpperCase(), x: x + 160, y: y0 + 28, fontSize: 8, bold: false },
    { id: "bl-ptaddr", label: "Patient Address", value: [v("patientAddressLine1", "123 Unknown Ave"), v("patientAddressLine2", "Apt C")].filter(Boolean).join(" ").toUpperCase(), x, y: y0 + 40, fontSize: 8, bold: false },
    { id: "bl-drphone", label: "Doctor Phone", value: v("doctorPhone", "337-555-7777"), x: x + 160, y: y0 + 40, fontSize: 8, bold: false },
    { id: "bl-phones", label: "Phones / Insurance", value: [v("patientPhone", "337-555-1234"), v("patientCellPhone", "337-555-5678"), v("primaryInsurance", "WELLCARE MEDICARE PART D")].filter(Boolean).join(" | ").toUpperCase(), x, y: y0 + 52, fontSize: 8, bold: false, maxWidth: SEC1_RIGHT - x },
    { id: "bl-delivery", label: "Delivery Method", value: v("patientDeliveryMethod", "DELIVERY").toUpperCase(), x, y: y0 + 64, fontSize: 12, bold: true },
    { id: "bl-price", label: "Price", value: `Price: $${v("copay", "45.00")}`, x: x + 100, y: y0 + 64, fontSize: 10, bold: true },
    { id: "bl-drugfull", label: "Drug Name (Full)", value: v("itemName", "Ketoprofen 10%/Cyclobenzaprine 2%/Lidocaine 5% Cream").toUpperCase(), x, y: y0 + 78, fontSize: 8, bold: true, maxWidth: 288 },
    { id: "bl-qtyfill", label: "QTY / Fill#", value: `QTY: ${v("dispensedQuantity", "120")} ${v("qtyType", "GM")} | FILL#: ${v("fillNumber", "1")}`, x, y: y0 + 90, fontSize: 8, bold: true },
    { id: "bl-barcode", label: "Bottom Barcode (fill ID)", value: `b${v("fillId", "154687")}:${v("labelVersion", "0")}`, x, y: y0 + 95, fontSize: 6, bold: false, isBarcode: true, rotation: 90, barcodeWidth: 16, barcodeHeight: 70 },
  );

  // ── Section 3: AUX ────────────────────────────────────────────
  const ax = SEC3_LEFT;
  let ay = 6;
  const auxLabels = (v("auxLabels") || "FOR EXTERNAL USE ONLY\nKEEP OUT OF REACH OF CHILDREN\nSTORE AT ROOM TEMPERATURE\nDO NOT USE IF ALLERGIC TO ANY INGREDIENT").split("\n");
  for (let i = 0; i < Math.min(auxLabels.length, 4); i++) {
    fields.push({
      id: `aux-${i}`,
      label: `Aux Label ${i + 1}`,
      value: auxLabels[i]?.toUpperCase() || "",
      x: ax,
      y: ay,
      fontSize: 8,
      bold: false,
      maxWidth: SEC3_RIGHT - ax,
    });
    ay += 14;
  }

  ay += 4;
  fields.push(
    { id: "aux-compounded", label: "Compounded Notice", value: "This medication has been compounded by this pharmacy", x: ax, y: ay, fontSize: 8, bold: false, maxWidth: SEC3_RIGHT - ax }
  );
  ay += 20;

  if (v("formulaId")) {
    fields.push({ id: "aux-formula", label: "Formula ID", value: `FormulaID: ${v("formulaId", "F-1547")}`, x: ax, y: ay, fontSize: 6, bold: false });
    ay += 10;
  }
  if (v("batchId")) {
    fields.push({ id: "aux-batch", label: "Batch", value: `Batch: ${v("batchId", "B-2026-0325")}`, x: ax, y: ay, fontSize: 6, bold: false });
    ay += 10;
  }
  if (v("batchExpiration")) {
    fields.push({ id: "aux-useby", label: "Use By", value: `Use By: ${v("batchExpiration", "06/25/2026")}`, x: ax, y: ay, fontSize: 6, bold: false });
  }

  // ── Section 4: SIGNATURE / NOTES ──────────────────────────────
  const sx = SEC3_LEFT;
  let sy = SEC4_TOP + 2;

  fields.push(
    { id: "sig-name1", label: "Sig Patient Name", value: `${v("patientFirstName", "TAYLOR")} ${v("patientLastName", "GRAY")}`, x: sx, y: sy, fontSize: 7, bold: true },
    { id: "sig-home1", label: "Sig Home Phone", value: `Home: ${v("patientPhone", "337-555-1234")}`, x: sx + 75, y: sy, fontSize: 6, bold: false },
    { id: "sig-cell1", label: "Sig Cell Phone", value: `Cell: ${v("patientCellPhone", "337-555-5678")}`, x: sx + 135, y: sy, fontSize: 6, bold: false },
  );
  sy += 10;

  if (v("boh")) {
    fields.push({ id: "sig-boh", label: "BOH", value: `BOH: ${v("boh", "16")}`, x: sx, y: sy, fontSize: 7, bold: true });
  }
  sy += 10;

  fields.push(
    { id: "sig-name2", label: "Sig Patient Name 2", value: `${v("patientFirstName", "TAYLOR")} ${v("patientLastName", "GRAY")}`, x: sx, y: sy, fontSize: 7, bold: true },
    { id: "sig-home2", label: "Sig Home Phone 2", value: `Home: ${v("patientPhone", "337-555-1234")}`, x: sx + 75, y: sy, fontSize: 6, bold: false },
    { id: "sig-cell2", label: "Sig Cell Phone 2", value: `Cell: ${v("patientCellPhone", "337-555-5678")}`, x: sx + 135, y: sy, fontSize: 6, bold: false },
  );
  sy += 10;

  fields.push({ id: "sig-line", label: "Signature Line", value: "Signature: __________________________", x: sx, y: sy, fontSize: 6, bold: false });
  sy += 10;

  if (v("patientComments")) {
    fields.push({ id: "sig-comments", label: "Patient Comments", value: v("patientComments"), x: sx, y: sy, fontSize: 7, bold: false, maxWidth: 160 });
    sy += 16;
  }

  // Fill tags
  const fillTags = v("fillTags", "price check, compound");
  if (fillTags) {
    fields.push({ id: "sig-tags", label: "Fill Tags", value: `Tags: ${fillTags}`, x: sx, y: sy, fontSize: 7, bold: false, maxWidth: 160 });
    sy += 10;
  }

  if (v("pickupTime")) {
    fields.push({ id: "sig-pickup", label: "Promised Time", value: `Promised: ${v("pickupTime")}`, x: sx, y: sy, fontSize: 6, bold: false });
    sy += 9;
  }

  fields.push({ id: "sig-dispinfo", label: "Disp/Filled/NDC", value: `Disp Qty: ${v("dispensedQuantity", "120")} | Filled: ${v("fillDate", "03/25/2026")} | NDC: ${v("ndc", "5555-4455-01")}`, x: sx, y: sy, fontSize: 5, bold: false });
  sy += 9;

  // Barcode #3 — Item ID (DRX: Patient Notes, i:{itemId}, vertical)
  if (v("itemId")) {
    fields.push({ id: "item-barcode", label: "Item ID Barcode (i:itemId)", value: `i:${v("itemId", "71662")}`, x: sx, y: sy, fontSize: 5, bold: false, isBarcode: true, rotation: 90, barcodeWidth: 14, barcodeHeight: 50 });
  }

  // QR — Patient Education URL
  if (v("patientEducationUrl")) {
    fields.push({ id: "sig-qr", label: "Patient Education QR", value: v("patientEducationUrl"), x: sx + 30, y: sy - 4, fontSize: 5, bold: false, isQrCode: true });
  }

  // Barcode #4 — Signature fill ID (DRX: Signature2, id|fill_number, vertical)
  fields.push({ id: "sig-barcode", label: "Signature Barcode (fill ID)", value: `b${v("fillId", "154687")}:${v("fillNumber", "1")}`, x: sx + 60, y: sy, fontSize: 5, bold: false, isBarcode: true, rotation: 90, barcodeWidth: 14, barcodeHeight: 50 });

  // ── Backtag (right column of section 4) ───────────────────────
  const btX = sx + 170;
  let btY = SEC4_TOP + 2;

  fields.push(
    { id: "bt-rx", label: "Backtag RX", value: `RX ${v("rxNumber", "154687")}`, x: btX, y: btY, fontSize: 6, bold: true },
    { id: "bt-dob", label: "Backtag DOB", value: `DOB: ${v("patientDOB", "12/22/1985")}`, x: btX + 50, y: btY, fontSize: 5, bold: false },
  );
  btY += 8;

  fields.push({ id: "bt-patient", label: "Backtag Patient", value: `${v("patientFirstName", "TAYLOR")} ${v("patientLastName", "GRAY")}`.toUpperCase(), x: btX, y: btY, fontSize: 6, bold: true });
  btY += 8;

  fields.push({ id: "bt-doctor", label: "Backtag Doctor", value: `${v("doctorFirstName", "Charles")} ${v("doctorLastName", "Murphy")}`.toUpperCase(), x: btX, y: btY, fontSize: 6, bold: false });
  btY += 8;

  const drAddr = [v("doctorAddressLine1", "132 Medical Plaza Dr"), v("doctorCity", "Lake Charles"), `${v("doctorState", "LA")} ${v("doctorZip", "70601")}`].filter(Boolean).join(", ");
  fields.push({ id: "bt-draddr", label: "Backtag Doctor Addr", value: drAddr, x: btX, y: btY, fontSize: 5, bold: false, maxWidth: SEC3_RIGHT - btX });
  btY += 8;

  fields.push(
    { id: "bt-dea", label: "Backtag DEA", value: `DEA: ${v("doctorDEA", "BM1234567")}`, x: btX, y: btY, fontSize: 5, bold: false },
    { id: "bt-npi", label: "Backtag NPI", value: `NPI: ${v("doctorNPI", "1234567890")}`, x: btX + 70, y: btY, fontSize: 5, bold: false },
  );
  btY += 8;

  fields.push({ id: "bt-drug", label: "Backtag Drug", value: v("itemName", "Ketoprofen 10%/Cyclobenzaprine 2%/Lidocaine 5% Cream").toUpperCase(), x: btX, y: btY, fontSize: 5, bold: false, maxWidth: SEC3_RIGHT - btX });
  btY += 14;

  fields.push({ id: "bt-sig", label: "Backtag SIG", value: v("sig", "Apply 1 gram topically..."), x: btX, y: btY, fontSize: 5, bold: false, maxWidth: SEC3_RIGHT - btX });
  btY += 14;

  fields.push(
    { id: "bt-ndc", label: "Backtag NDC", value: `NDC: ${v("ndc", "5555-4455-01")}`, x: btX, y: btY, fontSize: 5, bold: false },
    { id: "bt-qty", label: "Backtag QTY", value: `QTY: ${v("dispensedQuantity", "120")}`, x: btX + 75, y: btY, fontSize: 5, bold: false },
  );
  btY += 8;

  fields.push(
    { id: "bt-ins", label: "Backtag Insurance", value: `INS: $${v("copay", "45.00")}`, x: btX, y: btY, fontSize: 5, bold: false },
    { id: "bt-filled", label: "Backtag Filled", value: `Filled: ${v("fillDate", "03/25/2026")}`, x: btX + 50, y: btY, fontSize: 5, bold: false },
  );
  btY += 8;

  fields.push({ id: "bt-refills", label: "Backtag Refills", value: `${v("refillsLeft", "3")} Refill(s) left until ${v("rxExpires", "03/25/2027")}`, x: btX, y: btY, fontSize: 5, bold: false });

  return fields;
}

// ─── Generic template → LabelField converter ─────────────────────

function buildGenericLabelFields(
  variables: TemplateVariable[],
  formData: Record<string, string>,
  pageWidth: number,
  pageHeight: number,
): LabelField[] {
  const fields: LabelField[] = [];
  // DRX element positions are in inches — convert to points
  const PTS_PER_INCH = 72;
  // Compute the actual canvas dims (landscape transform may swap)
  const canvasW = Math.max(pageWidth, pageHeight) * PTS_PER_INCH;
  const canvasH = Math.min(pageWidth, pageHeight) * PTS_PER_INCH;

  // If we don't have position data, lay them out in a simple grid
  let autoY = 10;
  for (const v of variables) {
    const value = formData[v.key] || v.exampleText || v.key;
    const hasPosition = v.xPosition !== undefined && v.yPosition !== undefined;

    let xPt: number;
    let yPt: number;
    let fontSize = v.fontSize || 8;
    const bold = v.fontStyle ? v.fontStyle.toLowerCase().includes("bold") : false;

    if (hasPosition) {
      xPt = (v.xPosition || 0) * PTS_PER_INCH;
      yPt = (v.yPosition || 0) * PTS_PER_INCH;
    } else {
      xPt = 10;
      yPt = autoY;
      autoY += fontSize + 6;
    }

    // Clamp to canvas
    xPt = Math.max(0, Math.min(xPt, canvasW - 20));
    yPt = Math.max(0, Math.min(yPt, canvasH - 10));

    fields.push({
      id: v.key,
      label: v.label,
      value,
      x: Math.round(xPt),
      y: Math.round(yPt),
      fontSize,
      bold,
      isBarcode: v.isBarcode,
      isQrCode: v.isQR,
      maxWidth: v.maxWidth ? v.maxWidth * PTS_PER_INCH : undefined,
    });
  }

  return fields;
}

// ─── Component ─────────────────────────────────────────────────────

export default function TemplatePreviewPage() {
  const params = useParams();
  const templateId = params.id as string;

  // Template metadata + variables from API
  const [templateMeta, setTemplateMeta] = useState<TemplateMeta | null>(null);
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [fieldGroups, setFieldGroups] = useState<FieldGroup[] | null>(null);
  const [useSpecializedRenderer, setUseSpecializedRenderer] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [defaultData, setDefaultData] = useState<Record<string, string>>({});
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // PDF preview state
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Rx Label specific state
  const [fillId, setFillId] = useState("");

  // Interactive canvas state
  const [canvasFields, setCanvasFields] = useState<LabelField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [originalPositions, setOriginalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [hasLayoutChanges, setHasLayoutChanges] = useState(false);

  // UI state
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const hasAutoGenerated = useRef(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  // Determine if this is an Rx Label template
  const isRxLabel = templateMeta?.type === "Rx Label";

  // Canvas dimensions in points
  const canvasWidth = templateMeta
    ? Math.round(Math.max(templateMeta.pageWidth, templateMeta.pageHeight) * 72)
    : 576;
  const canvasHeight = templateMeta
    ? Math.round(Math.min(templateMeta.pageWidth, templateMeta.pageHeight) * 72)
    : 288;

  // Load template metadata + variables on mount
  useEffect(() => {
    async function loadTemplate() {
      try {
        const res = await fetch(`/api/labels/template?id=${templateId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load template");
        }
        const json = await res.json();
        setTemplateMeta(json.template);

        if (json.fieldGroups && json.useSpecializedRenderer) {
          setFieldGroups(json.fieldGroups);
          setUseSpecializedRenderer(true);
          setFormData(json.defaultData || {});
          setDefaultData(json.defaultData || {});
        } else {
          setVariables(json.variables || []);
          setFormData(json.defaultData || {});
          setDefaultData(json.defaultData || {});
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load template");
      } finally {
        setLoadingTemplate(false);
      }
    }
    loadTemplate();
  }, [templateId]);

  // Build canvas fields whenever formData or template changes
  useEffect(() => {
    if (!templateMeta) return;

    let newFields: LabelField[];
    if (isRxLabel && useSpecializedRenderer) {
      newFields = buildRxLabelFields(formData);
    } else {
      newFields = buildGenericLabelFields(
        variables,
        formData,
        templateMeta.pageWidth,
        templateMeta.pageHeight,
      );
    }

    setCanvasFields(newFields);

    // Store original positions on first build
    if (Object.keys(originalPositions).length === 0 && newFields.length > 0) {
      const posMap: Record<string, { x: number; y: number }> = {};
      for (const f of newFields) {
        posMap[f.id] = { x: f.x, y: f.y };
      }
      setOriginalPositions(posMap);
    }
  }, [formData, templateMeta, isRxLabel, useSpecializedRenderer, variables]);

  const updateField = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  // ── Interactive canvas callbacks ────────────────────────────────

  const handleFieldMove = useCallback((fieldId: string, newX: number, newY: number) => {
    setCanvasFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, x: newX, y: newY } : f))
    );
    setHasLayoutChanges(true);
  }, []);

  const handleFieldUpdate = useCallback((fieldId: string, updates: Partial<LabelField>) => {
    setCanvasFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
    setHasLayoutChanges(true);
  }, []);

  const handleResetPosition = useCallback(
    (fieldId: string) => {
      const orig = originalPositions[fieldId];
      if (orig) {
        setCanvasFields((prev) =>
          prev.map((f) => (f.id === fieldId ? { ...f, x: orig.x, y: orig.y } : f))
        );
      }
    },
    [originalPositions]
  );

  const handleDeleteField = useCallback((fieldId: string) => {
    setCanvasFields((prev) => prev.filter((f) => f.id !== fieldId));
    setSelectedFieldId(null);
    setHasLayoutChanges(true);
  }, []);

  const handleSaveLayout = useCallback(() => {
    // Store positions in localStorage for now
    const layoutData = canvasFields.map((f) => ({
      id: f.id,
      x: f.x,
      y: f.y,
      fontSize: f.fontSize,
      bold: f.bold,
      maxWidth: f.maxWidth,
    }));
    localStorage.setItem(`label-layout-${templateId}`, JSON.stringify(layoutData));
    setHasLayoutChanges(false);
    // Update original positions to current
    const posMap: Record<string, { x: number; y: number }> = {};
    for (const f of canvasFields) {
      posMap[f.id] = { x: f.x, y: f.y };
    }
    setOriginalPositions(posMap);
  }, [canvasFields, templateId]);

  // Generate PDF preview
  const generatePreview = useCallback(async () => {
    if (!templateId || !templateMeta) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/labels/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: Number(templateId), data: formData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate preview");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [templateId, templateMeta, formData, pdfUrl]);

  // Load from Fill ID (Rx Label only)
  const generateFromFill = async () => {
    if (!fillId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/labels/compound?fillId=${encodeURIComponent(fillId.trim())}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate label from fill");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
      setShowPdfPreview(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    setFormData({ ...defaultData });
    setHasLayoutChanges(false);
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${templateMeta?.name || "template"}.pdf`;
    a.click();
  };

  const printPdf = () => {
    if (!pdfUrl) return;
    const win = window.open(pdfUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print());
    }
  };

  // Group variables by category (for generic path)
  const groupedVars = variables.reduce<Record<string, TemplateVariable[]>>((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {});

  const categories = Object.keys(groupedVars).sort();

  // Compute iframe dimensions based on page orientation
  const iframeScale = 96;
  const isLandscape = templateMeta
    ? templateMeta.pageHeight > templateMeta.pageWidth
      ? true
      : templateMeta.pageWidth > templateMeta.pageHeight
    : false;
  const iframeWidth = templateMeta
    ? isLandscape
      ? Math.round(Math.max(templateMeta.pageWidth, templateMeta.pageHeight) * iframeScale)
      : Math.round(templateMeta.pageWidth * iframeScale)
    : 768;
  const iframeHeight = templateMeta
    ? isLandscape
      ? Math.round(Math.min(templateMeta.pageWidth, templateMeta.pageHeight) * iframeScale)
      : Math.round(templateMeta.pageHeight * iframeScale)
    : 384;

  // Selected field for properties panel
  const selectedField = canvasFields.find((f) => f.id === selectedFieldId) || null;

  // Count fields for status bar
  const fieldCount = useSpecializedRenderer
    ? (fieldGroups || []).reduce((sum, g) => sum + g.fields.length, 0)
    : variables.length;
  const groupCount = useSpecializedRenderer
    ? (fieldGroups || []).length
    : categories.length;

  // Sections for canvas
  const sections: SectionDef[] | undefined = isRxLabel ? RX_LABEL_SECTIONS : undefined;

  // ── Loading state ──
  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[var(--green-700)] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)]">Loading template...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (loadError) {
    return (
      <div className="px-6 py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Template Not Found</h2>
        <p className="text-sm text-gray-500 mb-4">{loadError}</p>
        <p className="text-xs text-gray-400 mb-6">
          This template may need to be imported from DRX first.
        </p>
        <Link
          href="/settings/print-templates"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-[var(--green-700)] border border-[var(--green-700)] rounded-md hover:bg-[var(--green-50)] transition-colors no-underline"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Templates
        </Link>
      </div>
    );
  }

  // ── Render the specialized (fieldGroups) editor ──
  const renderSpecializedEditor = () => {
    if (!fieldGroups) return null;
    return (
      <>
        {fieldGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.title);
          return (
            <div key={group.title} className="bg-white rounded-lg border border-[var(--border)]">
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-t-lg"
              >
                <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                  {group.title}
                  <span className="ml-2 text-[10px] text-[var(--text-muted)] font-normal normal-case">
                    ({group.fields.length} field{group.fields.length !== 1 ? "s" : ""})
                  </span>
                </span>
                {isCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                )}
              </button>
              {!isCollapsed && (
                <div className="px-3 pb-3 grid grid-cols-2 gap-x-2 gap-y-2">
                  {group.fields.map((field) => (
                    <div key={field.key} className={field.textarea ? "col-span-2" : field.small ? "col-span-1" : "col-span-2"}>
                      <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
                        {field.label}
                      </label>
                      {field.textarea ? (
                        <textarea
                          value={formData[field.key] || ""}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          rows={3}
                          className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)] resize-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={formData[field.key] || ""}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Warning Flags for Rx Labels with specialized renderer */}
        {isRxLabel && (
          <div className="bg-white rounded-lg border border-[var(--border)] px-3 py-3">
            <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide block mb-2">Warning Flags</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.noClaimWarning === "true"}
                  onChange={(e) => updateField("noClaimWarning", e.target.checked ? "true" : "false")}
                  className="accent-[var(--green-700)]"
                />
                NO PAID CLAIM
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.holdWarning === "true"}
                  onChange={(e) => updateField("holdWarning", e.target.checked ? "true" : "false")}
                  className="accent-[var(--green-700)]"
                />
                HOLD
              </label>
            </div>
          </div>
        )}
      </>
    );
  };

  // ── Render the generic (variables-based) editor ──
  const renderGenericEditor = () => {
    if (variables.length === 0) {
      return (
        <div className="bg-white rounded-lg border border-[var(--border)] p-6 text-center">
          <AlertCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
          <p className="text-xs text-[var(--text-muted)]">
            No editable variables found in this template.
          </p>
        </div>
      );
    }

    return categories.map((category) => {
      const vars = groupedVars[category];
      const isCollapsed = collapsedGroups.has(category);
      return (
        <div key={category} className="bg-white rounded-lg border border-[var(--border)]">
          <button
            onClick={() => toggleGroup(category)}
            className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-t-lg"
          >
            <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              {category}
              <span className="ml-2 text-[10px] text-[var(--text-muted)] font-normal normal-case">
                ({vars.length} field{vars.length !== 1 ? "s" : ""})
              </span>
            </span>
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
          </button>
          {!isCollapsed && (
            <div className="px-3 pb-3 space-y-2">
              {vars.map((v) => (
                <div key={v.key}>
                  <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
                    {v.label}
                    {(v.isBarcode || v.isQR) && (
                      <span className="ml-1 text-[9px] text-blue-500 font-normal normal-case">
                        ({v.isBarcode ? "barcode" : "QR"})
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData[v.key] || ""}
                    onChange={(e) => updateField(v.key, e.target.value)}
                    placeholder={v.exampleText || v.key}
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-6 py-2.5 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
        <a href="/dashboard" className="text-[var(--green-700)] no-underline font-medium hover:underline">Home</a>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <Link href="/settings/print-templates" className="text-[var(--green-700)] no-underline font-medium hover:underline">Print Templates</Link>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <span className="text-[var(--text-secondary)] font-semibold">{templateMeta?.name || "Template"}</span>
      </div>

      <div className="px-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/settings/print-templates" className="text-[var(--green-700)] hover:text-[var(--green-800)] inline-flex items-center gap-1 text-sm no-underline">
              <ChevronLeft className="w-4 h-4" /> Back
            </Link>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">{templateMeta?.name}</h1>
            <span className="text-xs bg-[var(--green-50)] text-[var(--green-700)] px-2 py-0.5 rounded-full font-medium">
              {templateMeta?.size} {templateMeta?.type}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] bg-gray-100 px-2 py-0.5 rounded">
              {templateMeta?.elementCount} elements
            </span>
            {useSpecializedRenderer && (
              <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Specialized Renderer
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetToDefaults} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-md hover:bg-gray-50 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            {hasLayoutChanges && (
              <button
                onClick={handleSaveLayout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[var(--green-700)] rounded-md hover:bg-[var(--green-800)] transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Save Layout
              </button>
            )}
            <button
              onClick={() => {
                if (!showPdfPreview) generatePreview();
                setShowPdfPreview((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-md transition-colors ${
                showPdfPreview
                  ? "text-white bg-blue-600 border-blue-600 hover:bg-blue-700"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border)] hover:bg-gray-50"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> {showPdfPreview ? "Show Editor" : "Preview PDF"}
            </button>
            {pdfUrl && (
              <>
                <button onClick={downloadPdf} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-md hover:bg-gray-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button onClick={printPdf} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-md hover:bg-gray-50 transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </>
            )}
          </div>
        </div>

        {/* Load from Fill bar (Rx Label only) + Status */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-3 mb-4 flex items-center gap-3 flex-wrap">
          {isRxLabel && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Fill ID for real data..."
                value={fillId}
                onChange={(e) => setFillId(e.target.value)}
                className="px-3 py-2 border border-[var(--border)] rounded-md text-sm w-52 focus:outline-none focus:ring-2 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
              />
              <button
                onClick={generateFromFill}
                disabled={loading || !fillId.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--green-700)] text-[var(--green-700)] rounded-md text-sm font-medium hover:bg-[var(--green-50)] disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Load Fill
              </button>
            </div>
          )}
          <span className="text-xs text-[var(--text-muted)]">
            DRX Template #{templateMeta?.id} &middot; {fieldCount} fields &middot; {groupCount} groups
            {canvasFields.length > 0 && ` \u00b7 ${canvasFields.length} canvas elements`}
          </span>
          {hasLayoutChanges && (
            <span className="text-xs text-amber-600 font-medium">Unsaved layout changes</span>
          )}
          {loading && (
            <span className="text-xs text-[var(--text-muted)] animate-pulse ml-auto">Updating preview...</span>
          )}
          {error && (
            <span className="text-sm text-red-600 ml-auto">{error}</span>
          )}
        </div>

        {/* Three-column layout: Left (fields) | Center (canvas/pdf) | Right (properties) */}
        <div className="flex gap-4" style={{ minHeight: "calc(100vh - 260px)" }}>
          {/* Left: Editor Fields (collapsible) */}
          <div className={`flex-shrink-0 overflow-y-auto transition-all ${leftPanelCollapsed ? "w-10" : "w-[320px]"}`} style={{ maxHeight: "calc(100vh - 260px)" }}>
            {leftPanelCollapsed ? (
              <button
                onClick={() => setLeftPanelCollapsed(false)}
                className="w-10 h-10 flex items-center justify-center bg-white border border-[var(--border)] rounded-lg hover:bg-gray-50 transition-colors"
                title="Show field editor"
              >
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)] -rotate-90" />
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Field Values</span>
                  <button
                    onClick={() => setLeftPanelCollapsed(true)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="Collapse panel"
                  >
                    <ChevronUp className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                </div>
                {useSpecializedRenderer ? renderSpecializedEditor() : renderGenericEditor()}
              </div>
            )}
          </div>

          {/* Center: Interactive Canvas or PDF Preview */}
          <div className="flex-1 min-w-0">
            {showPdfPreview ? (
              /* PDF Preview mode */
              pdfUrl ? (
                <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden h-full flex flex-col">
                  <div className="bg-gray-50 px-4 py-2 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
                    <span className="text-xs font-medium text-[var(--text-muted)]">PDF Preview</span>
                    <span className="text-xs text-[var(--text-muted)]">{templateMeta?.size}</span>
                  </div>
                  <div className="flex-1 flex justify-center items-start p-4 bg-gray-100 overflow-auto">
                    <iframe
                      src={pdfUrl}
                      className="bg-white shadow-lg"
                      style={{
                        width: `${Math.min(iframeWidth, 900)}px`,
                        height: `${Math.min(iframeHeight, 1200)}px`,
                        border: "none",
                      }}
                      title="Template Preview"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-[var(--border)] h-full flex flex-col items-center justify-center text-center p-8">
                  <Loader2 className="w-8 h-8 text-[var(--text-muted)] mb-3 animate-spin opacity-40" />
                  <p className="text-[var(--text-muted)] text-sm">Generating PDF preview...</p>
                </div>
              )
            ) : (
              /* Interactive canvas mode */
              <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden h-full flex flex-col">
                <div className="bg-gray-50 px-4 py-2 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Interactive Label Editor
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {templateMeta?.size} &middot; Click fields to select, drag to move
                  </span>
                </div>
                <div className="flex-1 p-4 bg-gray-100 overflow-auto flex justify-center items-start">
                  <InteractiveLabelCanvas
                    fields={canvasFields}
                    width={canvasWidth}
                    height={canvasHeight}
                    onFieldMove={handleFieldMove}
                    onFieldUpdate={handleFieldUpdate}
                    selectedFieldId={selectedFieldId}
                    onSelectField={setSelectedFieldId}
                    sections={sections}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Properties Panel */}
          {!showPdfPreview && (
            <div className="w-[240px] flex-shrink-0 overflow-y-auto" style={{ maxHeight: "calc(100vh - 260px)" }}>
              <div className="space-y-3">
                <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  Properties
                </span>
                <PropertiesPanel
                  field={selectedField}
                  onUpdate={handleFieldUpdate}
                  onResetPosition={handleResetPosition}
                  onDelete={handleDeleteField}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
