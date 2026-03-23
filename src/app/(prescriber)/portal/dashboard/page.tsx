"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Order {
  id: string;
  patientName: string;
  status: "pending" | "completed" | "cancelled";
  createdAt: string;
  total?: number;
}

interface DashboardData {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  activePatients: number;
  recentOrders: Order[];
}

/* ── Animated counter ── */
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = value;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      }
    }

    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

/* ── Skeleton components ── */
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-6">
    <div className="animate-pulse">
      <div className="h-3 bg-gray-100 rounded-full w-24 mb-4"></div>
      <div className="h-8 bg-gray-100 rounded-lg w-20"></div>
    </div>
  </div>
);

const SkeletonActionCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-6">
    <div className="animate-pulse">
      <div className="w-10 h-10 bg-gray-100 rounded-xl mb-4"></div>
      <div className="h-4 bg-gray-100 rounded-full w-32 mb-2"></div>
      <div className="h-3 bg-gray-100 rounded-full w-48"></div>
    </div>
  </div>
);

export default function PrescriberDashboard(): React.ReactNode {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const name = localStorage.getItem("prescriber_name");
    if (!name) {
      router.push("/login");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/prescriber-portal/dashboard");
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch dashboard data");
        }
        const dashboardData = await response.json();
        setData(dashboardData);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        setError(message);
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-6 bg-gray-100 rounded-lg w-24 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SkeletonActionCard />
          <SkeletonActionCard />
        </div>
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "pending": return "bg-amber-50 text-amber-700 border-amber-100";
      case "cancelled": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .stagger-1 { animation: fadeUp 0.4s ease-out 0.05s both; }
            .stagger-2 { animation: fadeUp 0.4s ease-out 0.1s both; }
            .stagger-3 { animation: fadeUp 0.4s ease-out 0.15s both; }
            .stagger-4 { animation: fadeUp 0.4s ease-out 0.2s both; }
            .stagger-5 { animation: fadeUp 0.4s ease-out 0.25s both; }
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(12px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .card-lift {
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .card-lift:hover {
              transform: translateY(-3px);
              box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.08);
            }
            .action-card {
              transition: all 0.25s ease;
            }
            .action-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px -5px rgba(64, 114, 29, 0.12);
              border-color: #40721D;
            }
            .action-card:hover .action-icon {
              transform: scale(1.05);
            }
            .action-card:hover .action-arrow {
              transform: translateX(4px);
              opacity: 1;
            }
            .table-row {
              transition: background-color 0.15s ease;
            }
            .table-row:hover {
              background-color: #f8faf6;
            }
          `,
        }}
      />

      <div>
        {/* Page header */}
        <div className="mb-6 stagger-1">
          <h1 className="text-[15px] font-semibold text-gray-900">Overview</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl stagger-1">
            <p className="text-[13px] text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* ── Stat Cards (matching DRX: 3 columns) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Total Patients */}
          <div className="card-lift bg-white rounded-2xl border border-gray-100 p-6 stagger-1">
            <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-2">
              Total Patients
            </p>
            <p className="text-[32px] font-bold text-gray-900 leading-tight">
              <AnimatedNumber value={data?.activePatients ?? 0} />
            </p>
          </div>

          {/* Prescriptions Ordered */}
          <div className="card-lift bg-white rounded-2xl border border-gray-100 p-6 stagger-2">
            <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-2">
              Prescriptions Ordered
            </p>
            <p className="text-[32px] font-bold text-gray-900 leading-tight">
              <AnimatedNumber value={data?.totalOrders ?? 0} />
            </p>
          </div>

          {/* Total Account Balance */}
          <div className="card-lift bg-white rounded-2xl border border-gray-100 p-6 stagger-3">
            <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-2">
              Total Account Balance
            </p>
            <p className="text-[32px] font-bold text-gray-900 leading-tight">$0.00</p>
          </div>
        </div>

        {/* ── Action Cards (matching DRX: Submit New Order + Training) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {/* Submit New Order */}
          <Link href="/portal/orders/new" className="action-card group bg-white rounded-2xl border border-gray-100 p-6 flex items-start gap-5 stagger-4">
            <div className="action-icon w-11 h-11 bg-[#40721D]/8 rounded-xl flex items-center justify-center shrink-0 transition-transform">
              <svg className="w-5 h-5 text-[#40721D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-gray-900">Submit New Order</h3>
                <svg className="action-arrow w-4 h-4 text-[#40721D] opacity-0 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              <p className="text-[12.5px] text-gray-400 mt-1">
                Prescribe directly to our pharmacy for quick and easy fulfillment.
              </p>
            </div>
          </Link>

          {/* Training */}
          <Link href="/portal/training" className="action-card group bg-white rounded-2xl border border-gray-100 p-6 flex items-start gap-5 stagger-5">
            <div className="action-icon w-11 h-11 bg-[#40721D]/8 rounded-xl flex items-center justify-center shrink-0 transition-transform">
              <svg className="w-5 h-5 text-[#40721D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-gray-900">Training</h3>
                <svg className="action-arrow w-4 h-4 text-[#40721D] opacity-0 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              <p className="text-[12.5px] text-gray-400 mt-1">
                View and complete training modules to learn new skills and train your staff.
              </p>
            </div>
          </Link>
        </div>

        {/* ── Recent Orders Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden stagger-5">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-gray-900">Recent Orders</h2>
            <Link
              href="/portal/orders"
              className="text-[12px] font-medium text-[#40721D] hover:underline flex items-center gap-1"
            >
              View all
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {data?.recentOrders && data.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="table-row">
                      <td className="px-6 py-3.5 text-[13px] font-medium text-gray-900">
                        {order.patientName}
                      </td>
                      <td className="px-6 py-3.5 text-[13px] text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${statusColor(order.status)}`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/portal/orders/${order.id}`}
                          className="text-[12.5px] font-semibold text-[#40721D] hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-[13px] text-gray-400 mb-4">No orders yet</p>
              <Link
                href="/portal/orders/new"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#40721D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#355f1a] transition-all shadow-sm active:scale-[0.98]"
              >
                Create Your First Order
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
