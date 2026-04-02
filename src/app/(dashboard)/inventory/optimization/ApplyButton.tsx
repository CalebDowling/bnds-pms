"use client";

import { useState, useTransition } from "react";
import { applyRecommendation } from "./actions";

interface ApplyButtonProps {
  itemId: string;
  reorderPoint: number;
  reorderQty: number;
}

export function ApplyButton({
  itemId,
  reorderPoint,
  reorderQty,
}: ApplyButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await applyRecommendation(itemId, reorderPoint, reorderQty);
        if (result.success) {
          setApplied(true);
        } else {
          setError(result.message);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to apply");
      }
    });
  }

  if (applied) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-[#40721D] bg-green-50 rounded-md">
        Applied
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-white bg-[#40721D] rounded-md hover:bg-[#2D5114] transition-colors disabled:opacity-50"
      >
        {isPending ? "Applying..." : "Apply"}
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
