"use client";

import type { ReactNode } from "react";

/**
 * KPI tile matching the BNDS PMS Redesign — eyebrow label, serif numeric,
 * optional hint and trend pill. Used on the Reports screen.
 */
export function KPI({
  label,
  value,
  hint,
  trend,
  tone = "forest",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: { dir: "up" | "down"; label: string };
  tone?: "forest" | "leaf" | "ok" | "warn" | "info" | "danger";
}) {
  const accent: Record<typeof tone, string> = {
    forest: "#1f5a3a",
    leaf: "#5aa845",
    ok: "#1f5a3a",
    warn: "#c98a14",
    info: "#2b6c9b",
    danger: "#b83a2f",
  } as Record<typeof tone, string>;

  return (
    <div
      className="rounded-lg"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e3ddd1",
        padding: "14px 16px",
      }}
    >
      <div
        className="text-[11px] font-semibold uppercase"
        style={{ color: "#7a8a78", letterSpacing: "0.12em" }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif), 'Source Serif 4', Georgia, serif",
          fontSize: 28,
          fontWeight: 500,
          color: accent[tone],
          marginTop: 6,
          letterSpacing: "-0.01em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {(hint || trend) && (
        <div className="flex items-center gap-2 mt-1.5">
          {trend && (
            <span
              className="inline-flex items-center gap-1"
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: trend.dir === "up" ? "#1f5a3a" : "#b83a2f",
              }}
            >
              {trend.dir === "up" ? "▲" : "▼"} {trend.label}
            </span>
          )}
          {hint && (
            <span style={{ fontSize: 12, color: "#7a8a78" }}>{hint}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default KPI;
