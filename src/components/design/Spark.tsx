import * as React from "react";

interface SparkProps {
  values: number[];
  color?: string;
  w?: number;
  h?: number;
}

export function Spark({ values, color = "var(--bnds-forest)", w = 80, h = 24 }: SparkProps) {
  if (!values || values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = w / Math.max(values.length - 1, 1);
  const pts = values
    .map((v, i) => `${i * step},${h - ((v - min) / span) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
