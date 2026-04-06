"use client";

import { useShortcuts } from "@/components/providers/KeyboardShortcutsProvider";
import { useEffect, useRef } from "react";

export default function ShortcutsModal() {
  const { showHelp, setShowHelp, shortcuts } = useShortcuts();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node)
      ) {
        setShowHelp(false);
      }
    };

    if (showHelp) {
      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [showHelp, setShowHelp]);

  if (!showHelp) return null;

  // Group shortcuts by category
  const grouped = shortcuts.reduce(
    (acc, shortcut) => {
      const category = shortcut.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(shortcut);
      return acc;
    },
    {} as Record<string, typeof shortcuts>
  );

  const categoryOrder = ["System", "Navigation", "Actions"];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h2>
            <button
              onClick={() => setShowHelp(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {categoryOrder.map((category) => {
            const items = grouped[category];
            if (!items || items.length === 0) return null;

            return (
              <div key={category} className="mb-6 last:mb-0">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between py-2"
                    >
                      <p className="text-sm text-gray-700">
                        {shortcut.description}
                      </p>
                      <kbd className="inline-block bg-gray-100 border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono font-semibold text-gray-700 whitespace-nowrap">
                        {shortcut.keyCombination}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 text-xs text-gray-500 text-center">
          Press <kbd className="inline-block bg-white border border-gray-300 rounded px-1.5 py-0.5 mx-1 font-mono">?</kbd> to toggle
        </div>
      </div>
    </div>
  );
}
