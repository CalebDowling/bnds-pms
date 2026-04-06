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
  rotation?: number;    // degrees (0=horizontal, 90=vertical CW, -90=vertical CCW)
  barcodeWidth?: number;  // barcode width in points (from PDF renderer)
  barcodeHeight?: number; // barcode height in points (from PDF renderer)
  qrSize?: number;        // QR code size in points (from PDF renderer)
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

// ─── Barcode / QR pattern components ──────────────────────────────

/**
 * Renders a realistic Code128-style barcode pattern using the value
 * to seed variable-width bars (purely visual — not scannable).
 */
function BarcodePattern({ width, height, value }: { width: number; height: number; value: string }) {
  // Generate deterministic bar widths from the value string
  const bars: { x: number; w: number }[] = [];
  let x = 1;
  const seed = value || "barcode";
  let i = 0;

  // Start guard pattern
  bars.push({ x, w: 1 }); x += 2;
  bars.push({ x, w: 1 }); x += 2;

  while (x < width - 4) {
    const charCode = seed.charCodeAt(i % seed.length);
    i++;
    // Alternate between narrow (1px) and wide (2px) bars with variable gaps
    const barW = ((charCode % 3) === 0) ? 2 : 1;
    const gap = ((charCode % 5) < 2) ? 1 : 2;
    bars.push({ x, w: barW });
    x += barW + gap;
  }

  // End guard pattern
  bars.push({ x: width - 3, w: 1 });
  bars.push({ x: width - 1, w: 1 });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width={width} height={height} fill="#fff" />
      {bars.map((bar, idx) => (
        <rect key={idx} x={bar.x} y={0} width={bar.w} height={height} fill="#000" />
      ))}
    </svg>
  );
}

/**
 * Renders just the barcode bar <rect> elements (no wrapping <svg>),
 * for use inside a rotated <g> group for vertical barcodes.
 */
