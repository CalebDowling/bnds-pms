import Link from "next/link";
import { getOptimizationDashboard } from "./actions";
import { ApplyButton } from "./ApplyButton";
import { formatDate } from "@/lib/utils/formatters";

function formatCurrency(val: number | null): string {
  if (val === null || val === undefined) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(val);
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border-red-200",
    urgent: "bg-orange-100 text-orange-700 border-orange-200",
    standard: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${styles[priority] ?? styles.standard}`}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

export default async function InventoryOptimizationPage() {
  const data = await getOptimizationDashboard();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Inventory Optimization
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-driven reorder analysis across {data.totalItemsAnalyzed} active
            items &middot; {data.analysisWindowDays}-day window
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Inventory
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-stat rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">
            Below Reorder Point
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${data.itemsBelowReorderPoint > 0 ? "text-red-600" : "text-gray-900"}`}
          >
            {data.itemsBelowReorderPoint}
          </p>
          <p className="text-xs text-gray-400 mt-1">items need reorder</p>
        </div>
        <div className="glass-stat rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">
            Dead Stock Items
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${data.deadStockCount > 0 ? "text-orange-600" : "text-gray-900"}`}
          >
            {data.deadStockCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">no movement 90+ days</p>
        </div>
        <div className="glass-stat rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">
            Fast Movers
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {data.fastMoverCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">top 20% by volume</p>
        </div>
        <div className="glass-stat rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">
            Est. Monthly Savings
          </p>
          <p className="text-2xl font-bold text-[#40721D] mt-1">
            {formatCurrency(data.costSavings.totalEstimatedMonthlySavings)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            carrying {formatCurrency(data.costSavings.carryingCostReduction)}{" "}
            &middot; stockout{" "}
            {formatCurrency(data.costSavings.stockoutPreventionSavings)}
          </p>
        </div>
      </div>

      {/* Reorder Recommendations Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Reorder Recommendations
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {data.recommendations.length} items sorted by priority
          </p>
        </div>
        {data.recommendations.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400">
            All items are adequately stocked. No reorder recommendations at this
            time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase">
                    Item
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase">
                    NDC
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase text-right">
                    On Hand
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase text-right">
                    Reorder Pt
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase text-right">
                    Order Qty
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase text-right">
                    Daily Usage
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase text-right">
                    Days Left
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase">
                    Priority
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase text-right">
                    Est. Cost
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recommendations.map((r) => (
                  <tr
                    key={r.itemId}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/inventory/${r.itemId}`}
                        className="font-medium text-gray-900 hover:text-[#40721D] transition-colors"
                      >
                        {r.itemName}
                      </Link>
                      {r.genericName && r.genericName !== r.itemName && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                          {r.genericName}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-500 font-mono text-xs">
                      {r.ndc ?? "--"}
                    </td>
                    <td className="px-3 py-3 text-right font-medium">
                      <span
                        className={
                          r.currentStock <= 0
                            ? "text-red-600"
                            : r.currentStock <= r.calculatedReorderPoint
                              ? "text-orange-600"
                              : "text-gray-900"
                        }
                      >
                        {r.currentStock}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700">
                      {r.calculatedReorderPoint}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-[#40721D]">
                      {r.calculatedReorderQty}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-500">
                      {r.averageDailyUsage}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={
                          r.daysOfStockRemaining !== null &&
                          r.daysOfStockRemaining < 3
                            ? "text-red-600 font-semibold"
                            : "text-gray-500"
                        }
                      >
                        {r.daysOfStockRemaining ?? "--"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700">
                      {formatCurrency(r.estimatedCost)}
                    </td>
                    <td className="px-3 py-3">
                      <ApplyButton
                        itemId={r.itemId}
                        reorderPoint={r.calculatedReorderPoint}
                        reorderQty={r.calculatedReorderQty}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two-column layout for Dead Stock + Fast Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dead Stock Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Dead Stock</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {data.deadStock.length} items with no dispensing in 90+ days
            </p>
          </div>
          {data.deadStock.length === 0 ? (
            <div className="px-5 py-12 text-center text-gray-400">
              No dead stock detected.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase">
                      Item
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase">
                      Last Dispensed
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase text-right">
                      Qty On Hand
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase text-right">
                      Carrying Cost/mo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.deadStock.slice(0, 25).map((d) => (
                    <tr
                      key={d.itemId}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/inventory/${d.itemId}`}
                          className="font-medium text-gray-900 hover:text-[#40721D] transition-colors"
                        >
                          {d.itemName}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-gray-500">
                        {formatDate(d.lastDispensedDate)}
                        {d.daysSinceLastDispensed !== null && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({d.daysSinceLastDispensed}d ago)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700">
                        {d.quantityOnHand}
                      </td>
                      <td className="px-3 py-3 text-right text-orange-600 font-medium">
                        {formatCurrency(d.carryingCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.deadStock.length > 25 && (
                <div className="px-5 py-3 text-center text-xs text-gray-400 border-t border-gray-100">
                  Showing 25 of {data.deadStock.length} dead stock items
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fast Movers Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Fast Movers
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Top {data.fastMovers.length} items by dispensing volume (top 20%)
            </p>
          </div>
          {data.fastMovers.length === 0 ? (
            <div className="px-5 py-12 text-center text-gray-400">
              No dispensing data available to determine fast movers.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase">
                      Item
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase text-right">
                      Daily Velocity
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase text-right">
                      90-Day Total
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase text-right">
                      Days of Stock
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.fastMovers.slice(0, 25).map((f) => (
                    <tr
                      key={f.itemId}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/inventory/${f.itemId}`}
                          className="font-medium text-gray-900 hover:text-[#40721D] transition-colors"
                        >
                          {f.itemName}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-gray-700">
                        {f.dailyVelocity}
                        <span className="text-xs text-gray-400 ml-1">
                          /day
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-500">
                        {f.totalDispensed90}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={
                            f.daysOfStockRemaining !== null &&
                            f.daysOfStockRemaining < 7
                              ? "text-red-600 font-semibold"
                              : f.daysOfStockRemaining !== null &&
                                  f.daysOfStockRemaining < 14
                                ? "text-orange-600 font-medium"
                                : "text-gray-700"
                          }
                        >
                          {f.daysOfStockRemaining ?? "--"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.fastMovers.length > 25 && (
                <div className="px-5 py-3 text-center text-xs text-gray-400 border-t border-gray-100">
                  Showing 25 of {data.fastMovers.length} fast-moving items
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cost Breakdown Footer */}
      <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Cost Analysis Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase font-semibold">
              Carrying Cost Reduction
            </p>
            <p className="text-gray-900 font-medium">
              {formatCurrency(data.costSavings.carryingCostReduction)}
              <span className="text-xs text-gray-400 ml-1">/month</span>
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-semibold">
              Stockout Prevention
            </p>
            <p className="text-gray-900 font-medium">
              {formatCurrency(data.costSavings.stockoutPreventionSavings)}
              <span className="text-xs text-gray-400 ml-1">/month</span>
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-semibold">
              Dead Stock Carrying Cost
            </p>
            <p className="text-orange-600 font-medium">
              {formatCurrency(data.costSavings.deadStockCarryingCost)}
              <span className="text-xs text-gray-400 ml-1">/month</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
