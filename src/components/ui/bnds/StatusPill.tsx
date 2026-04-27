"use client";

import type { ReactNode } from "react";

export type StatusTone =
  | "ok"
  | "leaf"
  | "warn"
  | "danger"
  | "info"
  | "mute";

const TONE_BG: Record<StatusTone, string> = {
  ok: "rgba(90, 168, 69, 0.14)",
  leaf: "rgba(90, 168, 69, 0.14)",
  warn: "rgba(201, 138, 20, 0.14)",
  danger: "rgba(184, 58, 47, 0.12)",
  info: "rgba(43, 108, 155, 0.12)",
  mute: "#ece4d3",
};
const TONE_FG: Record<StatusTone, string> = {
  ok: "#1f5a3a",
  leaf: "#1f5a3a",
  warn: "#7a5a14",
  danger: "#9a2c1f",
  info: "#1f4a73",
  mute: "#5a6b58",
};
const DOT: Record<StatusTone, string> = {
  ok: "#5aa845",
  leaf: "#5aa845",
  warn: "#c98a14",
  danger: "#b83a2f",
  info: "#2b6c9b",
  mute: "#a3a89c",
};

/**
 * Pill matching the BNDS PMS Redesign system. Use `tone` to switch palette.
 */
export function StatusPill({
  tone = "mute",
  label,
  dot = true,
  icon,
  className,
  style,
}: {
  tone?: StatusTone;
  label: ReactNode;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        backgroundColor: TONE_BG[tone],
        color: TONE_FG[tone],
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        lineHeight: 1.4,
        ...style,
      }}
    >
      {icon ?? (dot ? (
        <span
          className="inline-block rounded-full"
          style={{
            width: 6,
            height: 6,
            backgroundColor: DOT[tone],
            flexShrink: 0,
          }}
        />
      ) : null)}
      <span>{label}</span>
    </span>
  );
}

export default StatusPill;