function BarcodePatternBars({ width, height, value }: { width: number; height: number; value: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 1;
  const seed = value || "barcode";
  let i = 0;

  bars.push({ x, w: 1 }); x += 2;
  bars.push({ x, w: 1 }); x += 2;

  while (x < width - 4) {
    const charCode = seed.charCodeAt(i % seed.length);
    i++;
    const barW = ((charCode % 3) === 0) ? 2 : 1;
    const gap = ((charCode % 5) < 2) ? 1 : 2;
    bars.push({ x, w: barW });
    x += barW + gap;
  }

  bars.push({ x: width - 3, w: 1 });
  bars.push({ x: width - 1, w: 1 });

  return (
    <>
      <rect x="0" y="0" width={width} height={height} fill="#fff" />
      {bars.map((bar, idx) => (
        <rect key={idx} x={bar.x} y={0} width={bar.w} height={height} fill="#000" />
      ))}
    </>
  );
}

/**
 * Renders a QR-code-like grid pattern (purely visual — not scannable).
 */
function QRPattern({ size }: { size: number }) {
  const cellCount = 21; // Standard QR is 21×21 minimum
  const cellSize = size / cellCount;
  const cells: { x: number; y: number }[] = [];

  // Finder patterns (3 corners)
  const addFinder = (ox: number, oy: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          cells.push({ x: ox + c, y: oy + r });
        }
      }
    }
  };
  addFinder(0, 0);
  addFinder(cellCount - 7, 0);
  addFinder(0, cellCount - 7);

  // Fill some data cells with a pseudo-random pattern
  for (let r = 0; r < cellCount; r++) {
    for (let c = 0; c < cellCount; c++) {
      // Skip finder areas
      if ((r < 8 && c < 8) || (r < 8 && c >= cellCount - 8) || (r >= cellCount - 8 && c < 8)) continue;
      if ((r + c * 3) % 5 < 2) {
        cells.push({ x: c, y: r });
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${cellCount} ${cellCount}`} xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width={cellCount} height={cellCount} fill="#fff" />
      {cells.map((cell, idx) => (
        <rect key={idx} x={cell.x} y={cell.y} width={1} height={1} fill="#000" />
      ))}
    </svg>
  );
}

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

    // Barcode — render with PDF-matching dimensions, supports rotation
    if (field.isBarcode) {
      const bcWidth = field.barcodeWidth || 65;   // width of barcode in pts
      const bcHeight = field.barcodeHeight || 22;  // height of barcode in pts
      const rot = field.rotation ?? 0;
      const isVert = rot === 90 || rot === -90;

      // For vertical barcodes, swap displayed width/height
      const displayW = isVert ? bcHeight : bcWidth;
      const displayH = isVert ? bcWidth : bcHeight;

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
            padding: "1px",
            background: isSelected ? "rgba(22,163,74,0.04)" : "transparent",
          }}
          onMouseDown={(e) => handleMouseDown(e, field)}
          onMouseEnter={() => setHoveredFieldId(field.id)}
          onMouseLeave={() => setHoveredFieldId(null)}
        >
          <div>
            {/* Barcode bars — realistic variable-width pattern */}
            <div style={{
              width: displayW,
              height: displayH,
              background: "#fff",
              position: "relative",
              overflow: "hidden",
            }}>
              {isVert ? (
                /* Render horizontal barcode rotated 90° via SVG transform */
                <svg width={displayW} height={displayH} viewBox={`0 0 ${displayW} ${displayH}`} xmlns="http://www.w3.org/2000/svg">
                  <g transform={`translate(${displayW}, 0) rotate(90)`}>
                    <BarcodePatternBars width={displayH} height={displayW} value={field.value || field.label} />
                  </g>
                </svg>
              ) : (
                <BarcodePattern width={displayW} height={displayH} value={field.value || field.label} />
              )}
            </div>
            {/* Value text */}
            {isVert ? (
              <div style={{ fontSize: Math.min(4, bcHeight * 0.15), color: "#000", textAlign: "center", marginTop: 1, fontFamily: "monospace", writingMode: "vertical-rl", transform: "rotate(180deg)", height: displayH * 0.6, overflow: "hidden" }}>
                {field.value || field.label}
              </div>
            ) : (
              <div style={{ fontSize: Math.min(5, bcHeight * 0.2), color: "#000", textAlign: "center", marginTop: 0.5, fontFamily: "monospace", letterSpacing: "0.5px" }}>
                {field.value || field.label}
              </div>
            )}
          </div>
        </div>
      );
    }

    // QR code — render with PDF-matching dimensions
    if (field.isQrCode) {
      const qrSize = field.qrSize || 54; // PDF default: 0.75" = 54pt

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
            padding: "1px",
            background: isSelected ? "rgba(22,163,74,0.04)" : "transparent",
          }}
          onMouseDown={(e) => handleMouseDown(e, field)}
          onMouseEnter={() => setHoveredFieldId(field.id)}
          onMouseLeave={() => setHoveredFieldId(null)}
        >
          <QRPattern size={qrSize} />
        </div>
      );
    }

    // Text field — auto-wraps when maxWidth is set
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
          whiteSpace: field.maxWidth ? "pre-wrap" : "nowrap",
          wordBreak: field.maxWidth ? "break-word" : undefined,
          overflowWrap: field.maxWidth ? "break-word" : undefined,
          maxWidth: field.maxWidth || undefined,
          width: field.maxWidth || undefined,
          overflow: "hidden",
          textOverflow: field.maxWidth ? undefined : "ellipsis",
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

        {/* Barcode controls */}
        {field.isBarcode && (
          <>
            <div>
              <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
                Rotation
              </label>
              <select
                value={field.rotation ?? 90}
                onChange={(e) => onUpdate(field.id, { rotation: parseInt(e.target.value, 10) })}
                className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)] bg-white"
              >
                <option value={0}>Horizontal (0°)</option>
                <option value={90}>Vertical CW (90°)</option>
                <option value={-90}>Vertical CCW (-90°)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
                  Bar Width (px)
                </label>
                <input
                  type="number"
                  step={1}
                  min={5}
                  max={60}
                  value={field.barcodeWidth ?? 18}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) onUpdate(field.id, { barcodeWidth: val });
                  }}
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
                  Length (px)
                </label>
                <input
                  type="number"
                  step={5}
                  min={20}
                  max={300}
                  value={field.barcodeHeight ?? (field.maxWidth || 80)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) onUpdate(field.id, { barcodeHeight: val });
                  }}
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
                />
              </div>
            </div>
          </>
        )}

        {/* QR code size */}
        {field.isQrCode && (
          <div>
            <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5 uppercase tracking-wide">
              QR Size (px)
            </label>
            <input
              type="number"
              step={2}
              min={16}
              max={100}
              value={field.barcodeWidth ?? 24}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onUpdate(field.id, { barcodeWidth: val, barcodeHeight: val });
              }}
              className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--green-200)] focus:border-[var(--green-700)]"
            />
          </div>
        )}

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
