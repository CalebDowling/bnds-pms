"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

/**
 * SearchBarPlain — a "naked" search input (no surrounding pill / border /
 * magnifier). Designed to be dropped into a parent that already paints its
 * own toolbar chip, so the chip is one cohesive surface instead of a
 * pill-inside-a-pill.
 *
 * Debouncing + URL sync match SearchBar — preserves all non-search params
 * (filter, status, etc.) and resets `page=1` on a new query.
 */
export default function SearchBarPlain({
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
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      const [path, existingParams] = basePath.split("?");
      const params = new URLSearchParams(existingParams || "");

      // Preserve non-search params already in the URL (filter, tab, etc.).
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
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder={placeholder}
      className="flex-1 border-none bg-transparent outline-none w-full"
      style={{
        fontSize: 13,
        color: "#14201a",
        fontFamily:
          "var(--font-inter), 'Inter Tight', Inter, system-ui, sans-serif",
        minWidth: 0,
      }}
    />
  );
}
