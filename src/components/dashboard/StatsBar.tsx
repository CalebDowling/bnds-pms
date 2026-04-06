"use client";

import { useEffect, useState } from "react";

interface RealTimeStats {
  paidClaims: number;
  rxSold: number;
  grossProfit: number;
  efficiency: number;
  postEdits: number;
  packagesShipped: number;
}

export default function StatsBar() {
  const [stats, setStats] = useState<RealTimeStats>({
    paidClaims: 0,
    rxSold: 0,
    grossProfit: 0,
    efficiency: 0,
    postEdits: 0,
    packagesShipped: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const statItems = [
    {
      label: "Paid Claims",
      value: stats.paidClaims,
      icon: "💰",
      color: "from-emerald-500 to-green-600",
    },
    {
      label: "Rx Sold",
      value: stats.rxSold,
      icon: "💊",
      color: "from-blue-500 to-cyan-600",
    },
    {
      label: "Gross Profit",
      value: `$${stats.grossProfit.toFixed(2)}`,
      icon: "📈",
      color: "from-violet-500 to-purple-600",
    },
    {
      label: "Efficiency",
      value: `${stats.efficiency}/hr`,
      icon: "⚡",
      color: "from-orange-500 to-red-600",
    },
    {
      label: "Post Edits",
      value: stats.postEdits,
      icon: "✏️",
      color: "from-pink-500 to-rose-600",
    },
    {
      label: "Packages Shipped",
      value: stats.packagesShipped,
      icon: "📦",
      color: "from-indigo-500 to-blue-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 h-20 w-32 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {statItems.map((item) => (
        <div
          key={item.label}
          className={`flex-shrink-0 p-4 rounded-lg bg-gradient-to-br ${item.color} text-white shadow-lg hover:shadow-xl transition-all w-44`}
        >
          <div className="text-2xl mb-1">{item.icon}</div>
          <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">
            {item.label}
          </p>
          <p className="text-2xl font-bold mt-1">
            {typeof item.value === "number" && item.value > 99
              ? `${item.value}`
              : item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
