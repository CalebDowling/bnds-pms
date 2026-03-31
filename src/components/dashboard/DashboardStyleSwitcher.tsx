"use client";

import { useState, useEffect } from "react";
import { List, BarChart3, LayoutGrid } from "lucide-react";

export type DashboardStyle = "worklist" | "analytics" | "command-center";

const STORAGE_KEY = "bnds-dashboard-style";

const styles: { id: DashboardStyle; label: string; icon: React.ReactNode }[] = [
  { id: "worklist", label: "Worklist", icon: <List size={15} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={15} /> },
  { id: "command-center", label: "Command Center", icon: <LayoutGrid size={15} /> },
];

export function useDashboardStyle(): [DashboardStyle, (v: DashboardStyle) => void] {
  const [style, setStyleState] = useState<DashboardStyle>("worklist");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as DashboardStyle | null;
      if (stored && ["worklist", "analytics", "command-center"].includes(stored)) {
        setStyleState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setStyle = (v: DashboardStyle) => {
    setStyleState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore
    }
  };

  return [style, setStyle];
}

export default function DashboardStyleSwitcher({
  current,
  onChange,
}: {
  current: DashboardStyle;
  onChange: (v: DashboardStyle) => void;
}) {
  return (
    <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
      {styles.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          title={s.label}
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
            ${current === s.id
              ? "bg-white dark:bg-gray-700 text-[var(--green-700)] dark:text-emerald-400 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }
          `}
        >
          {s.icon}
          <span className="hidden sm:inline">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
