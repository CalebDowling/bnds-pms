"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

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
  }, [query]);

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
    />
  );
}
