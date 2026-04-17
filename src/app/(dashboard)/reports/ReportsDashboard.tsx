"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

// ⚠️ Perf: Recharts is ~300KB uncompressed. Dynamic-imported so users on
// pages that don't render reports never ship the chart bundle.
const ChartSkeleton = () => (
  <div
    className="rounded-lg animate-pulse"
    style={{
      height: 300,
      backgroundColor: "var(--card-bg)",
      border: "1px solid var(--border)",
    }}
  />
);

const RxVolumeChart = dynamic(() => import("@/components/charts/RxVolumeChart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const RevenueDonutChart = dynamic(() => import("@/components/charts/RevenueDonutChart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const TopDrugsBarChart = dynamic(() => import("@/components/charts/TopDrugsBarChart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const TurnaroundChart = dynamic(() => import("@/components/charts/TurnaroundChart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

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
        {/* Rx Volume Chart — Recharts Area */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Rx Volume
          </h3>
          <RxVolumeChart
            data={rxVolume.map(d => ({
              date: d.date,
              fills: d.volume,
              newRx: 0,
              refills: 0,
            }))}
          />
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

        {/* Revenue by Category — Recharts Donut */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue by Category
          </h3>
          <RevenueDonutChart
            data={revenueByCategory.map(d => ({
              category: d.name,
              amount: d.value,
            }))}
          />
        </div>

        {/* Top 10 Prescribed Drugs — Recharts Horizontal Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top 10 Prescribed Drugs
          </h3>
          <TopDrugsBarChart data={topDrugs.slice(0, 10)} />
        </div>

        {/* Turnaround Times — KPI cards + Recharts Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Intake to Fill Turnaround
          </h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Avg</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{turnaroundTimes.average}</p>
              <p className="text-[10px] text-gray-400">min</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">P95</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{turnaroundTimes.percentile95}</p>
              <p className="text-[10px] text-gray-400">min</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Min</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{turnaroundTimes.min}</p>
              <p className="text-[10px] text-gray-400">min</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Max</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{turnaroundTimes.max}</p>
              <p className="text-[10px] text-gray-400">min</p>
            </div>
          </div>
          {turnaroundTimes.byHour.length > 0 && (
            <TurnaroundChart
              data={turnaroundTimes.byHour.map(h => ({
                stage: h.hour,
                avgMinutes: h.avgMinutes,
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
