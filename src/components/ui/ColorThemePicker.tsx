"use client";

import { useState, useEffect } from "react";
import { Palette, Check } from "lucide-react";

const THEMES = [
  { id: "green", label: "Forest", color: "#40721D" },
  { id: "blue", label: "Ocean", color: "#2563eb" },
  { id: "purple", label: "Violet", color: "#7c3aed" },
  { id: "teal", label: "Teal", color: "#0d9488" },
  { id: "rose", label: "Rose", color: "#e11d48" },
  { id: "amber", label: "Amber", color: "#d97706" },
] as const;

type AccentId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "bnds-accent-theme";

export default function ColorThemePicker() {
  const [accent, setAccent] = useState<AccentId>("green");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as AccentId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setAccent(saved);
      document.documentElement.setAttribute("data-accent", saved);
    }
  }, []);

  function selectTheme(id: AccentId) {
    setAccent(id);
    localStorage.setItem(STORAGE_KEY, id);
    document.documentElement.setAttribute("data-accent", id);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors w-full"
        aria-label="Change accent color"
      >
        <Palette size={16} />
        <span>Theme Color</span>
        <span
          className="w-4 h-4 rounded-full ml-auto border border-gray-200"
          style={{ background: THEMES.find((t) => t.id === accent)?.color }}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 bg-[var(--card-bg)] rounded-xl border border-[var(--border-light)] shadow-lg p-3 min-w-[200px] z-50">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">
            Accent Color
          </p>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => selectTheme(theme.id)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label={`${theme.label} theme`}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
                  style={{
                    background: theme.color,
                    borderColor: accent === theme.id ? theme.color : "transparent",
                    boxShadow: accent === theme.id ? `0 0 0 3px ${theme.color}33` : "none",
                  }}
                >
                  {accent === theme.id && <Check size={14} color="white" strokeWidth={3} />}
                </span>
                <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                  {theme.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
