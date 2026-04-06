"use client";

import { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  GripVertical,
  BarChart3,
  Activity,
  Bell,
  Clock,
  TrendingUp,
  Package,
  Users,
  Pill,
  Minimize2,
  Maximize2,
} from "lucide-react";

// Widget registry
export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  icon: ReactNode;
  size: "sm" | "md" | "lg"; // 1col, 1col tall, 2col
  visible: boolean;
}

const WIDGET_TYPES = [
  { type: "queue-overview", title: "Queue Overview", icon: <Activity size={16} />, defaultSize: "md" as const },
  { type: "daily-chart", title: "Daily Fills Chart", icon: <BarChart3 size={16} />, defaultSize: "lg" as const },
  { type: "alerts", title: "Alerts & Notifications", icon: <Bell size={16} />, defaultSize: "sm" as const },
  { type: "recent-activity", title: "Recent Activity", icon: <Clock size={16} />, defaultSize: "md" as const },
  { type: "revenue-trend", title: "Revenue Trend", icon: <TrendingUp size={16} />, defaultSize: "lg" as const },
  { type: "low-stock", title: "Low Stock Items", icon: <Package size={16} />, defaultSize: "sm" as const },
  { type: "top-patients", title: "Top Patients", icon: <Users size={16} />, defaultSize: "sm" as const },
  { type: "rx-pipeline", title: "Rx Pipeline", icon: <Pill size={16} />, defaultSize: "md" as const },
];

const STORAGE_KEY = "dashboard-widgets";

function getDefaultWidgets(): WidgetConfig[] {
  return WIDGET_TYPES.map((w) => ({
    id: w.type,
    type: w.type,
    title: w.title,
    icon: w.icon,
    size: w.defaultSize,
    visible: true,
  }));
}

function loadWidgets(): WidgetConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Restore icons from registry
      return parsed.map((w: WidgetConfig) => {
        const reg = WIDGET_TYPES.find((t) => t.type === w.type);
        return { ...w, icon: reg?.icon || <BarChart3 size={16} /> };
      });
    }
  } catch {}
  return getDefaultWidgets();
}

function saveWidgets(widgets: WidgetConfig[]) {
  const serializable = widgets.map(({ icon, ...rest }) => rest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

interface WidgetSystemProps {
  renderWidget: (type: string, size: "sm" | "md" | "lg") => ReactNode;
}

export default function WidgetSystem({ renderWidget }: WidgetSystemProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [editing, setEditing] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWidgets(loadWidgets());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const visibleWidgets = widgets.filter((w) => w.visible);
  const hiddenWidgets = widgets.filter((w) => !w.visible);

  function toggleWidget(id: string) {
    setWidgets((prev) => {
      const next = prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
      saveWidgets(next);
      return next;
    });
  }

  function cycleSize(id: string) {
    const sizes: ("sm" | "md" | "lg")[] = ["sm", "md", "lg"];
    setWidgets((prev) => {
      const next = prev.map((w) => {
        if (w.id !== id) return w;
        const currentIdx = sizes.indexOf(w.size);
        return { ...w, size: sizes[(currentIdx + 1) % sizes.length] };
      });
      saveWidgets(next);
      return next;
    });
  }

  function resetWidgets() {
    const defaults = getDefaultWidgets();
    setWidgets(defaults);
    saveWidgets(defaults);
    setEditing(false);
  }

  function moveWidget(fromIdx: number, toIdx: number) {
    setWidgets((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      saveWidgets(next);
      return next;
    });
  }

  const sizeClasses = {
    sm: "col-span-1",
    md: "col-span-1 row-span-2",
    lg: "col-span-2",
  };

  return (
    <div>
      {/* Widget toolbar */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Widgets
        </h2>
        <div className="flex items-center gap-2">
          {editing && (
            <>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-white transition-colors"
                style={{ background: "var(--theme-accent, #40721d)" }}
              >
                <Plus size={12} /> Add
              </button>
              <button
                onClick={resetWidgets}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors"
              >
                Reset
              </button>
            </>
          )}
          <button
            onClick={() => { setEditing(!editing); setShowAddMenu(false); }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--theme-accent,var(--color-primary))] transition-colors flex items-center gap-1"
          >
            <GripVertical size={12} />
            {editing ? "Done" : "Customize"}
          </button>
        </div>
      </div>

      {/* Add widget dropdown */}
      <AnimatePresence>
        {showAddMenu && hiddenWidgets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="glass-card rounded-xl p-3">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Add Widget
              </p>
              <div className="flex flex-wrap gap-2">
                {hiddenWidgets.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <Plus size={12} />
                    {w.title}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <AnimatePresence mode="popLayout">
          {visibleWidgets.map((widget, index) => (
            <motion.div
              key={widget.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`glass-card rounded-xl overflow-hidden relative ${sizeClasses[widget.size]}`}
            >
              {/* Widget header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-light)]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  {widget.icon}
                  <span className="text-xs font-semibold">{widget.title}</span>
                </div>
                {editing && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cycleSize(widget.id)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title={`Size: ${widget.size}`}
                    >
                      {widget.size === "lg" ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    </button>
                    <button
                      onClick={() => toggleWidget(widget.id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Widget content */}
              <div className="p-3">
                {renderWidget(widget.type, widget.size)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
