"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const TYPE_ICONS: Record<string, string> = {
  patient: "👤",
  prescription: "💊",
  item: "📦",
  formula: "🧪",
  prescriber: "🩺",
};

const TYPE_COLORS: Record<string, string> = {
  patient: "bg-blue-100 text-blue-700",
  prescription: "bg-purple-100 text-purple-700",
  item: "bg-green-100 text-green-700",
  formula: "bg-orange-100 text-orange-700",
  prescriber: "bg-gray-100 text-gray-700",
};

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
        setOpen(true);
      } catch {} finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(href: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  }

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = ref.current?.querySelector("input");
        input?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div ref={ref} className="relative w-80">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search patients, Rx, inventory... (Ctrl+K)"
          className="w-full px-3 py-1.5 pl-8 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
        />
        <svg className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {loading && <span className="absolute right-2.5 top-2 text-xs text-gray-400">...</span>}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {results.map((r: any) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => handleSelect(r.href)}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-3"
            >
              <span className="text-base">{TYPE_ICONS[r.type] || "📋"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                {r.subtitle && <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>}
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[r.type] || "bg-gray-100 text-gray-600"}`}>
                {r.type}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-4 text-center">
          <p className="text-sm text-gray-400">No results for "{query}"</p>
        </div>
      )}
    </div>
  );
}
