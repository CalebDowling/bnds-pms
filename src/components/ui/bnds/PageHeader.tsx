"use client";

import type { ReactNode } from "react";

/**
 * BNDS PMS Redesign — page header pattern
 * eyebrow + serif h1 + subtitle + actions, matching the design's app-shell.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4"
      style={{ padding: "20px 24px 16px" }}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div
            className="text-[11px] font-semibold uppercase"
            style={{ color: "#7a8a78", letterSpacing: "0.12em" }}
          >
            {eyebrow}
          </div>
        )}
        <h1
          style={{
            fontFamily:
              "var(--font-serif), 'Source Serif 4', Georgia, serif",
            fontSize: 26,
            fontWeight: 500,
            color: "#0f2e1f",
            marginTop: eyebrow ? 4 : 0,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <div
            className="text-[13px]"
            style={{ color: "#5a6b58", marginTop: 4 }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}

export default PageHeader;
