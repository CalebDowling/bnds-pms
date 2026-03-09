import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalPatients,
    activePatients,
    rxIntake,
    rxInProgress,
    rxReady,
    rxOnHold,
    rxTodayCount,
    totalFormulas,
    activeBatches,
    pendingShipments,
    lowStockItems,
    pendingClaims,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.patient.count({ where: { status: "active" } }),
    prisma.prescription.count({ where: { status: "intake" } }),
    prisma.prescription.count({ where: { status: { in: ["in_progress", "compounding", "filling"] } } }),
    prisma.prescription.count({ where: { status: { in: ["ready", "verified"] } } }),
    prisma.prescription.count({ where: { status: "on_hold" } }),
    prisma.prescription.count({ where: { dateReceived: { gte: today } } }),
    prisma.formula.count({ where: { isActive: true } }),
    prisma.batch.count({ where: { status: "in_progress" } }),
    prisma.shipment.count({ where: { status: "pending" } }),
    prisma.item.count({ where: { isActive: true, reorderPoint: { gt: 0 } } }),
    prisma.claim.count({ where: { status: "pending" } }),
  ]);

  return {
    totalPatients, activePatients,
    rxIntake, rxInProgress, rxReady, rxOnHold, rxTodayCount,
    totalFormulas, activeBatches,
    pendingShipments, lowStockItems, pendingClaims,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Boudreaux&apos;s Compounding Pharmacy — Overview</p>
      </div>

      {/* Prescription Pipeline */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Prescription Pipeline</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link href="/prescriptions?status=intake" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#1B4F72] transition-colors">
            <p className="text-xs font-semibold text-gray-400 uppercase">Intake</p>
            <p className={`text-3xl font-bold mt-1 ${stats.rxIntake > 0 ? "text-yellow-600" : "text-gray-900"}`}>{stats.rxIntake}</p>
            <p className="text-xs text-gray-400 mt-1">awaiting review</p>
          </Link>
          <Link href="/prescriptions?status=in_progress" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#1B4F72] transition-colors">
            <p className="text-xs font-semibold text-gray-400 uppercase">In Progress</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats.rxInProgress}</p>
            <p className="text-xs text-gray-400 mt-1">being processed</p>
          </Link>
          <Link href="/prescriptions?status=ready" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#1B4F72] transition-colors">
            <p className="text-xs font-semibold text-gray-400 uppercase">Ready</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{stats.rxReady}</p>
            <p className="text-xs text-gray-400 mt-1">for pickup / ship</p>
          </Link>
          <Link href="/prescriptions?status=on_hold" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#1B4F72] transition-colors">
            <p className="text-xs font-semibold text-gray-400 uppercase">On Hold</p>
            <p className={`text-3xl font-bold mt-1 ${stats.rxOnHold > 0 ? "text-red-600" : "text-gray-900"}`}>{stats.rxOnHold}</p>
            <p className="text-xs text-gray-400 mt-1">needs attention</p>
          </Link>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Today</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.rxTodayCount}</p>
            <p className="text-xs text-gray-400 mt-1">received today</p>
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Operations</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/patients" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#1B4F72] transition-colors">
            <p className="text-xs font-semibold text-gray-400 uppercase">Patients</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activePatients}</p>
            <p className="text-xs text-gray-400">of {stats.totalPatients} total</p>
          </Link>
          <Link href="/compounding" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#1B4F72] transition-colors">
            <p className="text-xs font-semibold text-gray-400 uppercase">Compounding</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalFormulas}</p>
            <p className="text-xs text-gray-400">formulas • {stats.activeBatches} active batch{stats.activeBatches !== 1 ? "es" : ""}</p>
          </Link>
          <Link href="/shipping?status=pending" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#1B4F72] transition-colors">
            <p className="text-xs font-semibold text-gray-400 uppercase">Pending Shipments</p>
            <p className={`text-2xl font-bold mt-1 ${stats.pendingShipments > 0 ? "text-yellow-600" : "text-gray-900"}`}>{stats.pendingShipments}</p>
            <p className="text-xs text-gray-400">need packing</p>
          </Link>
          <Link href="/inventory" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#1B4F72] transition-colors">
            <p className="text-xs font-semibold text-gray-400 uppercase">Low Stock Alerts</p>
            <p className={`text-2xl font-bold mt-1 ${stats.lowStockItems > 0 ? "text-red-600" : "text-gray-900"}`}>{stats.lowStockItems}</p>
            <p className="text-xs text-gray-400">items at reorder point</p>
          </Link>
        </div>
      </div>

      {/* Financial */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Financial</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Link href="/billing?tab=claims&status=pending" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#1B4F72] transition-colors">
            <p className="text-xs font-semibold text-gray-400 uppercase">Pending Claims</p>
            <p className={`text-2xl font-bold mt-1 ${stats.pendingClaims > 0 ? "text-yellow-600" : "text-gray-900"}`}>{stats.pendingClaims}</p>
            <p className="text-xs text-gray-400">awaiting submission</p>
          </Link>
          <Link href="/pos" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#1B4F72] transition-colors">
            <p className="text-xs font-semibold text-gray-400 uppercase">Point of Sale</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">→</p>
            <p className="text-xs text-gray-400">open register</p>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/patients/new", label: "New Patient", icon: "👤" },
            { href: "/prescriptions/new", label: "New Prescription", icon: "💊" },
            { href: "/compounding/formulas/new", label: "New Formula", icon: "🧪" },
            { href: "/inventory/new", label: "Add Inventory", icon: "📦" },
            { href: "/shipping/new", label: "New Shipment", icon: "🚚" },
            { href: "/prescriptions/prescribers/new", label: "Add Prescriber", icon: "🩺" },
            { href: "/compounding/batches/new", label: "New Batch", icon: "⚗️" },
            { href: "/settings", label: "Settings", icon: "⚙️" },
          ].map((action) => (
            <Link key={action.href} href={action.href}
              className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-[#1B4F72] hover:bg-gray-50 transition-colors">
              <span className="text-lg">{action.icon}</span>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
