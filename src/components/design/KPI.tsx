import * as React from "react";
import { I } from "./Icons";

type Tone = "ok" | "warn" | "danger" | "info" | "forest" | "ink";

interface Trend {
  dir: "up" | "down";
  label: string;
}

interface KPIProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: Tone;
  trend?: Trend;
}

const COLORS: Record<Tone, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  danger: "var(--danger)",
  info: "var(--info)",
  forest: "var(--bnds-forest)",
  ink: "var(--ink)",
};

export function KPI({ label, value, hint, tone, trend }: KPIProps) {
  const color = tone ? COLORS[tone] : "var(--ink)";
  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div className="t-eyebrow">{label}</div>
      <div
        className="bnds-serif t-num"
        style={{ fontSize: 28, fontWeight: 500, color, lineHeight: 1.05, marginTop: 2 }}
      >
        {value}
      </div>
      {hint && <div className="t-xs" style={{ color: "var(--ink-3)" }}>{hint}</div>}
      {trend && (
        <div
          className="t-xs"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: trend.dir === "up" ? "var(--ok)" : "var(--danger)",
            marginTop: 2,
          }}
        >
          {trend.dir === "up" ? <I.TrendUp className="ic-sm" /> : <I.TrendDown className="ic-sm" />} {trend.label}
        </div>
      )}
    </div>
  );
}
