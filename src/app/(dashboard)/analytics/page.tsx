import {
  getDailyFills,
  getRevenueTrend,
  getTopDrugs,
  getStatusBreakdown,
  getTurnaroundTrend,
  getClaimsPerformance,
} from "./actions";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  try {
    const [fills, revenue, topDrugs, statusBreakdown, turnaround, claims] =
      await Promise.all([
        getDailyFills(30),
        getRevenueTrend(30),
        getTopDrugs(10),
        getStatusBreakdown(),
        getTurnaroundTrend(30),
        getClaimsPerformance(30),
      ]);

    const data = {
      fills,
      revenue,
      topDrugs,
      statusBreakdown,
      turnaround,
      claims,
    };

    return (
      <PermissionGuard resource="reports" action="read">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Real-time pharmacy operations metrics</p>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-3 bg-white rounded-lg p-4 border border-gray-200">
            <label className="text-sm font-medium text-gray-700">Date Range:</label>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-sm rounded-md bg-[#40721D] text-white">
                Last 30 Days
              </button>
              <button className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200">
                Last 7 Days
              </button>
              <button className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200">
                Last 90 Days
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Daily Fills Chart */}
            <ChartCard title="Daily Fills (Last 30 Days)" subtitle="Number of prescriptions filled per day">
              <BarChart data={data.fills} height={200} barColor="#40721D" />
            </ChartCard>

            {/* Revenue Trend */}
            <ChartCard title="Revenue Trend (Last 30 Days)" subtitle="Daily revenue in dollars">
              <LineChart data={data.revenue} height={200} lineColor="#40721D" />
            </ChartCard>

            {/* Top 10 Drugs */}
            <ChartCard title="Top 10 Most Dispensed Drugs" subtitle="Prescription fills by drug">
              <HorizontalBarChart data={data.topDrugs} height={250} barColor="#40721D" />
            </ChartCard>

            {/* Prescription Status Breakdown */}
            <ChartCard title="Prescription Status Distribution" subtitle="Fill counts by status">
              <PieChart data={data.statusBreakdown} height={220} />
            </ChartCard>

            {/* Turnaround Time */}
            <ChartCard
              title="Turnaround Time Trend"
              subtitle="Average days from intake to dispensed"
            >
              <LineChart data={data.turnaround} height={200} lineColor="#2D5114" />
            </ChartCard>

            {/* Insurance Claims Performance */}
            <ChartCard title="Insurance Claims Performance" subtitle="Approved vs rejected rates">
              <div className="flex gap-6">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 mb-2">Approval Rate</p>
                  <ProgressBar
                    value={data.claims.approvalRate}
                    color="bg-green-500"
                    height={12}
                  />
                  <p className="text-sm text-gray-500 mt-1">{data.claims.approvalRate}%</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 mb-2">Rejection Rate</p>
                  <ProgressBar
                    value={data.claims.rejectionRate}
                    color="bg-red-500"
                    height={12}
                  />
                  <p className="text-sm text-gray-500 mt-1">{data.claims.rejectionRate}%</p>
                </div>
              </div>
            </ChartCard>
          </div>
        </div>
      </PermissionGuard>
    );
  } catch (error) {
    console.error("Analytics error:", error);
    return (
      <PermissionGuard resource="reports" action="read">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">Failed to load analytics dashboard</p>
        </div>
      </PermissionGuard>
    );
  }
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function BarChart({
  data,
  height,
  barColor,
}: {
  data: Array<{ date: string; count: number }>;
  height: number;
  barColor: string;
}) {
  if (!data || data.length === 0)
    return <p className="text-sm text-gray-500 text-center py-8">No data available</p>;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{ height }} className="flex items-end gap-2">
      {data.map((d, i) => {
        const percentage = (d.count / maxCount) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-600 font-medium">{d.count}</span>
            <div
              className={`w-full ${barColor} rounded-t transition-all`}
              style={{ height: `${Math.max(percentage, 5)}%` }}
            />
            <span className="text-xs text-gray-400 truncate">{d.date.split("-")[2]}</span>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({
  data,
  height,
  lineColor,
}: {
  data: Array<{ date: string; value: number }>;
  height: number;
  lineColor: string;
}) {
  if (!data || data.length === 0)
    return <p className="text-sm text-gray-500 text-center py-8">No data available</p>;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data
    .map((d, i) => {
      const normalizedValue = (d.value - minValue) / range;
      const yPercent = normalizedValue * 100;
      const xPercent = (i / (data.length - 1)) * 100;
      return { x: xPercent, y: 100 - yPercent, date: d.date, value: d.value };
    });

  return (
    <div style={{ height }} className="relative w-full">
      <svg width="100%" height={height} className="absolute inset-0">
        <polyline
          points={points.map((p) => `${(p.x / 100) * 100},${(p.y / 100) * height}`).join(" ")}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute inset-0 flex items-end gap-1">
        {points.map((p, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
            <span className="text-xs text-gray-400 truncate">{p.date.split("-")[2]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarChart({
  data,
  height,
  barColor,
}: {
  data: Array<{ name: string; count: number }>;
  height: number;
  barColor: string;
}) {
  if (!data || data.length === 0)
    return <p className="text-sm text-gray-500 text-center py-8">No data available</p>;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{ height }} className="space-y-2">
      {data.map((d, i) => {
        const percentage = (d.count / maxCount) * 100;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 font-medium w-48 truncate">{d.name}</span>
            <div className="flex-1 flex items-center gap-2">
              <div
                className={`${barColor} rounded-r h-6`}
                style={{ width: `${percentage}%`, minWidth: "4px" }}
              />
              <span className="text-xs text-gray-600 font-medium w-12 text-right">{d.count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PieChart({
  data,
  height,
}: {
  data: Array<{ status: string; count: number }>;
  height: number;
}) {
  if (!data || data.length === 0)
    return <p className="text-sm text-gray-500 text-center py-8">No data available</p>;

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const colors = ["#40721D", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

  const segments = data.map((d) => ({
    ...d,
    percentage: (d.count / total) * 100,
  }));

  return (
    <div className="flex items-center justify-center gap-8">
      <svg width={height} height={height} className="flex-shrink-0">
        {(() => {
          let startAngle = -90;
          return segments.map((seg, i) => {
            const sliceAngle = (seg.percentage / 100) * 360;
            const radius = height / 2 - 10;
            const centerX = height / 2;
            const centerY = height / 2;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = ((startAngle + sliceAngle) * Math.PI) / 180;

            const x1 = centerX + radius * Math.cos(startRad);
            const y1 = centerY + radius * Math.sin(startRad);
            const x2 = centerX + radius * Math.cos(endRad);
            const y2 = centerY + radius * Math.sin(endRad);

            const largeArc = sliceAngle > 180 ? 1 : 0;
            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
              "Z",
            ].join(" ");

            const result = (
              <path
                key={i}
                d={pathData}
                fill={colors[i % colors.length]}
                stroke="white"
                strokeWidth="2"
              />
            );

            startAngle += sliceAngle;
            return result;
          });
        })()}
      </svg>

      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="text-sm text-gray-700 capitalize">{seg.status}</span>
            <span className="text-sm font-medium text-gray-900">{seg.count}</span>
            <span className="text-xs text-gray-500">({seg.percentage.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  color,
  height,
}: {
  value: number;
  color: string;
  height: number;
}) {
  return (
    <div className="w-full bg-gray-200 rounded-full overflow-hidden" style={{ height }}>
      <div
        className={`${color} h-full transition-all`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}
