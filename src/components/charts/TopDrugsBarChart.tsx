"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface TopDrugsBarChartProps {
  data: { name: string; fills: number; revenue: number }[];
}

const COLORS = [
  "#40721D",
  "#4cb868",
  "#2da44e",
  "#5A9A2F",
  "#65a30d",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#f59e0b",
  "#14b8a6",
];

export default function TopDrugsBarChart({ data }: TopDrugsBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
        No drug data available
      </div>
    );
  }

  return (
    <div className="w-full" role="img" aria-label={`Top ${data.length} drugs by fill count`}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              boxShadow: "var(--shadow-md)",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any) => [`${value} fills`, "Fills"]) as any}
          />
          <Bar dataKey="fills" name="Fills" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
