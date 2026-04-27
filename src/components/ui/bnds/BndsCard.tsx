"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Card / surface primitive matching the BNDS PMS Redesign — white card on
 * paper background with line border. Optional pad variant.
 */
export function BndsCard({
  children,
  className,
  pad,
  style,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-lg ${className ?? ""}`}
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e3ddd1",
        padding: pad ? 18 : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default BndsCard;
