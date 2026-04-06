import React from "react";

type KPICardProps = {
  title: string;
  value: string;
  subtitle?: string;
  changePercent?: number;
  changeLabel?: string;
};

export default function KPICard({
  title,
  value,
  subtitle,
  changePercent,
  changeLabel,
}: KPICardProps) {
  const isPositive = changePercent !== undefined && changePercent >= 0;
  const isNegative = changePercent !== undefined && changePercent < 0;
  const absChange = changePercent !== undefined ? Math.abs(changePercent) : null;

  return (
    <div
      style={{
        backgroundColor: "var(--card-bg, #F5F0E8)",
        border: "1px solid var(--border, #D4C9B8)",
        borderRadius: "12px",
        padding: "20px 24px",
        minWidth: 0,
        flex: "1 1 0",
      }}
    >
      <p
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--text-muted, #8B7E6A)",
          marginBottom: "8px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "var(--text-primary, #2D2416)",
          lineHeight: 1.2,
          marginBottom: "6px",
        }}
      >
        {value}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {absChange !== null && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              fontSize: "13px",
              fontWeight: 600,
              color: isPositive
                ? "var(--green-700, #40721D)"
                : "var(--red-600, #DC2626)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{
                transform: isNegative ? "rotate(180deg)" : undefined,
              }}
            >
              <path
                d="M7 3L11 8H3L7 3Z"
                fill="currentColor"
              />
            </svg>
            {absChange.toFixed(1)}%
          </span>
        )}
        {(subtitle || changeLabel) && (
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-muted, #8B7E6A)",
            }}
          >
            {changeLabel || subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
