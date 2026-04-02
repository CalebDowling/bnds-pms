import React from "react";

export type ChartPoint = {
  label: string;
  value: number;
};

type TrendChartProps = {
  data: ChartPoint[];
  height?: number;
  mode?: "line" | "bar";
  color?: string;
  fillColor?: string;
  showValues?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  formatValue?: (v: number) => string;
};

export default function TrendChart({
  data,
  height = 220,
  mode = "line",
  color = "var(--green-700, #40721D)",
  fillColor,
  showValues = false,
  valuePrefix = "",
  valueSuffix = "",
  formatValue,
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted, #8B7E6A)",
          fontSize: "14px",
        }}
      >
        No data available
      </div>
    );
  }

  const padTop = 24;
  const padBottom = 40;
  const padLeft = 50;
  const padRight = 16;
  const svgWidth = 800;
  const svgHeight = height;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;

  // Y axis grid lines (5 ticks)
  const yTicks: number[] = [];
  for (let i = 0; i <= 4; i++) {
    yTicks.push(minVal + (range * i) / 4);
  }

  function xPos(i: number): number {
    if (data.length === 1) return padLeft + chartWidth / 2;
    return padLeft + (i / (data.length - 1)) * chartWidth;
  }

  function yPos(v: number): number {
    return padTop + chartHeight - ((v - minVal) / range) * chartHeight;
  }

  const fmtVal = formatValue ?? ((v: number) => {
    if (v >= 1000000) return `${valuePrefix}${(v / 1000000).toFixed(1)}M${valueSuffix}`;
    if (v >= 1000) return `${valuePrefix}${(v / 1000).toFixed(1)}K${valueSuffix}`;
    return `${valuePrefix}${v.toFixed(v % 1 === 0 ? 0 : 1)}${valueSuffix}`;
  });

  // Determine which x-axis labels to show (max ~12)
  const labelEvery = Math.max(1, Math.ceil(data.length / 12));

  // Format short date label
  function shortLabel(label: string): string {
    // Try parsing as ISO date
    if (/^\d{4}-\d{2}-\d{2}/.test(label)) {
      const parts = label.split("-");
      return `${parts[1]}/${parts[2]}`;
    }
    return label.length > 6 ? label.slice(0, 6) : label;
  }

  if (mode === "bar") {
    const barWidth = Math.max(2, (chartWidth / data.length) * 0.7);
    const barGap = (chartWidth / data.length) * 0.3;

    return (
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height={svgHeight}
          style={{ display: "block" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={`grid-${i}`}>
              <line
                x1={padLeft}
                y1={yPos(tick)}
                x2={svgWidth - padRight}
                y2={yPos(tick)}
                stroke="var(--border, #D4C9B8)"
                strokeWidth="1"
                strokeDasharray={i === 0 ? "none" : "4,4"}
              />
              <text
                x={padLeft - 8}
                y={yPos(tick) + 4}
                textAnchor="end"
                fill="var(--text-muted, #8B7E6A)"
                fontSize="11"
              >
                {fmtVal(tick)}
              </text>
            </g>
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const bx = padLeft + (i / data.length) * chartWidth + barGap / 2;
            const bh = ((d.value - minVal) / range) * chartHeight;
            const by = padTop + chartHeight - bh;
            return (
              <g key={`bar-${i}`}>
                <rect
                  x={bx}
                  y={by}
                  width={barWidth}
                  height={Math.max(bh, 1)}
                  fill={color}
                  rx="2"
                  opacity="0.85"
                />
                {showValues && d.value > 0 && (
                  <text
                    x={bx + barWidth / 2}
                    y={by - 4}
                    textAnchor="middle"
                    fill="var(--text-secondary, #5C4F3C)"
                    fontSize="10"
                  >
                    {fmtVal(d.value)}
                  </text>
                )}
              </g>
            );
          })}

          {/* X-axis labels */}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <text
                key={`xlabel-${i}`}
                x={padLeft + (i / data.length) * chartWidth + barWidth / 2}
                y={svgHeight - 6}
                textAnchor="middle"
                fill="var(--text-muted, #8B7E6A)"
                fontSize="11"
              >
                {shortLabel(d.label)}
              </text>
            ) : null
          )}
        </svg>
      </div>
    );
  }

  // Line chart
  const polylinePoints = data.map((d, i) => `${xPos(i)},${yPos(d.value)}`).join(" ");

  // Area fill path
  const areaPath = [
    `M ${xPos(0)},${yPos(data[0].value)}`,
    ...data.slice(1).map((d, i) => `L ${xPos(i + 1)},${yPos(d.value)}`),
    `L ${xPos(data.length - 1)},${padTop + chartHeight}`,
    `L ${xPos(0)},${padTop + chartHeight}`,
    "Z",
  ].join(" ");

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        height={svgHeight}
        style={{ display: "block" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={padLeft}
              y1={yPos(tick)}
              x2={svgWidth - padRight}
              y2={yPos(tick)}
              stroke="var(--border, #D4C9B8)"
              strokeWidth="1"
              strokeDasharray={i === 0 ? "none" : "4,4"}
            />
            <text
              x={padLeft - 8}
              y={yPos(tick) + 4}
              textAnchor="end"
              fill="var(--text-muted, #8B7E6A)"
              fontSize="11"
            >
              {fmtVal(tick)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path
          d={areaPath}
          fill={fillColor ?? color}
          opacity="0.1"
        />

        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={`dot-${i}`}
            cx={xPos(i)}
            cy={yPos(d.value)}
            r="3"
            fill="white"
            stroke={color}
            strokeWidth="2"
          />
        ))}

        {/* Value labels (optional) */}
        {showValues &&
          data.map((d, i) =>
            i % labelEvery === 0 ? (
              <text
                key={`val-${i}`}
                x={xPos(i)}
                y={yPos(d.value) - 10}
                textAnchor="middle"
                fill="var(--text-secondary, #5C4F3C)"
                fontSize="10"
                fontWeight="600"
              >
                {fmtVal(d.value)}
              </text>
            ) : null
          )}

        {/* X-axis labels */}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text
              key={`xlabel-${i}`}
              x={xPos(i)}
              y={svgHeight - 6}
              textAnchor="middle"
              fill="var(--text-muted, #8B7E6A)"
              fontSize="11"
            >
              {shortLabel(d.label)}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}
