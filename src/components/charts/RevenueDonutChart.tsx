"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface RevenueDonutChartProps {
  data: { category: string; amount: number }[];
}

const COLORS = [
  "#40721D", // primary green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#a855f7", // purple
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f97316", // orange
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function RevenueDonutChart({ data }: RevenueDonutChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
        No revenue data available
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="w-full" role="img" aria-label="Revenue by category donut chart">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={3}
            dataKey="amount"
            nameKey="category"
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any) => formatCurrency(Number(value))) as any}
            contentStyle={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              boxShadow: "var(--shadow-md)",
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
          />
          {/* Center label */}
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[var(--text-primary)]"
            style={{ fontSize: 18, fontWeight: 700 }}
          >
            {formatCurrency(total)}
          </text>
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[var(--text-muted)]"
            style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            Total
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
