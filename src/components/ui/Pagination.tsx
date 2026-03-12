"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function Pagination({
  total,
  pages,
  page,
  basePath,
}: {
  total: number;
  pages: number;
  page: number;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (pages <= 1) return null;

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", p.toString());
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
      <p className="text-sm text-gray-500">
        {total} result{total !== 1 ? "s" : ""} — Page {page} of {pages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= pages}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
