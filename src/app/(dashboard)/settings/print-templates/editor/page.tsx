"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Type, Hash, BarChart3, Image, QrCode, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline, Trash2, Copy, Plus, Save, Eye, ArrowLeft,
  GripVertical, ChevronDown, Undo2, Redo2, ZoomIn, ZoomOut
} from "lucide-react";

// ─── Types ──────────────────────────────────────
interface TemplateField {
  id: string;
  type: "text" | "variable" | "barcode" | "line" | "box" | "image";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline";
  textAlign: "left" | "center" | "right";
  value: string; // for text: literal text, for variable: variable key
  rotation: number;
  // DRX-specific fields preserved for accurate rendering
  fontName?: string;
  exampleText?: string;
  labelGroup?: string;
  forceUpperCase?: boolean;
  maxTextLength?: number;
  paragraphWidth?: number;
  joinMultipleWith?: string;
  formatting?: string;
  ifElementData?: string;
  ifDisplay?: string;
  truthyOverride?: string;
  falseyOverride?: string;
  color?: string;
  fillColor?: string;
  textColor?: string;
}

interface TemplateData {
  id: number;
  name: string;
  width: number; // in inches
  height: number;
  type: string;
  fields: TemplateField[];
}

// ─── Variable fields available for pharmacy labels ───
const VARIABLE_FIELDS = [
  { key: "{{patient_name}}", label: "Patient Name", category: "Patient" },
  { key: "{{patient_dob}}", label: "Date of Birth", category: "Patient" },
  { key: "{{patient_phone}}", label: "Patient Phone", category: "Patient" },
  { key: "{{patient_address}}", label: "Patient Address", category: "Patient" },
  { key: "{{patient_mrn}}", label: "MRN", category: "Patient" },
  { key: "{{rx_number}}", label: "Rx Number", category: "Prescription" },
  { key: "{{drug_name}}", label: "Drug Name", category: "Prescription" },
  { key: "{{drug_strength}}", label: "Drug Strength", category: "Prescription" },
  { key: "{{directions}}", label: "Directions (SIG)", category: "Prescription" },
  { key: "{{quantity}}", label: "Quantity", category: "Prescription" },
  { key: "{{days_supply}}", label: "Days Supply", category: "Prescription" },
  { key: "{{refills_remaining}}", label: "Refills Remaining", category: "Prescription" },
  { key: "{{fill_date}}", label: "Fill Date", category: "Prescription" },
  { key: "{{expiration_date}}", label: "Expiration Date", category: "Prescription" },
  { key: "{{ndc}}", label: "NDC", category: "Prescription" },
  { key: "{{lot_number}}", label: "Lot Number", category: "Prescription" },
  { key: "{{doctor_name}}", label: "Doctor Name", category: "Prescriber" },
  { key: "{{doctor_phone}}", label: "Doctor Phone", category: "Prescriber" },
  { key: "{{doctor_dea}}", label: "Doctor DEA", category: "Prescriber" },
  { key: "{{doctor_npi}}", label: "Doctor NPI", category: "Prescriber" },
  { key: "{{pharmacy_name}}", label: "Pharmacy Name", category: "Pharmacy" },
  { key: "{{pharmacy_phone}}", label: "Pharmacy Phone", category: "Pharmacy" },
  { key: "{{pharmacy_fax}}", label: "Pharmacy Fax", category: "Pharmacy" },
  { key: "{{pharmacy_address}}", label: "Pharmacy Address", category: "Pharmacy" },
  { key: "{{pharmacy_npi}}", label: "Pharmacy NPI", category: "Pharmacy" },
  { key: "{{pharmacy_dea}}", label: "Pharmacy DEA", category: "Pharmacy" },
  { key: "{{barcode_rx}}", label: "Barcode (Rx#)", category: "Barcode" },
  { key: "{{barcode_ndc}}", label: "Barcode (NDC)", category: "Barcode" },
  { key: "{{qr_code}}", label: "QR Code", category: "Barcode" },
  { key: "{{copay}}", label: "Copay Amount", category: "Billing" },
  { key: "{{insurance_name}}", label: "Insurance Name", category: "Billing" },
  { key: "{{bin_location}}", label: "Bin Location", category: "Workflow" },
  { key: "{{batch_number}}", label: "Batch Number", category: "Compounding" },
  { key: "{{bud_date}}", label: "BUD Date", category: "Compounding" },
  { key: "{{formula_name}}", label: "Formula Name", category: "Compounding" },
];

