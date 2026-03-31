"use client";

import { useState, useEffect } from "react";
import { Paintbrush } from "lucide-react";

export type LayoutOption = "A" | "B" | "C" | "D";

const STORAGE_KEY = "bnds-layout-option";

const layouts: { id: LayoutOption; name: string; description: string }[] = [
  { id: "A", name: "Light Sidebar", description: "White collapsible sidebar with grouped nav" },
  { id: "B", name: "Dark Sidebar", description: "Dark slate sidebar, modern SaaS feel" },
  { id: "C", name: "Top Navigation", description: "Horizontal nav bar with dropdown menus" },
  { id: "D", name: "Icon Rail", description: "Compact 60px icon bar with flyout panels" },
];

export function useLayoutOption(): [LayoutOption, (v: LayoutOption) => void] {
  const [option, setOptionState] = useState<LayoutOption>("A");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as LayoutOption | null;
      if (stored && ["A", "B", "C", "D"].includes(stored)) {
        setOptionState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setOption = (v: LayoutOption) => {
    setOptionState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore
    }
  };

  return [option, setOption];
}

export default function LayoutSwitcher({
  current,
  onChange,
}: {
  current: LayoutOption;
  onChange: (v: LayoutOption) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 mb-2">
            Layout Preview
          </div>
          {layouts.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                onChange(l.id);
                setOpen(false);
              }}
              className={`
                w-full text-left px-3 py-2.5 rounded-lg transition-colors
                ${current === l.id
                  ? "bg-[#40721d]/10 border border-[#40721d]/30 dark:bg-emerald-500/10 dark:border-emerald-500/30"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent"
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${current === l.id ? "bg-[#40721d] text-white dark:bg-emerald-500" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}>
                  {l.id}
                </span>
                <div>
                  <div className={`text-sm font-semibold ${current === l.id ? "text-[#40721d] dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                    {l.name}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">{l.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-[#40721d] hover:bg-[#365e17] text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center hover:scale-105"
        title="Switch layout"
      >
        <Paintbrush size={20} />
      </button>
    </div>
  );
}
