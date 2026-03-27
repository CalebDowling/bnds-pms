"use client";

import { useRef, useState, useCallback, useEffect } from "react";

// ─── Types ─────────────────────────────────────────────────────────

export interface LabelField {
  id: string;
  label: string;
  value: string;
  x: number;            // position in points (0-width)
  y: number;            // position in points (0-height)
  fontSize: number;     // in points
  bold: boolean;
  maxWidth?: number;    // in points
  isBarcode?: boolean;
  isQrCode?: boolean;
}

export interface InteractiveLabelCanvasProps {
  fields: LabelField[];
  width: number;        // label width in points (e.g. 576 for 8")
  height: number;       // label height in points (e.g. 288 for 4")
  onFieldMove: (fieldId: string, newX: number, newY: number) => void;
  onFieldUpdate: (fieldId: string, updates: Partial<LabelField>) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string | null) => void;
  sections?: SectionDef[];
}

export interface SectionDef {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const ZOOM_LEVELS = [0.75, 1, 1.5] as const;
const GRID_SPACING = 36; // 0.5" in points
const SNAP_PX = 2;
const PTS_PER_INCH = 72;

// ─── Component ─────────────────────────────────────────────────────

export default function InteractiveLabelCanvas({
  fields,
  width,
  height,
  onFieldMove,
  onFieldUpdate,
  selectedFieldId,
  onSelectField,
  sections,
}: InteractiveLabelCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [dragState, setDragState] = useState<{
    fieldId: string;
    startX: number;
    startY: number;
    origFieldX: number;
    origFieldY: number;
    hasMoved: boolean;
  } | null>(null);
  const [hoveredFieldId, setHoveredFieldId] = useState<string | null>(null);

  // Snap to nearest SNAP_PX points
  const snap = (v: number) => Math.round(v / SNAP_PX) * SNAP_PX;

  // Clamp within canvas bounds
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  // ── Drag handlers ───────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, field: LabelField) => {
      e.preventDefault();
      e.stopPropagation();
      setDragState({
        fieldId: field.id,
        startX: e.clientX,
        startY: e.clientY,
        origFieldX: field.x,
        origFieldY: field.y,
        hasMoved: false,
      });
    },
    []
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragState((prev) => {
        if (!prev) return null;
        const dx = (e.clientX - prev.startX) / zoom;
        const dy = (e.clientY - prev.startY) / zoom;
        const hasMoved = prev.hasMoved || Math.abs(dx) > 2 || Math.abs(dy) > 2;
        if (!hasMoved) return prev;

        const newX = snap(clamp(prev.origFieldX + dx, 0, width - 10));
        const newY = snap(clamp(prev.origFieldY + dy, 0, height - 10));
        onFieldMove(prev.fieldId, newX, newY);
        return { ...prev, hasMoved };
      });
    };

    const handleMouseUp = () => {
      if (dragState && !dragState.hasMoved) {
        onSelectField(dragState.fieldId);
      }
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, zoom, width, height, onFieldMove, onSelectField]);

  // Click on canvas background deselects
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasBg === "true") {
        onSelectField(null);
      }
    },
    [onSelectField]
  );

  // ── Grid lines ──────────────────────────────────────────────────

  const gridLines: React.ReactNode[] = [];
  // Vertical
  for (let x = GRID_SPACING; x < width; x += GRID_SPACING) {
    gridLines.push(
      <div
        key={`gv-${x}`}
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: x,
          width: 0,
          borderLeft: "1px dotted rgba(0,0,0,0.08)",
        }}
      />
    );
  }
  // Horizontal
  for (let y = GRID_SPACING; y < height; y += GRID_SPACING) {
    gridLines.push(
      <div
        key={`gh-${y}`}
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: y,
          height: 0,
          borderTop: "1px dotted rgba(0,0,0,0.08)",
        }}
      />
    );
  }

  // ── Section overlays ────────────────────────────────────────────

  const sectionOverlays: React.ReactNode[] = (sections || []).map((sec) => (
    <div key={sec.label} className="absolute pointer-events-none" style={{ left: sec.x, top: sec.y, width: sec.w, height: sec.h }}>
      {/* Section label */}
      <span
        className="absolute text-[8px] font-bold uppercase tracking-widest pointer-events-none select-none"
        style={{
          top: 2,
          left: 4,
          color: "rgba(0,0,0,0.12)",
          letterSpacing: "0.12em",
        }}
      >
        {sec.label}
      </span>
    </div>
  ));

  // Section separator lines
  const sectionSeparators: React.ReactNode[] = [];
  if (sections && sections.length > 1) {
    // Collect unique boundaries for separators
    const hLines = new Set<number>();
    const vLines = new Set<number>();
    for (const sec of sections) {
      if (sec.x > 0) vLines.add(sec.x);
      if (sec.y > 0) hLines.add(sec.y);
    }
    hLines.forEach((y) =>
      sectionSeparators.push(
        <div
          key={`sep-h-${y}`}
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: y, height: 0, borderTop: "1px solid rgba(0,0,0,0.15)" }}
        />
      )
    );
    vLines.forEach((x) =>
      sectionSeparators.push(
        <div
          key={`sep-v-${x}`}
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: x, width: 0, borderLeft: "1px solid rgba(0,0,0,0.15)" }}
        />
      )
    );
  }

  // ── Field rendering ─────────────────────────────────────────────

  const renderField = (field: LabelField) => {
    const isSelected = field.id === selectedFieldId;
    const isHovered = field.id === hoveredFieldId;
    const isDragging = dragState?.fieldId === field.id && dragState.hasMoved;

    let borderColor = "transparent";
    if (isSelected) borderColor = "#16a34a"; // green-600
    else if (isHovered) borderColor = "#3b82f6"; // blue-500

    // Barcode placeholder
    if (field.isBarcode) {
      return (
        <div
          key={field.id}
          className="absolute cursor-move select-none"
          style={{
            left: field.x,
            top: field.y,
            outline: `1.5px solid ${borderColor}`,
            outlineOffset: 1,
            opacity: isDragging ? 0.7 : 1,
            zIndex: isSelected ? 20 : isDragging ? 15 : 10,
            padding: "2px 4px",
            background: isSelected ? "rgba(22,163,74,0.04)" : "transparent",
          }}
          onMouseDown={(e) => handleMouseDown(e, field)}
          onMouseEnter={() => setHoveredFieldId(field.id)}
          onMouseLeave={() => setHoveredFieldId(null)}
        >
          <div
            style={{
              width: field.maxWidth || 120,
              height: 20,
              background: "repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px)",
            }}
          />
          <div style={{ fontSize: 6, color: "#666", textAlign: "center", marginTop: 1 }}>
            {field.value || field.label}
          </div>
        </div>
      );
    }

    // QR code placeholder
    if (field.isQrCode) {
      return (
        <div
          key={field.id}
          className="absolute cursor-move select-none"
          style={{
            left: field.x,
            top: field.y,
            outline: `1.5px solid ${borderColor}`,
            outlineOffset: 1,
            opacity: isDragging ? 0.7 : 1,
            zIndex: isSelected ? 20 : isDragging ? 15 : 10,
            padding: "2px",
            background: isSelected ? "rgba(22,163,74,0.04)" : "transparent",
          }}
          onMouseDown={(e) => handleMouseDown(e, field)}
          onMouseEnter={() => setHoveredFieldId(field.id)}
          onMouseLeave={() => setHoveredFieldId(null)}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: "1px solid #000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
              fontWeight: "bold",
              background: "#fff",
            }}
          >
            QR
          </div>
        </div>
      );
    }

    // Text field
    return (
      <div
        key={field.id}
        className="absolute cursor-move select-none"
        style={{
          left: field.x,
          top: field.y,
          fontSize: field.fontSize,
          fontWeight: field.bold ? 700 : 400,
          fontFamily: "Helvetica, Arial, sans-serif",
          lineHeight: 1.2,
          whiteSpace: field.maxWidth ? "normal" : "nowrap",
          maxWidth: field.maxWidth || undefined,
          width: field.maxWidth || undefined,
          overflow: "hidden",
          outline: `1.5px solid ${borderColor}`,
          outlineOffset: 1,
          opacity: isDragging ? 0.7 : 1,
          zIndex: isSelected ? 20 : isDragging ? 15 : 10,
          padding: "0 1px",
          background: isSelected ? "rgba(22,163,74,0.04)" : "transparent",
          color: "#000",
        }}
        onMouseDown={(e) => handleMouseDown(e, field)}
        onMouseEnter={() => setHoveredFieldId(field.id)}
        onMouseLeave={() => setHoveredFieldId(null)}
      >
        {field.value || field.label}
      </div>
    );
  };

  // ── Ruler ticks (top & left) ────────────────────────────────────

  const rulerTicksTop: React.ReactNode[] = [];
  for (let i = 0; i <= width / PTS_PER_INCH; i++) {
    rulerTicksTop.push(
      <span
        key={`rt-${i}`}
        className="absolute text-[8px] text-gray-400 select-none"
        style={{ left: i * PTS_PER_INCH * zoom, top: 0 }}
      >
        {i}&quot;
      </span>
    );
  }

  const rulerTicksLeft: React.ReactNode[] = [];
  for (let i = 0; i <= height / PTS_PER_INCH; i++) {
    rulerTicksLeft.push(
      <span
        key={`rl-${i}`}
        className="absolute text-[8px] text-gray-400 select-none"
        style={{ top: i * PTS_PER_INCH * zoom, left: 2 }}
      >
        {i}&quot;
      </span>
    );
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar: zoom */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Zoom</span>
        {ZOOM_LEVELS.map((z) => (
          <button
            key={z}
            onClick={() => setZoom(z)}
            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
              zoom === z
                ? "bg-[var(--green-700)] text-white border-[var(--green-700)]"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {Math.round(z * 100)}%
          </button>
        ))}
        <span className="ml-2 text-[10px] text-gray-400">
          {width / PTS_PER_INCH}&quot; x {height / PTS_PER_INCH}&quot; &middot; {fields.length} fields
        </span>
      </div>

      {/* Canvas with rulers */}
      <div className="flex">
        {/* Left ruler */}
        <div className="relative w-5 flex-shrink-0" style={{ height: height * zoom + 20 }}>
          {rulerTicksLeft}
        </div>

        <div className="flex flex-col">
          {/* Top ruler */}
          <div className="relative h-4" style={{ width: width * zoom + 20 }}>
            {rulerTicksTop}
          </div>

          {/* Label canvas */}
          <div
            ref={canvasRef}
            className="relative bg-white border border-gray-300 shadow-md overflow-hidden"
            style={{
              width: width * zoom,
              height: height * zoom,
              cursor: dragState ? "grabbing" : "default",
            }}
            onClick={handleCanvasClick}
          >
            {/* Scaled inner container */}
            <div
              data-canvas-bg="true"
              className="absolute origin-top-left"
              style={{
                transform: `scale(${zoom})`,
                width,
                height,
              }}
              onClick={handleCanvasClick}
            >
              {/* Grid */}
              {gridLines}

              {/* Section separators */}
              {sectionSeparators}

              {/* Section labels */}
              {sectionOverlays}

              {/* Fields */}
              {fields.map(renderField)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Properties Panel ─────────────────────────────────────────────

export interface PropertiesPanelProps {
  field: LabelField | null;
  onUpdate: (fieldId: string, updates: Partial<LabelField>) => void;
  onResetPosition: (fieldId: string) => void;
  onDelete: (fieldId: string) => void;
  canvasWidth: number;
  canvasHeight: number;
}

export function PropertiesPanel({
  field,
  onUpdate,
  onResetPosition,
  onDelete,
  canvasWidth,
  canvasHeight,
}: PropertiesPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset confirmation when field changes
  useEffect(() => {
    setConfirmDelete(false);
  }, [field?.id]);

  if (!field) {
    return (
      <div className="bg-white rounded-lg border border-[var(--border)] p-4 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          Click a field on the label to view and edit its properties.
        </p>
      </div>
    );
  }

  const xInches = (field.x / 72).toFixed(3);
  const yInches = (field.y / 72).toFixed(3);

  return (
    <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-3 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">
          {field.label}
        </span>
        {field.isBarcode && (
          <span className="ml-2 text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">barcode</span>
        )}
        {field.isQrCode && (
          <span className="ml-2 text-[9px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">QR</span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Value */}
        <div>
          <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
            Value
          </label>
          <input
            type="text"
            value={field.value}
            onChange={(e) => onUpdate(field.id, { value: e.target.value })}
            className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
          />
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
              X (inches)
            </label>
            <input
              type="number"
              step={0.01}
              min={0}
              max={canvasWidth / 72}
              value={xInches}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) onUpdate(field.id, { x: Math.round(val * 72) });
              }}
              className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
              Y (inches)
            </label>
            <input
              type="number"
              step={0.01}
              min={0}
              max={canvasHeight / 72}
              value={yInches}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) onUpdate(field.id, { y: Math.round(val * 72) });
              }}
              className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
            />
          </div>
        </div>

        {/* Font size */}
        {!field.isBarcode && !field.isQrCode && (
          <>
            <div>
              <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
                Font Size (pt)
              </label>
              <input
                type="number"
                step={0.5}
                min={4}
                max={72}
                value={field.fontSize}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 4 && val <= 72) onUpdate(field.id, { fontSize: val });
                }}
                className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
              />
            </div>

            {/* Font weight */}
            <div>
              <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
                Style
              </label>
              <select
                value={field.bold ? "bold" : "normal"}
                onChange={(e) => onUpdate(field.id, { bold: e.target.value === "bold" })}
                className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)] bg-white"
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>
            </div>
          </>
        )}

        {/* Max width */}
        {field.maxWidth !== undefined && (
          <div>
            <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
              Max Width (pts)
            </label>
            <input
              type="number"
              step={1}
              min={10}
              max={canvasWidth}
              value={field.maxWidth || ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onUpdate(field.id, { maxWidth: val });
              }}
              className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
            />
          </div>
        )}

        {/* Position info */}
        <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">
          {field.x}pt, {field.y}pt &middot; {field.fontSize}pt {field.bold ? "bold" : "normal"}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onResetPosition(field.id)}
            className="flex-1 px-2 py-1.5 text-[10px] text-[var(--text-secondary)] border border-[var(--border)] rounded hover:bg-gray-50 transition-colors"
          >
            Reset Position
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex-1 px-2 py-1.5 text-[10px] text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          ) : (
            <button
              onClick={() => {
                onDelete(field.id);
                setConfirmDelete(false);
              }}
              className="flex-1 px-2 py-1.5 text-[10px] text-white bg-red-600 border border-red-600 rounded hover:bg-red-700 transition-colors"
            >
              Confirm Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