const CATEGORIES = [...new Set(VARIABLE_FIELDS.map((f) => f.category))];

const DPI = 96; // screen DPI for rendering

// ─── Default template for new/demo ──────────────
function getDefaultTemplate(id: number): TemplateData {
  return {
    id,
    name: "New Template",
    width: 4,
    height: 8,
    type: "Rx Label",
    fields: [
      { id: "f1", type: "variable", label: "Pharmacy Name", x: 10, y: 10, width: 280, height: 20, fontSize: 14, fontWeight: "bold", fontStyle: "normal", textDecoration: "none", textAlign: "center", value: "{{pharmacy_name}}", rotation: 0 },
      { id: "f2", type: "variable", label: "Pharmacy Address", x: 10, y: 32, width: 280, height: 16, fontSize: 9, fontWeight: "normal", fontStyle: "normal", textDecoration: "none", textAlign: "center", value: "{{pharmacy_address}}", rotation: 0 },
      { id: "f3", type: "variable", label: "Pharmacy Phone", x: 10, y: 48, width: 280, height: 16, fontSize: 9, fontWeight: "normal", fontStyle: "normal", textDecoration: "none", textAlign: "center", value: "{{pharmacy_phone}}", rotation: 0 },
      { id: "f4", type: "line", label: "Divider", x: 10, y: 68, width: 280, height: 1, fontSize: 10, fontWeight: "normal", fontStyle: "normal", textDecoration: "none", textAlign: "left", value: "", rotation: 0 },
      { id: "f5", type: "variable", label: "Rx Number", x: 10, y: 76, width: 120, height: 18, fontSize: 12, fontWeight: "bold", fontStyle: "normal", textDecoration: "none", textAlign: "left", value: "{{rx_number}}", rotation: 0 },
      { id: "f6", type: "variable", label: "Fill Date", x: 170, y: 76, width: 120, height: 18, fontSize: 10, fontWeight: "normal", fontStyle: "normal", textDecoration: "none", textAlign: "right", value: "{{fill_date}}", rotation: 0 },
      { id: "f7", type: "variable", label: "Patient Name", x: 10, y: 100, width: 280, height: 22, fontSize: 16, fontWeight: "bold", fontStyle: "normal", textDecoration: "none", textAlign: "left", value: "{{patient_name}}", rotation: 0 },
      { id: "f8", type: "variable", label: "Drug Name", x: 10, y: 130, width: 280, height: 20, fontSize: 13, fontWeight: "bold", fontStyle: "normal", textDecoration: "none", textAlign: "left", value: "{{drug_name}}", rotation: 0 },
      { id: "f9", type: "variable", label: "Directions", x: 10, y: 155, width: 280, height: 60, fontSize: 11, fontWeight: "normal", fontStyle: "normal", textDecoration: "none", textAlign: "left", value: "{{directions}}", rotation: 0 },
      { id: "f10", type: "variable", label: "Quantity", x: 10, y: 222, width: 140, height: 16, fontSize: 10, fontWeight: "normal", fontStyle: "normal", textDecoration: "none", textAlign: "left", value: "{{quantity}}", rotation: 0 },
      { id: "f11", type: "variable", label: "Refills", x: 160, y: 222, width: 130, height: 16, fontSize: 10, fontWeight: "normal", fontStyle: "normal", textDecoration: "none", textAlign: "right", value: "{{refills_remaining}}", rotation: 0 },
      { id: "f12", type: "variable", label: "Doctor", x: 10, y: 244, width: 280, height: 16, fontSize: 10, fontWeight: "normal", fontStyle: "normal", textDecoration: "none", textAlign: "left", value: "{{doctor_name}}", rotation: 0 },
      { id: "f13", type: "variable", label: "Barcode", x: 60, y: 268, width: 180, height: 40, fontSize: 10, fontWeight: "normal", fontStyle: "normal", textDecoration: "none", textAlign: "center", value: "{{barcode_rx}}", rotation: 0 },
    ],
  };
}

