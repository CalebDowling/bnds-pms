"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RxVolumeChartProps {
  data: { date: string; fills: number; newRx: number; refills: number }[];
}

export default function RxVolumeChart({ data }: RxVolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
        No prescription volume data available
      </div>
    );
  }

  return (
    <div className="w-full" role="img" aria-label={`Prescription volume chart showing ${data.length} days of data`}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#40721D" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#40721D" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="newRxGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border-light)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              boxShadow: "var(--shadow-md)",
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          />
          <Area
            type="monotone"
            dataKey="fills"
            name="Total Fills"
            stroke="#40721D"
            strokeWidth={2}
            fill="url(#fillGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="newRx"
            name="New Rx"
            stroke="#3b82f6"
            strokeWidth={1.5}
            fill="url(#newRxGradient)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
