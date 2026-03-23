"use client";

import { useState, useCallback } from "react";
import { formatDate } from "@/lib/utils";

interface RxVolumePoint {
  date: string;
  volume: number;
}

interface CategoryRevenue {
  name: string;
  value: number;
  percentage: number;
}

interface TopDrug {
  name: string;
  fills: number;
  revenue: number;
}

interface TurnaroundData {
  average: number;
  min: number;
  max: number;
  percentile95: number;
  byHour: Array<{ hour: string; avgMinutes: number }>;
}

interface ReportsDashboardProps {
  initialRxVolume: RxVolumePoint[];
  initialRevenueByCategory: CategoryRevenue[];
  initialTopDrugs: TopDrug[];
  initialTurnaroundTimes: TurnaroundData;
  startDate: string;
  endDate: string;
  onDataRefresh: (
    startDate: string,
    endDate: string
  ) => Promise<{
    rxVolume: RxVolumePoint[];
    revenueByCategory: CategoryRevenue[];
    topDrugs: TopDrug[];
    turnaroundTimes: TurnaroundData;
  }>;
}

const BRAND_GREEN = "#40721D";
const BRAND_GREEN_LIGHT = "#7AB55C";
const BRAND_GREEN_DARK = "#2A4D15";

const ChartBar = ({
  label,
  value,
  max,
  color = BRAND_GREEN,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 truncate">{label}</span>
        <span className="font-medium text-gray-900 ml-2">{value}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

const LineChart = ({
  data,
  height = 200,
}: {
  data: RxVolumePoint[];
  height?: number;
}) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  const values = data.map(d => d.volume);
  const maxValue = Math.max(...values);
  const minValue = 0;
  const range = maxValue - minValue || 1;

  // Calculate points for SVG
  const padding = 40;
  const width = Math.max(data.length * 40, 400);
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
    const y =
      padding +
      chartHeight -
      ((d.volume - minValue) / range) * chartHeight;
    return { x, y, label: d.date, value: d.volume };
  });

  // Create path for the line
  const pathData = points
    .map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `L${p.x} ${p.y}`))
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto"
      >
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <line
            key={`grid-${i}`}
            x1={padding}
            y1={padding + (i / 4) * (height - padding * 2)}
            x2={width - padding}
            y2={padding + (i / 4) * (height - padding * 2)}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        ))}

        {/* Y-axis */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#d1d5db"
          strokeWidth={2}
        />
        {/* X-axis */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#d1d5db"
          strokeWidth={2}
        />

        {/* Y-axis labels */}
        {[0, 1, 2, 3, 4].map(i => {
          const value = minValue + (i / 4) * range;
          return (
            <text
              key={`y-label-${i}`}
              x={padding - 10}
              y={height - padding - (i / 4) * (height - padding * 2) + 4}
              textAnchor="end"
              fontSize={12}
              fill="#6b7280"
            >
              {Math.round(value)}
            </text>
          );
        })}

        {/* Line chart */}
        <path
          d={pathData}
          fill="none"
          stroke={BRAND_GREEN}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={`point-${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={3}
              fill={BRAND_GREEN}
              stroke="white"
              strokeWidth={2}
            />
            {/* Labels for every 3rd point */}
            {i % Math.ceil(data.length / 5) === 0 && (
              <text
                x={p.x}
                y={height - padding + 20}
                textAnchor="middle"
                fontSize={11}
                fill="#6b7280"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

const DonutChart = ({
  data,
}: {
  data: CategoryRevenue[];
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-sm">No revenue data available</p>
      </div>
    );
  }

  const colors = [BRAND_GREEN, BRAND_GREEN_LIGHT, BRAND_GREEN_DARK];
  let startAngle = -Math.PI / 2;

  const size = 200;
  const radius = 60;
  const cx = size / 2;
  const cy = size / 2;
  const innerRadius = 35;

  const slices = data.map((item, i) => {
    const sliceAngle = (item.value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathData = [
      `M${cx} ${cy}`,
      `L${x1} ${y1}`,
      `A${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `Z`,
    ].join(" ");

    const labelAngle = startAngle + sliceAngle / 2;
    const labelRadius = (radius + innerRadius) / 2;
    const labelX = cx + labelRadius * Math.cos(labelAngle);
    const labelY = cy + labelRadius * Math.sin(labelAngle);

    startAngle = endAngle;

    return { pathData, labelX, labelY, color: colors[i % colors.length], item };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Inner circle for donut effect */}
        <circle cx={cx} cy={cy} r={innerRadius} fill="white" />

        {/* Slices */}
        {slices.map((slice, i) => (
          <g key={`slice-${i}`}>
            <path
              d={slice.pathData}
              fill={slice.color}
              stroke="white"
              strokeWidth={2}
              opacity={0.9}
            />
          </g>
        ))}
      </svg>

      <div className="w-full space-y-2">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: colors[i % colors.length],
                }}
              />
              <span className="text-gray-700">{item.name}</span>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">${item.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-gray-500">{item.percentage}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HorizontalBarChart = ({
  data,
  limit = 10,
}: {
  data: TopDrug[];
  limit?: number;
}) => {
  const displayData = data.slice(0, limit);
  const maxValue = Math.max(...displayData.map(d => d.fills), 1);

  if (displayData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-sm">No drug data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayData.map((drug, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between items-start text-xs">
            <span className="text-gray-700 font-medium truncate flex-1 pr-2">
              {drug.name}
            </span>
            <span className="text-gray-900 font-medium whitespace-nowrap">
              {drug.fills} fills
            </span>
          </div>
          <div className="h-6 bg-gray-200 rounded-full overflow-hidden flex items-center relative">
            <div
              className="h-full rounded-full transition-all duration-300 flex items-center justify-end pr-2"
              style={{
                width: `${(drug.fills / maxValue) * 100}%`,
                backgroundColor: BRAND_GREEN,
              }}
            >
              {drug.fills > maxValue * 0.2 && (
                <span className="text-xs font-medium text-white">${drug.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function ReportsDashboard({
  initialRxVolume,
  initialRevenueByCategory,
  initialTopDrugs,
  initialTurnaroundTimes,
  startDate: initialStartDate,
  endDate: initialEndDate,
  onDataRefresh,
}: ReportsDashboardProps) {
  const [rxVolume, setRxVolume] = useState(initialRxVolume);
  const [revenueByCategory, setRevenueByCategory] =
    useState(initialRevenueByCategory);
  const [topDrugs, setTopDrugs] = useState(initialTopDrugs);
  const [turnaroundTimes, setTurnaroundTimes] =
    useState(initialTurnaroundTimes);

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isLoading, setIsLoading] = useState(false);

  const handleDateChange = useCallback(async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);
    try {
      const data = await onDataRefresh(startDate, endDate);
      setRxVolume(data.rxVolume);
      setRevenueByCategory(data.revenueByCategory);
      setTopDrugs(data.topDrugs);
      setTurnaroundTimes(data.turnaroundTimes);
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, onDataRefresh]);

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
            />
          </div>
          <button
            onClick={handleDateChange}
            disabled={isLoading}
            className="px-4 py-2 bg-[#40721D] text-white rounded-lg text-sm font-medium hover:bg-[#2A4D15] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Loading..." : "Update"}
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rx Volume Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Rx Volume (Last 30 Days)
          </h3>
          <LineChart data={rxVolume} />
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {rxVolume.reduce((sum, d) => sum + d.volume, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total Fills</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {rxVolume.length > 0
                    ? Math.round(
                        rxVolume.reduce((sum, d) => sum + d.volume, 0) /
                          rxVolume.length
                      )
                    : 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Daily Average</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {rxVolume.length > 0
                    ? Math.max(...rxVolume.map(d => d.volume))
                    : 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Peak Day</p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue by Category */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue by Category
          </h3>
          <DonutChart data={revenueByCategory} />
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-2xl font-bold text-gray-900">
              ${revenueByCategory.reduce((sum, d) => sum + d.value, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total Period Revenue</p>
          </div>
        </div>

        {/* Top 10 Prescribed Drugs */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top 10 Prescribed Drugs
          </h3>
          <HorizontalBarChart data={topDrugs} limit={10} />
        </div>

        {/* Turnaround Times */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Intake to Fill Turnaround Times
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 font-medium">Average</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {turnaroundTimes.average}
                </p>
                <p className="text-xs text-gray-500 mt-1">minutes</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 font-medium">95th Percentile</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {turnaroundTimes.percentile95}
                </p>
                <p className="text-xs text-gray-500 mt-1">minutes</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 font-medium">Min</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {turnaroundTimes.min}
                </p>
                <p className="text-xs text-gray-500 mt-1">minutes</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 font-medium">Max</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {turnaroundTimes.max}
                </p>
                <p className="text-xs text-gray-500 mt-1">minutes</p>
              </div>
            </div>

            {turnaroundTimes.byHour.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Avg Time by Hour
                </p>
                <div className="space-y-2">
                  {turnaroundTimes.byHour.slice(0, 8).map((hourData, i) => (
                    <ChartBar
                      key={i}
                      label={hourData.hour}
                      value={hourData.avgMinutes}
                      max={Math.max(
                        ...turnaroundTimes.byHour.map(h => h.avgMinutes)
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
