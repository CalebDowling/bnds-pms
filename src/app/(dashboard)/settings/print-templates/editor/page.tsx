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
          // DRX uses inches for positions. For -90° rotated elements on a portrait label:
          // DRX x = vertical position from left edge of label (0 = left, pageWidth = right)
          // DRX y = horizontal position along the label length (0 = top)
          // In the editor we render the label as portrait, so we need to map:
          //   editor x = drx y (horizontal position along length)
          //   editor y = drx x (vertical position, but measured from left)
          // For -90° rotation, text flows rightward from the (x,y) anchor point
          const pageW = stored.pageWidth || 4;
          const pageH = stored.pageHeight || 8;

          const fields: TemplateField[] = (stored.elements || []).map((el: any, i: number) => {
            const drxX = el.xPosition || 0;
            const drxY = el.yPosition || 0;
            const rot = el.rotationAngle || 0;
            const fontPt = el.fontSize || 10;
            const estChars = (el.exampleText || el.elementData || "").length || 10;

            let editorX: number, editorY: number, editorW: number, editorH: number;
            const lineH = fontPt * 1.3; // line height in pixels

            if (rot === -90 || rot === 270) {
              // Rotated -90°: DRX x = vertical row, DRX y = horizontal start
              // Text flows rightward from anchor, so width = remaining page length
              const remainingH = pageH - drxY;
              const textLenInches = el.paragraphWidth || Math.min(estChars * fontPt * 0.006, remainingH);
              editorX = drxY * DPI;
              editorY = (pageW - drxX) * DPI;
              // Clamp width so it doesn't exceed the canvas
              editorW = Math.min(textLenInches, remainingH) * DPI;
              editorH = lineH;
            } else if (rot === 90) {
              const remainingH = drxY; // text flows leftward
              const textLenInches = el.paragraphWidth || Math.min(estChars * fontPt * 0.006, remainingH);
              editorX = (pageH - drxY) * DPI;
              editorY = drxX * DPI;
              editorW = Math.min(textLenInches, pageH) * DPI;
              editorH = lineH;
            } else {
              // No rotation — direct mapping
              const remainingW = pageW - drxX;
              editorX = drxX * DPI;
              editorY = drxY * DPI;
              editorW = Math.min(el.width || estChars * fontPt * 0.006, remainingW) * DPI;
              editorH = (el.height || fontPt * 0.016) * DPI;
            }

            // Final clamp: ensure nothing goes past canvas edge
            const maxX = pageW * DPI;
            const maxY = pageH * DPI;
            if (editorX + editorW > maxX) editorW = Math.max(20, maxX - editorX);
            if (editorY < 0) editorY = 0;
            if (editorY + editorH > maxY) editorH = Math.max(10, maxY - editorY);

            const style = (el.fontStyle || "").toLowerCase();
            const isBold = style.includes("bold");
            const isItalic = style.includes("italic");

            return {
              id: `el_${el.id || i}`,
              type: el.displayBarcodeCode128 || el.displayBarcodeQr ? "barcode" as const
                : el.displayBase64Jpeg || el.base64Image ? "image" as const
                : "variable" as const,
              label: el.labelGroup?.name
                ? `(${el.labelGroup.name}) ${el.elementData || "Element"}`
                : el.elementData || `Element ${i + 1}`,
              x: editorX,
              y: editorY,
              width: editorW,
              height: editorH,
              fontSize: fontPt,
              fontWeight: isBold ? "bold" as const : "normal" as const,
              fontStyle: isItalic ? "italic" as const : "normal" as const,
              textDecoration: "none" as const,
              textAlign: (el.textAlign || "left") as "left" | "center" | "right",
              value: el.elementData || "",
              rotation: 0, // We've already transformed the coordinates, no CSS rotation needed
              // Preserve DRX-specific data
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
          });

          setTemplate({
            id: stored.id || templateId,
            name: stored.name || `Template ${templateId}`,
            width: stored.pageWidth || 4,
            height: stored.pageHeight || 8,
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
    const isLine = field.type === "line";
    const isImage = field.type === "image";
    const hasRotation = field.rotation && field.rotation !== 0;

    // Display text: prefer example text for DRX variables, fall back to label
    const displayText = field.exampleText
      || (field.value.startsWith("{{") ? field.label : field.value)
      || field.label;

    // Apply uppercase if DRX says so
    const finalText = field.forceUpperCase ? displayText.toUpperCase() : displayText;

    return (
      <div
        key={field.id}
        onMouseDown={(e) => handleMouseDown(e, field.id)}
        className={`absolute cursor-move select-none ${isSelected ? "ring-2 ring-[#40721D] ring-offset-1" : "hover:ring-1 hover:ring-blue-300"}`}
        style={{
          left: field.x * zoom,
          top: field.y * zoom,
          width: field.width * zoom,
          height: isLine ? Math.max(1, 1 * zoom) : field.height * zoom,
          fontSize: field.fontSize * zoom,
          fontWeight: field.fontWeight,
          fontStyle: field.fontStyle,
          textDecoration: field.textDecoration,
          textAlign: field.textAlign as any,
          lineHeight: 1.2,
          overflow: "hidden",
          background: isLine ? "#000" : isBarcode ? "#f3f4f6" : field.fillColor || "transparent",
          color: field.textColor || (field.value.startsWith("{{") ? "#40721D" : "#000"),
          borderRadius: isBarcode ? 2 : 0,
          display: "flex",
          alignItems: isBarcode ? "center" : "flex-start",
          justifyContent: field.textAlign === "center" ? "center" : field.textAlign === "right" ? "flex-end" : "flex-start",
          padding: isBarcode ? `0 ${4 * zoom}px` : 0,
          fontFamily: field.fontName || "helvetica, sans-serif",
          transform: hasRotation ? `rotate(${field.rotation}deg)` : undefined,
          transformOrigin: hasRotation ? "top left" : undefined,
          whiteSpace: "nowrap",
        }}
        title={`${field.labelGroup ? `[${field.labelGroup}] ` : ""}${field.value}${field.exampleText ? ` → "${field.exampleText}"` : ""}`}
      >
        {isBarcode ? (
          <div className="flex flex-col items-center justify-center w-full" style={{ fontSize: 8 * zoom }}>
            <div className="flex gap-px" style={{ height: field.height * zoom * 0.6 }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} style={{ width: Math.max(1, zoom), background: i % 3 === 0 ? "#000" : i % 2 === 0 ? "#000" : "#fff", height: "100%" }} />
              ))}
            </div>
            <span className="text-gray-500 mt-0.5" style={{ fontSize: 7 * zoom }}>{field.label}</span>
          </div>
        ) : isImage ? (
          <div className="flex items-center justify-center w-full h-full bg-gray-100 border border-gray-300 text-gray-400" style={{ fontSize: 8 * zoom }}>
            IMG
          </div>
        ) : isLine ? null : (
          <span className="w-full block" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {finalText}
          </span>
        )}
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
