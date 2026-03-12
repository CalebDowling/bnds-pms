import Link from "next/link";
import { getItems, getInventoryStats } from "./actions";
import { formatDate } from "@/lib/utils";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import { Suspense } from "react";

const CATEGORY_FILTERS = [
  { value: "all", label: "All Items" },
  { value: "compound_ingredient", label: "Compound Ingredients" },
  { value: "controlled", label: "Controlled" },
  { value: "refrigerated", label: "Refrigerated" },
];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const category = params.category || "all";

  const [{ items, total, pages }, stats] = await Promise.all([
    getItems({ search, category, page }),
    getInventoryStats(),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">{stats.totalItems} items in catalog</p>
        </div>
        <Link
          href="/inventory/new"
          className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors"
        >
          + Add Item
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Total Items</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalItems}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Active Lots</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalLots}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Expiring (90 days)</p>
          <p className={`text-2xl font-bold mt-1 ${stats.expiringSoon > 0 ? "text-orange-600" : "text-gray-900"}`}>
            {stats.expiringSoon}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Low Stock Items</p>
          <p className={`text-2xl font-bold mt-1 ${stats.lowStockItems > 0 ? "text-red-600" : "text-gray-900"}`}>
            {stats.lowStockItems}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-4 mb-3">
          <Suspense fallback={null}>
            <SearchBar placeholder="Search by name, NDC, or manufacturer..." basePath="/inventory" />
          </Suspense>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/inventory?category=${f.value}${search ? `&search=${search}` : ""}`}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                category === f.value
                  ? "bg-[#40721D] text-white border-[#40721D]"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Item Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">
              {search ? "No items match your search" : "No items yet"}
            </p>
            {!search && (
              <Link href="/inventory/new" className="text-[#40721D] text-sm font-medium hover:underline">
                Add your first item
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">NDC</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Strength</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Manufacturer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">On Hand</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reorder Pt</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Earliest Exp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${item.isLow ? "bg-red-50/50" : ""}`}>
                    <td className="px-4 py-3">
                      <Link href={`/inventory/${item.id}`} className="text-sm font-medium text-gray-900 hover:text-[#40721D]">
                        {item.name}
                      </Link>
                      {item.genericName && item.genericName !== item.name && (
                        <p className="text-xs text-gray-400">{item.genericName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.ndc || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.strength || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.manufacturer || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${item.isLow ? "text-red-600" : "text-gray-900"}`}>
                        {item.totalOnHand}
                      </span>
                      {item.unitOfMeasure && (
                        <span className="text-xs text-gray-400 ml-1">{item.unitOfMeasure}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.reorderPoint ? Number(item.reorderPoint) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.earliestExpiry ? formatDate(item.earliestExpiry) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.isCompoundIngredient && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 rounded">CPD</span>
                        )}
                        {item.isRefrigerated && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded">COLD</span>
                        )}
                        {item.deaSchedule && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 rounded">C-{item.deaSchedule}</span>
                        )}
                        {item.isLow && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-800 rounded">LOW</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Suspense fallback={null}>
            <Pagination total={total} pages={pages} page={page} basePath="/inventory" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
