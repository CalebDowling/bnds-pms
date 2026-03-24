"use client";

import { useState, useCallback, useRef } from "react";
import { GripVertical, Eye, EyeOff } from "lucide-react";

interface DraggableCardGridProps {
  children: React.ReactNode[];
  cardIds: string[];
}

const STORAGE_KEY = "dashboard-card-order";

function getStoredOrder(ids: string[]): { order: string[]; hidden: Set<string> } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        order: parsed.order || ids,
        hidden: new Set(parsed.hidden || []),
      };
    }
  } catch {}
  return { order: ids, hidden: new Set() };
}

function saveOrder(order: string[], hidden: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, hidden: [...hidden] }));
}

export default function DraggableCardGrid({ children, cardIds }: DraggableCardGridProps) {
  const stored = getStoredOrder(cardIds);
  const [order, setOrder] = useState<string[]>(stored.order);
  const [hidden, setHidden] = useState<Set<string>>(stored.hidden);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const dragRef = useRef<number | null>(null);

  // Build a map of id -> child
  const childMap = new Map<string, React.ReactNode>();
  cardIds.forEach((id, i) => {
    childMap.set(id, children[i]);
  });

  // Ensure all IDs are represented (handle new cards not in stored order)
  const visibleOrder = order.filter((id) => cardIds.includes(id) && !hidden.has(id));
  const missingIds = cardIds.filter((id) => !order.includes(id));
  const fullOrder = [...visibleOrder, ...missingIds.filter((id) => !hidden.has(id))];

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
    dragRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  }, []);

  const handleDrop = useCallback((dropIndex: number) => {
    if (dragRef.current === null || dragRef.current === dropIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }

    const newOrder = [...fullOrder];
    const [moved] = newOrder.splice(dragRef.current, 1);
    newOrder.splice(dropIndex, 0, moved);

    setOrder(newOrder);
    saveOrder(newOrder, hidden);
    setDragIndex(null);
    setOverIndex(null);
  }, [fullOrder, hidden]);

  const toggleHidden = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveOrder(order, next);
      return next;
    });
  };

  const resetOrder = () => {
    setOrder(cardIds);
    setHidden(new Set());
    saveOrder(cardIds, new Set());
    setShowSettings(false);
  };

  return (
    <div>
      {/* Settings toggle */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1"
        >
          <GripVertical size={12} />
          {showSettings ? "Done" : "Customize"}
        </button>
      </div>

      {/* Card visibility settings */}
      {showSettings && (
        <div className="mb-4 p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Show/Hide Cards
            </span>
            <button
              onClick={resetOrder}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              Reset to default
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {cardIds.map((id) => (
              <button
                key={id}
                onClick={() => toggleHidden(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  hidden.has(id)
                    ? "bg-gray-100 text-gray-400"
                    : "bg-[var(--green-50)] text-[var(--color-primary)]"
                }`}
              >
                {hidden.has(id) ? <EyeOff size={12} /> : <Eye size={12} />}
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Draggable grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 mobile-stack">
        {fullOrder.map((id, index) => {
          const child = childMap.get(id);
          if (!child) return null;

          return (
            <div
              key={id}
              draggable={showSettings}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              className={`relative transition-all ${
                dragIndex === index ? "dragging" : ""
              } ${overIndex === index && dragIndex !== index ? "drag-over" : ""}`}
              style={{ cursor: showSettings ? "grab" : undefined }}
            >
              {showSettings && (
                <div className="absolute top-2 right-2 z-10 drag-handle">
                  <GripVertical size={16} />
                </div>
              )}
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}
