"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Pill, Package, FlaskConical, Stethoscope, Loader2 } from "lucide-react";

interface SearchResult {
  type: "patient" | "prescription" | "item" | "formula" | "prescriber";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  patient: <Users size={14} />,
  prescription: <Pill size={14} />,
  item: <Package size={14} />,
  formula: <FlaskConical size={14} />,
  prescriber: <Stethoscope size={14} />,
};

const TYPE_COLORS: Record<string, string> = {
  patient: "#10b981",
  prescription: "#3b82f6",
  item: "#a855f7",
  formula: "#f43f5e",
  prescriber: "#f97316",
};

export default function DashboardSearch() {
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length >= 2) {
      setIsLoading(true);
      debounceRef.current = setTimeout(() => doSearch(value), 250);
    } else {
      setResults([]);
      setIsLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    setFocused(false);
    setQuery("");
    setResults([]);
    router.push(result.href);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = focused && (query.length >= 2 || results.length > 0);

  return (
    <div className="flex items-center justify-between bg-[var(--card-bg)] px-6 py-2.5 border-b border-[var(--border-light)]">
      <div ref={wrapperRef} className="flex-1 max-w-[600px] relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search size={15} />
        </span>
        <input
          ref={inputRef}
          className="search-animated w-full py-[9px] px-[14px] pl-9 border border-gray-200 rounded-xl text-[13px] text-[var(--text-secondary)] bg-[var(--card-bg)] font-[Inter,sans-serif] focus:outline-none focus:border-[#40721d]"
          placeholder="Search patients, Rx#, items, doctors..."
          autoComplete="off"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          aria-label="Search"
          aria-expanded={showDropdown}
          role="combobox"
          aria-autocomplete="list"
        />
        {isLoading ? (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <Loader2 size={14} className="animate-spin" />
          </span>
        ) : (
          <span className="kbd-badge absolute right-2.5 top-1/2 -translate-y-1/2 bg-gray-100 text-gray-400 border border-gray-200">
            Ctrl+K
          </span>
        )}

        {/* Results dropdown */}
        {showDropdown && (
          <div
            className="absolute top-[calc(100%+4px)] left-0 right-0 bg-[var(--card-bg)] border border-gray-200 rounded-xl z-[100] overflow-hidden"
            style={{ boxShadow: "var(--shadow-lg)" }}
            role="listbox"
          >
            {isLoading && results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                <Loader2 size={16} className="animate-spin inline mr-2" />
                Searching...
              </div>
            ) : results.length === 0 && query.length >= 2 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                No results for "{query}"
              </div>
            ) : (
              <div className="max-h-[340px] overflow-y-auto py-1">
                {results.map((result, i) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    role="option"
                    aria-selected={i === selectedIndex}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer transition-colors text-left ${
                      i === selectedIndex
                        ? "bg-[var(--green-50)]"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[result.type] || "#666" }}
                    >
                      {TYPE_ICONS[result.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                        {result.title}
                      </div>
                      {result.subtitle && (
                        <div className="text-[11px] text-[var(--text-muted)] truncate">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] flex-shrink-0">
                      {result.type}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
