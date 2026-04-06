"use client";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export default function Sparkline({
  data,
  color = "var(--color-primary)",
  height = 24,
  width = 60,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data, 1);
  const barWidth = Math.max(2, (width - (data.length - 1)) / data.length);

  return (
    <div
      className="sparkline-container"
      style={{ height, width }}
      role="img"
      aria-label={`Trend: ${data.join(", ")}`}
    >
      {data.map((value, i) => {
        const barHeight = Math.max(2, (value / max) * height);
        return (
          <div
            key={i}
            className="sparkline-bar"
            style={{
              height: barHeight,
              width: barWidth,
              backgroundColor: color,
              opacity: i === data.length - 1 ? 1 : 0.4 + (i / data.length) * 0.4,
            }}
          />
        );
      })}
    </div>
  );
}
