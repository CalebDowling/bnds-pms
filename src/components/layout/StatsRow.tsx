import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * StatsRow — the unified KPI / stat strip for every landing page.
 *
 * Takes an array of stats and renders them as a responsive grid of
 * cards. Each card shows:
 *   - eyebrow label     (uppercase, tracked, .section-label)
 *   - optional icon     (colored with `accent`)
 *   - big value         (24px extrabold tabular-nums)
 *   - optional sub      (small muted text below the value)
 *   - optional delta    (+/- percent change with up/down arrow)
 *
 * Responsive: 2 cols on mobile → 3 cols on tablet → (count) cols on desktop,
 * capped at 5 columns.
 *
 * Usage:
 *   <StatsRow stats={[
 *     { label: "Active",  value: 42, icon: <Phone />,   accent: "#22c55e" },
 *     { label: "On Hold", value: 3,  icon: <Pause />,   accent: "#eab308" },
 *     { label: "Today",   value: 128                                    },
 *     { label: "Missed",  value: 1,  accent: "#ef4444", delta: -25      },
 *   ]} />
 */
export interface StatItem {
  /** Short uppercase label displayed above the value */
  label: string;
  /** The primary number or value (rendered large and extrabold) */
  value: string | number;
  /** Optional small sub-text displayed under the value */
  sub?: string;
  /** Optional lucide-style icon element, colored to match `accent` */
  icon?: ReactNode;
  /** Optional accent color for the icon + value (e.g. "#22c55e" or "var(--accent-patient)") */
  accent?: string;
  /** Optional percent delta — positive shows green ▲, negative shows red ▼ */
  delta?: number;
}

export interface StatsRowProps {
  stats: StatItem[];
}

function formatValue(value: string | number): string {
  if (typeof value === "number") return value.toLocaleString();
  return value;
}

export default function StatsRow({ stats }: StatsRowProps) {
  if (stats.length === 0) return null;

  // Cap grid at 5 columns (matches Tailwind's grid-cols-5 max)
  const lgCols = Math.min(stats.length, 5);
  const lgColsClass = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
  }[lgCols];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 ${lgColsClass} gap-3`}>
      {stats.map((stat, i) => (
        <div
          key={`${stat.label}-${i}`}
          className="rounded-lg px-4 py-3"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="section-label">{stat.label}</span>
            {stat.icon && (
              <span
                className="flex items-center justify-center w-6 h-6 rounded-md"
                style={{
                  color: stat.accent ?? "var(--text-muted)",
                  backgroundColor: stat.accent
                    ? `${stat.accent}15`
                    : "var(--green-50)",
                }}
                aria-hidden
              >
                {stat.icon}
              </span>
            )}
          </div>
          <div
            className="text-[24px] font-extrabold tabular-nums leading-tight"
            style={{ color: stat.accent ?? "var(--text-primary)" }}
          >
            {formatValue(stat.value)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {stat.sub && (
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {stat.sub}
              </span>
            )}
            {typeof stat.delta === "number" && (
              <span
                className="inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums"
                style={{
                  color: stat.delta >= 0 ? "#16a34a" : "#dc2626",
                }}
              >
                {stat.delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {stat.delta >= 0 ? "+" : ""}
                {stat.delta.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
