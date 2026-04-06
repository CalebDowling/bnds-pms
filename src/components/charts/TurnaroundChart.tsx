"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TurnaroundChartProps {
  data: { stage: string; avgMinutes: number }[];
}

export default function TurnaroundChart({ data }: TurnaroundChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-sm text-[var(--text-muted)]">
        No turnaround data available
      </div>
    );
  }

  return (
    <div className="w-full" role="img" aria-label="Average turnaround time by workflow stage">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border-light)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Minutes",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 10, fill: "var(--text-muted)" },
            }}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any) => [`${Number(value).toFixed(1)} min`, "Avg Time"]) as any}
            contentStyle={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              boxShadow: "var(--shadow-md)",
            }}
          />
          <Bar
            dataKey="avgMinutes"
            name="Avg Minutes"
            fill="#40721D"
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
