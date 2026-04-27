"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

/**
 * SearchBar — debounced search input matching the BNDS PMS Redesign topbar
 * pattern: leading magnifier, ⌘K affordance, paper-warm border.
 */
export default function SearchBar({
  placeholder = "Search...",
  basePath,
}: {
  placeholder?: string;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip the initial mount to prevent unwanted navigation
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      // Parse basePath to separate path and existing params
      const [path, existingParams] = basePath.split("?");
      const params = new URLSearchParams(existingParams || "");

      // Merge current search params that aren't search or page
      // (preserve tab, status, etc. from the URL)
      searchParams.forEach((value, key) => {
        if (key !== "search" && key !== "page" && !params.has(key)) {
          params.set(key, value);
        }
      });

      if (query) {
        params.set("search", query);
        params.delete("page");
      } else {
        params.delete("search");
      }

      const paramStr = params.toString();
      router.push(paramStr ? `${path}?${paramStr}` : path);
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div
      className="inline-flex items-center gap-2 rounded-md w-full sm:min-w-[280px]"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #d9d2c2",
        padding: "6px 10px",
      }}
    >
      <Search size={14} style={{ color: "#7a8a78" }} strokeWidth={2} />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border-none bg-transparent outline-none"
        style={{
          fontSize: 13,
          color: "#0f2e1f",
          fontFamily:
            "var(--font-inter), 'Inter Tight', Inter, system-ui, sans-serif",
        }}
      />
    </div>
  );
}
