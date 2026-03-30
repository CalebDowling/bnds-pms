"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { searchSigCodes, incrementSigCodeUsage } from "@/app/(dashboard)/prescriptions/sig-codes/actions";

type SigCode = {
  id: string;
  code: string;
  expansion: string;
  category: string;
  route: string | null;
  frequency: string | null;
};

interface SigCodePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  common: "bg-green-100 text-green-700",
  frequency: "bg-blue-100 text-blue-700",
  route: "bg-purple-100 text-purple-700",
  liquid: "bg-cyan-100 text-cyan-700",
  topical: "bg-orange-100 text-orange-700",
  ophthalmic: "bg-indigo-100 text-indigo-700",
  otic: "bg-pink-100 text-pink-700",
  inhalation: "bg-teal-100 text-teal-700",
  nasal: "bg-amber-100 text-amber-700",
  compound: "bg-violet-100 text-violet-700",
  injection: "bg-red-100 text-red-700",
};

export default function SigCodePicker({ value, onChange, placeholder, className }: SigCodePickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SigCode[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isPickerMode, setIsPickerMode] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Search sig codes when query changes
  const doSearch = useCallback(async (q: string) => {
    const codes = await searchSigCodes(q, 15);
    setResults(codes);
    setHighlightIndex(-1);
  }, []);

  useEffect(() => {
    if (!isPickerMode) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 150);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, isPickerMode, doSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setIsPickerMode(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(sig: SigCode) {
    onChange(sig.expansion);
    setShowDropdown(false);
    setIsPickerMode(false);
    setQuery("");
    // Increment usage count in background
    incrementSigCodeUsage(sig.id).catch(() => {});
    // Focus back to textarea
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Ctrl+Space or / at start triggers picker mode
    if ((e.ctrlKey && e.key === " ") || (e.key === "/" && value === "")) {
      e.preventDefault();
      setIsPickerMode(true);
      setShowDropdown(true);
      doSearch("");
      return;
    }

    if (!showDropdown || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setIsPickerMode(false);
      setQuery("");
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;

    if (isPickerMode) {
      // In picker mode, update the search query
      setQuery(val);
      setShowDropdown(true);
    } else {
      // Normal text editing mode
      onChange(val);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-sm font-medium text-gray-700">Directions (SIG)</label>
        <button
          type="button"
          onClick={() => {
            setIsPickerMode(!isPickerMode);
            setShowDropdown(!isPickerMode);
            if (!isPickerMode) {
              setQuery("");
              doSearch("");
            }
          }}
          className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-colors ${
            isPickerMode
              ? "bg-[#40721D] text-white border-[#40721D]"
              : "border-gray-300 text-gray-500 hover:bg-gray-50"
          }`}
          title="Toggle sig code lookup (Ctrl+Space)"
        >
          SIG CODES
        </button>
        <span className="text-[10px] text-gray-400">Ctrl+Space or / to search codes</span>
      </div>

      {isPickerMode ? (
        /* Picker mode: search input */
        <div className="relative">
          <div className="absolute left-3 top-2.5 text-gray-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a sig code or search directions..."
            autoFocus
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#40721D] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] bg-green-50"
          />
        </div>
      ) : (
        /* Normal mode: directions textarea */
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={placeholder || "Take 1 capsule by mouth twice daily... (press / or Ctrl+Space for sig codes)"}
          className={className || "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#40721D]"}
        />
      )}

      {/* Display current value when in picker mode */}
      {isPickerMode && value && (
        <div className="mt-1 px-3 py-1.5 bg-gray-50 rounded border border-gray-200 text-sm text-gray-600">
          Current: <span className="font-medium text-gray-900">{value}</span>
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && isPickerMode && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              No sig codes found. Try a different search.
            </div>
          ) : (
            <>
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                {results.length} sig code{results.length !== 1 ? "s" : ""} &middot; Enter to select
              </div>
              {results.map((sig, i) => (
                <button
                  key={sig.id}
                  type="button"
                  onClick={() => handleSelect(sig)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 transition-colors ${
                    i === highlightIndex ? "bg-green-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#40721D] bg-green-50 px-1.5 py-0.5 rounded text-xs shrink-0">
                      {sig.code}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                      CATEGORY_COLORS[sig.category] || "bg-gray-100 text-gray-600"
                    }`}>
                      {sig.category}
                    </span>
                    {sig.route && (
                      <span className="text-[9px] text-gray-400 font-mono shrink-0">{sig.route}</span>
                    )}
                    {sig.frequency && (
                      <span className="text-[9px] text-gray-400 font-mono shrink-0">{sig.frequency}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1 leading-snug">{sig.expansion}</p>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