// ─── Main Editor Component ──────────────────────
export default function TemplateEditorPage() {
  const searchParams = useSearchParams();
  const templateId = Number(searchParams.get("id")) || 1;

  const [template, setTemplate] = useState<TemplateData>(getDefaultTemplate(templateId));
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.5);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Prescription");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load stored template data from database
  useEffect(() => {
    if (!templateId) { setIsLoading(false); return; }
    fetch(`/api/settings/print-templates/load?id=${templateId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.template) {
          const stored = data.template;
          // Convert DRX elements to editor fields
          const rawPageW = stored.pageWidth || 4;
          const rawPageH = stored.pageHeight || 8;
          const elements = stored.elements || [];
          const rotatedCount = elements.filter((e: any) => Math.abs(e.rotationAngle || 0) >= 45).length;
          const isRotatedLabel = rotatedCount > elements.length * 0.4;

          // Keep canvas at original DRX dimensions (4"×8" portrait for Rx labels)
          const canvasW = rawPageW;
          const canvasH = rawPageH;

          // Zone-based layout: each label group maps to a specific Y zone on the canvas
          // This produces a clean, non-overlapping layout matching how DRX prints the label
          function layoutElements(els: any[]): TemplateField[] {
            if (!isRotatedLabel) {
              // Non-rotated label: use DRX coordinates directly
              return els.map((el: any, i: number) => {
                const fontPt = el.fontSize || 8;
                const text = el.exampleText || el.elementData || "";
                const pw = el.paragraphWidth || el.width;
                const charW = fontPt * 0.55 / 72;
                const w = pw ? pw * DPI : Math.max(text.length * charW * DPI, 24);
                return makeField(el, i, (el.xPosition || 0) * DPI, (el.yPosition || 0) * DPI, w, fontPt * 1.3);
              });
            }

            // Rotated label: group elements, then lay out each group in its own zone
            const groups: Record<string, any[]> = {};
            els.forEach((el: any) => {
              const g = el.labelGroup?.name || "UNGROUPED";
              if (!groups[g]) groups[g] = [];
              groups[g].push(el);
            });

            // Sort elements within each group by DRX X (row position), then by DRX Y (horizontal)
            Object.values(groups).forEach(g => g.sort((a: any, b: any) =>
              (b.xPosition || 0) - (a.xPosition || 0) || (a.yPosition || 0) - (b.yPosition || 0)
            ));

            // Define zones on a 4"×8" portrait canvas (384px wide × 768px tall)
            // Layout matches how DRX prints: MAIN LABEL top, AUX middle, BOTTOM LABEL below, then right-side groups
            const zoneStartY: Record<string, number> = {
              "MAIN LABEL": 0,
              "UNGROUPED": 0,
              "AUX": 160,
              "BOTTOM LABEL": 250,
              "Signature": 480,
              "Signature2": 480,
              "Patient Notes": 430,
              "Backtag": 560,
            };

            const zoneStartX: Record<string, number> = {
              "MAIN LABEL": 0,
              "UNGROUPED": 0,
              "AUX": 0,
              "BOTTOM LABEL": 0,
              "Signature": 0,
              "Signature2": 190,
              "Patient Notes": 0,
              "Backtag": 0,
            };

            const zoneMaxX: Record<string, number> = {
              "MAIN LABEL": 384,
              "UNGROUPED": 384,
              "AUX": 384,
              "BOTTOM LABEL": 384,
              "Signature": 190,
              "Signature2": 384,
              "Patient Notes": 384,
              "Backtag": 384,
            };

            const result: TemplateField[] = [];
            const groupOrder = ["MAIN LABEL", "UNGROUPED", "AUX", "BOTTOM LABEL", "Patient Notes", "Signature", "Signature2", "Backtag"];

            for (const groupName of groupOrder) {
              const groupEls = groups[groupName];
              if (!groupEls) continue;

              const baseY = zoneStartY[groupName] ?? 0;
              const baseX = zoneStartX[groupName] ?? 0;
              const maxX = zoneMaxX[groupName] ?? canvasW * DPI;

              // Track rows: group elements by their DRX X position (rounded to 0.1")
              let currentRow = -1;
              let rowY = baseY;
              let rowX = baseX;
              let lastDrxX = -999;
              let maxRowH = 0;

              for (const el of groupEls) {
                const drxX = el.xPosition || 0;
                const drxY = el.yPosition || 0;
                const fontPt = el.fontSize || 8;
                const text = el.exampleText || el.elementData || "";
                const isBarcode = el.displayBarcodeCode128;
                const isQR = el.displayBarcodeQr;

                // Determine if this is a new row (different DRX X position)
                const xDiff = Math.abs(drxX - lastDrxX);
                if (xDiff > 0.08) {
                  // New row
                  if (currentRow >= 0) rowY += maxRowH + 2;
                  currentRow++;
                  rowX = baseX;
                  maxRowH = 0;
                  lastDrxX = drxX;
                }

                let w: number, h: number;

                if (isBarcode) {
                  w = Math.min((el.height || 3) * DPI * 0.5, maxX - rowX);
                  h = 35;
                } else if (isQR) {
                  w = (el.width || 0.8) * DPI;
                  h = w;
                } else {
                  const pw = el.paragraphWidth;
                  const charW = fontPt * 0.55 / 72;
                  w = pw ? Math.min(pw * DPI, maxX - rowX) : Math.min(Math.max(text.length * charW * DPI, 20), maxX - rowX);
                  h = fontPt * 1.3;
                  if (pw && text.length > 30) h = fontPt * 2.5; // multi-line
                }

                // Ensure elements don't exceed zone width
                if (rowX + w > maxX) {
                  w = Math.max(20, maxX - rowX);
                }

                maxRowH = Math.max(maxRowH, h);
                result.push(makeField(el, result.length, rowX, rowY, w, h));

                rowX += w + 4; // 4px gap between elements in same row
              }
            }

            return result;
          }

          function makeField(el: any, i: number, x: number, y: number, w: number, h: number): TemplateField {
            const fontPt = el.fontSize || 8;
            const styleStr = (el.fontStyle || "").toLowerCase();
            return {
              id: `el_${el.id || i}`,
              type: el.displayBarcodeCode128 || el.displayBarcodeQr ? "barcode" as const
                : el.displayBase64Jpeg || el.base64Image ? "image" as const
                : "variable" as const,
              label: el.labelGroup?.name
                ? `(${el.labelGroup.name}) ${el.elementData || "Element"}`
                : el.elementData || `Element ${i + 1}`,
              x, y, width: w, height: h,
              fontSize: fontPt,
              fontWeight: styleStr.includes("bold") ? "bold" as const : "normal" as const,
              fontStyle: styleStr.includes("italic") ? "italic" as const : "normal" as const,
              textDecoration: "none" as const,
              textAlign: (el.textAlign || "left") as "left" | "center" | "right",
              value: el.elementData || "",
              rotation: 0,
              fontName: el.fontName,
              exampleText: el.exampleText,
              labelGroup: el.labelGroup?.name,
              forceUpperCase: el.forceUpperCase,
              maxTextLength: el.maxTextLength,
              paragraphWidth: el.paragraphWidth,
              joinMultipleWith: el.joinMultipleWith,
              formatting: el.formatting,
              ifElementData: el.ifElementData,
              ifDisplay: el.ifDisplay,
              truthyOverride: el.truthyOverride,
              falseyOverride: el.falseyOverride,
              color: el.color,
              fillColor: el.fillColor,
              textColor: el.textColor,
            };
          }

          const fields = layoutElements(elements);

          setTemplate({
            id: stored.id || templateId,
            name: stored.name || `Template ${templateId}`,
            width: canvasW,
            height: canvasH,
            type: stored.type || "Rx Label",
            fields,
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [templateId]);

  const selectedField = template.fields.find((f) => f.id === selectedFieldId) || null;

  const canvasWidth = template.width * DPI * zoom;
  const canvasHeight = template.height * DPI * zoom;

  // ─── Field manipulation ───────────────────────
  const updateField = useCallback((id: string, updates: Partial<TemplateField>) => {
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  }, []);

  const addField = useCallback((type: TemplateField["type"], value: string, label: string) => {
    const newField: TemplateField = {
      id: `f_${Date.now()}`,
      type,
      label,
      x: 20,
      y: 20,
      width: type === "line" ? 200 : type === "barcode" ? 180 : 150,
      height: type === "line" ? 1 : type === "barcode" ? 40 : 20,
      fontSize: 11,
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      value,
      rotation: 0,
    };
    setTemplate((prev) => ({ ...prev, fields: [...prev.fields, newField] }));
    setSelectedFieldId(newField.id);
  }, []);

  const deleteField = useCallback((id: string) => {
    setTemplate((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== id) }));
    if (selectedFieldId === id) setSelectedFieldId(null);
  }, [selectedFieldId]);

  const duplicateField = useCallback((id: string) => {
    const field = template.fields.find((f) => f.id === id);
    if (!field) return;
    const newField = { ...field, id: `f_${Date.now()}`, x: field.x + 10, y: field.y + 10 };
    setTemplate((prev) => ({ ...prev, fields: [...prev.fields, newField] }));
    setSelectedFieldId(newField.id);
  }, [template.fields]);

  // ─── Drag handling ────────────────────────────
  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    const field = template.fields.find((f) => f.id === fieldId);
    if (!field) return;
    setSelectedFieldId(fieldId);
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - field.x * zoom,
        y: e.clientY - rect.top - field.y * zoom,
      });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !selectedFieldId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, (e.clientX - rect.left - dragOffset.x) / zoom);
    const newY = Math.max(0, (e.clientY - rect.top - dragOffset.y) / zoom);
    updateField(selectedFieldId, { x: Math.round(newX), y: Math.round(newY) });
  }, [isDragging, selectedFieldId, dragOffset, zoom, updateField]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ─── Save ─────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/print-templates/save-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Template saved" });
    } catch {
      setMessage({ type: "error", text: "Failed to save template" });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render field on canvas ───────────────────
  function renderField(field: TemplateField) {
    const isSelected = selectedFieldId === field.id;
    const isBarcode = field.type === "barcode" || field.value.includes("barcode") || field.value.includes("qr_code");
    const isQR = field.value.includes("qr") || field.value.includes("patient_education");
    const isLine = field.type === "line";
    const isImage = field.type === "image";
    const hasRotation = field.rotation && field.rotation !== 0;

    // Display text: prefer example text for DRX variables, fall back to label
    const displayText = field.exampleText
      || (field.value.startsWith("{{") ? field.label : field.value)
      || field.label;

    // Apply uppercase if DRX says so
    const finalText = field.forceUpperCase ? displayText.toUpperCase() : displayText;

    // Determine if text should wrap (multiline) based on having paragraphWidth or long text
    const shouldWrap = field.paragraphWidth || finalText.length > 30;

    return (
      <div
        key={field.id}
        onMouseDown={(e) => handleMouseDown(e, field.id)}
        className={`absolute cursor-move select-none ${isSelected ? "ring-2 ring-[#40721D] ring-offset-1" : "hover:ring-1 hover:ring-blue-300"}`}
        style={{
          left: field.x * zoom,
          top: field.y * zoom,
          width: field.width * zoom,
          height: isLine ? Math.max(1, 1 * zoom) : shouldWrap ? "auto" : field.height * zoom,
          minHeight: isLine ? undefined : field.height * zoom,
          fontSize: field.fontSize * zoom,
          fontWeight: field.fontWeight,
          fontStyle: field.fontStyle,
          textDecoration: field.textDecoration,
          textAlign: field.textAlign as any,
          lineHeight: 1.2,
          overflow: "visible",
          background: isLine ? "#000" : isBarcode ? "#fff" : field.fillColor || "transparent",
          color: field.textColor || "#000",
          borderRadius: 0,
          padding: isBarcode ? `${2 * zoom}px` : 0,
          fontFamily: field.fontName ? `${field.fontName}, sans-serif` : "helvetica, arial, sans-serif",
          transform: hasRotation ? `rotate(${field.rotation}deg)` : undefined,
          transformOrigin: hasRotation ? "top left" : undefined,
          whiteSpace: shouldWrap ? "normal" : "nowrap",
          wordBreak: shouldWrap ? "break-word" as const : undefined,
          zIndex: isBarcode ? 5 : field.fontSize > 20 ? 10 : 1,
        }}
        title={`${field.labelGroup ? `[${field.labelGroup}] ` : ""}${field.value}${field.exampleText ? ` → "${field.exampleText}"` : ""}`}
      >
        {isBarcode && !isQR ? (
          <BarcodeRenderer value={displayText} width={field.width * zoom} height={field.height * zoom} />
        ) : isQR ? (
          <QRRenderer value={displayText} size={Math.min(field.width, field.height) * zoom} />
        ) : isImage ? (
          <div className="flex items-center justify-center w-full h-full bg-gray-50 border border-dashed border-gray-300 text-gray-400" style={{ fontSize: 8 * zoom }}>
            [Image]
          </div>
        ) : isLine ? null : (
          <span className="block" style={{ width: "100%" }}>
            {finalText}
          </span>
        )}
      </div>
    );
  }

  // ─── Barcode Renderer (Code128) ────────────────
  function BarcodeRenderer({ value, width, height }: { value: string; width: number; height: number }) {
    const svgRef = useRef<SVGSVGElement>(null);
    useEffect(() => {
      if (svgRef.current && typeof window !== "undefined") {
        import("jsbarcode").then((JsBarcode) => {
          try {
            JsBarcode.default(svgRef.current, value || "123456", {
              format: "CODE128",
              width: Math.max(1, width / 120),
              height: height * 0.7,
              displayValue: true,
              fontSize: Math.min(12, height * 0.15),
              margin: 2,
              textMargin: 1,
              background: "#ffffff",
              lineColor: "#000000",
            });
          } catch {
            // Fallback for invalid barcode values
            if (svgRef.current) {
              svgRef.current.innerHTML = `<text x="50%" y="50%" text-anchor="middle" font-size="10" fill="#999">Barcode</text>`;
            }
          }
        });
      }
    }, [value, width, height]);
    return <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />;
  }

  // ─── QR Code Renderer (simple placeholder) ─────
  function QRRenderer({ value, size }: { value: string; size: number }) {
    return (
      <div style={{ width: size, height: size, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid #ccc", background: "#fff" }}>
        <svg viewBox="0 0 100 100" width={size * 0.8} height={size * 0.8}>
          {/* Simple QR-like pattern */}
          <rect x="5" y="5" width="25" height="25" fill="#000" />
          <rect x="10" y="10" width="15" height="15" fill="#fff" />
          <rect x="13" y="13" width="9" height="9" fill="#000" />
          <rect x="70" y="5" width="25" height="25" fill="#000" />
          <rect x="75" y="10" width="15" height="15" fill="#fff" />
          <rect x="78" y="13" width="9" height="9" fill="#000" />
          <rect x="5" y="70" width="25" height="25" fill="#000" />
          <rect x="10" y="75" width="15" height="15" fill="#fff" />
          <rect x="13" y="78" width="9" height="9" fill="#000" />
          {/* Data area */}
          {Array.from({ length: 15 }).map((_, i) => (
            <rect key={i} x={35 + (i % 5) * 8} y={35 + Math.floor(i / 5) * 8} width="6" height="6" fill={i % 3 === 0 ? "#000" : "#fff"} />
          ))}
        </svg>
        <span style={{ fontSize: 7, color: "#999", marginTop: 2 }}>{value.substring(0, 15)}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-180px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#40721D] mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 rounded-t-xl">
        <div className="flex items-center gap-3">
          <Link href="/settings/print-templates" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={18} />
          </Link>
          <input
            type="text"
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 px-0"
            style={{ width: `${Math.max(200, template.name.length * 11)}px` }}
          />
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">{template.type}</span>
          <span className="text-xs text-gray-400">{template.width}" x {template.height}"</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="p-1 hover:bg-gray-200 rounded"><ZoomOut size={14} /></button>
            <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="p-1 hover:bg-gray-200 rounded"><ZoomIn size={14} /></button>
          </div>
          <button onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${showPreview ? "bg-[#40721D] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            <Eye size={14} /> Preview
          </button>
          <button onClick={handleSave} disabled={isSaving}
            className="px-4 py-1.5 bg-[#40721D] text-white rounded-lg text-sm font-medium hover:bg-[#2D5114] disabled:opacity-50 flex items-center gap-1.5">
            <Save size={14} /> {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-2 text-sm font-medium ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Field Palette */}
        <div className="w-56 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
          <div className="p-3 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Add Fields</p>
          </div>

          {/* Static fields */}
          <div className="p-2 border-b border-gray-100">
            <button onClick={() => addField("text", "Custom Text", "Text")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <Type size={14} className="text-gray-400" /> Static Text
            </button>
            <button onClick={() => addField("line", "", "Line")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <div className="w-3.5 h-px bg-gray-400" /> Horizontal Line
            </button>
            <button onClick={() => addField("box", "", "Box")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <div className="w-3 h-3 border border-gray-400 rounded-sm" /> Box/Border
            </button>
          </div>

          {/* Variable fields by category */}
          {CATEGORIES.map((cat) => (
            <div key={cat} className="border-b border-gray-100">
              <button
                onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50"
              >
                {cat}
                <ChevronDown size={12} className={`transition-transform ${expandedCategory === cat ? "rotate-180" : ""}`} />
              </button>
              {expandedCategory === cat && (
                <div className="pb-1">
                  {VARIABLE_FIELDS.filter((f) => f.category === cat).map((field) => (
                    <button
                      key={field.key}
                      onClick={() => addField(
                        field.key.includes("barcode") || field.key.includes("qr_code") ? "barcode" : "variable",
                        field.key,
                        field.label
                      )}
                      className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-gray-600 hover:bg-[#40721D]/5 hover:text-[#40721D]"
                    >
                      <Plus size={10} className="text-gray-300" />
                      {field.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 bg-gray-100 overflow-auto flex items-start justify-center p-8" onClick={() => setSelectedFieldId(null)}>
          <div
            ref={canvasRef}
            className="bg-white shadow-xl border border-gray-300 relative"
            style={{ width: canvasWidth, height: canvasHeight, minWidth: canvasWidth, minHeight: canvasHeight }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: `linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)`,
              backgroundSize: `${DPI * zoom / 4}px ${DPI * zoom / 4}px`,
              opacity: 0.5,
            }} />

            {/* Fields */}
            {template.fields.map(renderField)}
          </div>
        </div>

        {/* Right: Properties Panel */}
        <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
          {selectedField ? (
            <div>
              <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Properties</p>
                <div className="flex gap-1">
                  <button onClick={() => duplicateField(selectedField.id)} className="p-1 hover:bg-gray-100 rounded" title="Duplicate">
                    <Copy size={13} className="text-gray-400" />
                  </button>
                  <button onClick={() => deleteField(selectedField.id)} className="p-1 hover:bg-red-50 rounded" title="Delete">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              </div>
              <div className="p-3 space-y-3">
                {/* Label */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Label</label>
                  <input type="text" value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                </div>

                {/* Value (for text fields) */}
                {selectedField.type === "text" && (
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Text Content</label>
                    <textarea value={selectedField.value}
                      onChange={(e) => updateField(selectedField.id, { value: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm h-16 resize-none" />
                  </div>
                )}

                {/* Variable selector */}
                {selectedField.type === "variable" && (
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Variable</label>
                    <select value={selectedField.value}
                      onChange={(e) => {
                        const vf = VARIABLE_FIELDS.find((f) => f.key === e.target.value);
                        updateField(selectedField.id, { value: e.target.value, label: vf?.label || selectedField.label });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                      {VARIABLE_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Position */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-gray-400">X</label>
                      <input type="number" value={selectedField.x}
                        onChange={(e) => updateField(selectedField.id, { x: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-400">Y</label>
                      <input type="number" value={selectedField.y}
                        onChange={(e) => updateField(selectedField.id, { y: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono" />
                    </div>
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-gray-400">W</label>
                      <input type="number" value={selectedField.width}
                        onChange={(e) => updateField(selectedField.id, { width: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-400">H</label>
                      <input type="number" value={selectedField.height}
                        onChange={(e) => updateField(selectedField.id, { height: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono" />
                    </div>
                  </div>
                </div>

                {/* Typography */}
                {selectedField.type !== "line" && selectedField.type !== "barcode" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Font Size</label>
                      <input type="number" value={selectedField.fontSize} min={6} max={72}
                        onChange={(e) => updateField(selectedField.id, { fontSize: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Style</label>
                      <div className="flex gap-1">
                        <button onClick={() => updateField(selectedField.id, { fontWeight: selectedField.fontWeight === "bold" ? "normal" : "bold" })}
                          className={`p-1.5 rounded ${selectedField.fontWeight === "bold" ? "bg-[#40721D]/10 text-[#40721D]" : "hover:bg-gray-100 text-gray-400"}`}>
                          <Bold size={14} />
                        </button>
                        <button onClick={() => updateField(selectedField.id, { fontStyle: selectedField.fontStyle === "italic" ? "normal" : "italic" })}
                          className={`p-1.5 rounded ${selectedField.fontStyle === "italic" ? "bg-[#40721D]/10 text-[#40721D]" : "hover:bg-gray-100 text-gray-400"}`}>
                          <Italic size={14} />
                        </button>
                        <button onClick={() => updateField(selectedField.id, { textDecoration: selectedField.textDecoration === "underline" ? "none" : "underline" })}
                          className={`p-1.5 rounded ${selectedField.textDecoration === "underline" ? "bg-[#40721D]/10 text-[#40721D]" : "hover:bg-gray-100 text-gray-400"}`}>
                          <Underline size={14} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Alignment</label>
                      <div className="flex gap-1">
                        <button onClick={() => updateField(selectedField.id, { textAlign: "left" })}
                          className={`p-1.5 rounded ${selectedField.textAlign === "left" ? "bg-[#40721D]/10 text-[#40721D]" : "hover:bg-gray-100 text-gray-400"}`}>
                          <AlignLeft size={14} />
                        </button>
                        <button onClick={() => updateField(selectedField.id, { textAlign: "center" })}
                          className={`p-1.5 rounded ${selectedField.textAlign === "center" ? "bg-[#40721D]/10 text-[#40721D]" : "hover:bg-gray-100 text-gray-400"}`}>
                          <AlignCenter size={14} />
                        </button>
                        <button onClick={() => updateField(selectedField.id, { textAlign: "right" })}
                          className={`p-1.5 rounded ${selectedField.textAlign === "right" ? "bg-[#40721D]/10 text-[#40721D]" : "hover:bg-gray-100 text-gray-400"}`}>
                          <AlignRight size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="p-3 border-b border-gray-100 -mx-4 -mt-4 mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Template Settings</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Template Name</label>
                  <input type="text" value={template.name}
                    onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Type</label>
                  <select value={template.type}
                    onChange={(e) => setTemplate({ ...template, type: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                    <option>Rx Label</option>
                    <option>Batch</option>
                    <option>Register Receipt</option>
                    <option>Pull Cash</option>
                    <option>Daily Summary</option>
                    <option>Packing List</option>
                    <option>MAR</option>
                    <option>Package</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Width (in)</label>
                    <input type="number" step="0.25" value={template.width}
                      onChange={(e) => setTemplate({ ...template, width: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Height (in)</label>
                    <input type="number" step="0.25" value={template.height}
                      onChange={(e) => setTemplate({ ...template, height: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4">Click a field on the canvas to edit its properties. Drag fields to reposition.</p>
                <div className="text-xs text-gray-400 max-h-[400px] overflow-y-auto">
                  <p className="font-semibold mb-1 sticky top-0 bg-white py-1">Fields on canvas: {template.fields.length}</p>
                  {template.fields.map((f) => (
                    <div key={f.id}
                      className={`flex items-center gap-1.5 py-1 px-1 cursor-pointer rounded transition-colors ${selectedFieldId === f.id ? "bg-[#40721D]/10 text-[#40721D]" : "hover:bg-gray-100 hover:text-gray-600"}`}
                      onClick={() => setSelectedFieldId(f.id)}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedFieldId === f.id ? "bg-[#40721D]" : "bg-gray-300"}`} />
                      <div className="truncate flex-1 min-w-0">
                        <span className="truncate block">{f.labelGroup ? `[${f.labelGroup}] ` : ""}{f.value || f.label}</span>
                        {f.exampleText && (
                          <span className="truncate block text-[9px] text-gray-400">{f.exampleText}</span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-300 flex-shrink-0">{f.fontSize}pt</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
