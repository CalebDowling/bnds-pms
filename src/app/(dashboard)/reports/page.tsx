import { getDailyFillReport, getInventoryReport, getBatchReport } from "./actions";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import ReportsExportButton from "@/components/dashboard/ReportsExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";

async function ReportsPageContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; date?: string; startDate?: string; endDate?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || "fills";

  const TABS = [
    { id: "fills", label: "Daily Fills" },
    { id: "inventory", label: "Inventory" },
    { id: "batches", label: "Batch Log" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Pharmacy operations reports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {TABS.map((t) => (
          <Link key={t.id} href={`/reports?tab=${t.id}`}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "fills" && <DailyFillsTab date={params.date} />}
      {tab === "inventory" && <InventoryTab />}
      {tab === "batches" && <BatchTab startDate={params.startDate} endDate={params.endDate} />}
    </div>
  );
}

async function DailyFillsTab({ date }: { date?: string }) {
  const targetDate = date || new Date().toISOString().split("T")[0];
  const fills = await getDailyFillReport(targetDate);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <form className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Date:</label>
          <input type="date" name="date" defaultValue={targetDate}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
          <input type="hidden" name="tab" value="fills" />
          <button type="submit" className="px-3 py-1.5 bg-[#40721D] text-white text-sm rounded-lg hover:bg-[#2D5114]">Go</button>
        </form>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{fills.length} fill(s) on {targetDate}</p>
          <ReportsExportButton tab="fills" date={targetDate} />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rx#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Drug / Formula</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lot / Batch</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fill #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fills.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No fills for this date</td></tr>
            ) : fills.map((fill: any) => (
              <tr key={fill.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(fill.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-[#40721D]">
                  <Link href={`/prescriptions/${fill.prescription.id}`} className="hover:underline">
                    {fill.prescription.rxNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {fill.prescription.patient.lastName}, {fill.prescription.patient.firstName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {fill.prescription.item?.name || fill.prescription.formula?.name || "—"}
                  {fill.prescription.item?.strength && <span className="text-gray-400 ml-1">{fill.prescription.item.strength}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{Number(fill.quantity)}</td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                  {fill.itemLot?.lotNumber || fill.batch?.batchNumber || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  #{fill.fillNumber} {fill.fillNumber === 0 ? "(Orig)" : "(Refill)"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                    fill.status === "dispensed" ? "bg-green-50 text-green-700"
                      : fill.status === "pending" ? "bg-yellow-50 text-yellow-700"
                      : "bg-blue-50 text-blue-700"
                  }`}>{fill.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function InventoryTab() {
  const items = await getInventoryReport();
  const lowStock = items.filter(i => i.isLow);
  const expiring = items.filter(i => {
    if (!i.earliestExp) return false;
    const d = new Date(i.earliestExp);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 90 && diff > 0;
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="grid grid-cols-4 gap-4 flex-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Total Items</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{items.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <p className="text-xs font-semibold text-red-400 uppercase">Low Stock</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{lowStock.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-yellow-200 p-4">
            <p className="text-xs font-semibold text-yellow-500 uppercase">Expiring (90d)</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{expiring.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Compound Items</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{items.filter(i => i.isCompoundIngredient).length}</p>
          </div>
        </div>
        <ReportsExportButton tab="inventory" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">NDC</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">On Hand</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reorder Pt</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lots</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Earliest Exp</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className={`hover:bg-gray-50 ${item.isLow ? "bg-red-50" : ""}`}>
                <td className="px-4 py-3">
                  <Link href={`/inventory/${item.id}`} className="text-sm font-medium text-[#40721D] hover:underline">
                    {item.name}
                  </Link>
                  {item.strength && <p className="text-xs text-gray-400">{item.strength}</p>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.ndc || "—"}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {item.totalOnHand} {item.unitOfMeasure || ""}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.reorderPoint ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.lotCount}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {item.earliestExp ? formatDate(item.earliestExp) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {item.isLow && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">LOW</span>}
                    {item.isCompoundIngredient && <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">CPD</span>}
                    {item.isRefrigerated && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">COLD</span>}
                    {item.isControlled && <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">C-II</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function BatchTab({ startDate, endDate }: { startDate?: string; endDate?: string }) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const end = endDate || new Date().toISOString().split("T")[0];
  const batches = await getBatchReport(start, end);

  const STATUS_COLORS: Record<string, string> = {
    in_progress: "bg-yellow-50 text-yellow-700",
    completed: "bg-blue-50 text-blue-700",
    verified: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <form className="flex items-center gap-2">
          <label className="text-sm text-gray-600">From:</label>
          <input type="date" name="startDate" defaultValue={start}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
          <label className="text-sm text-gray-600">To:</label>
          <input type="date" name="endDate" defaultValue={end}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
          <input type="hidden" name="tab" value="batches" />
          <button type="submit" className="px-3 py-1.5 bg-[#40721D] text-white text-sm rounded-lg hover:bg-[#2D5114]">Go</button>
        </form>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{batches.length} batch(es)</p>
          <ReportsExportButton tab="batches" startDate={start} endDate={end} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Batch #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Formula</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">BUD</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Compounder</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">QA</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fills</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {batches.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No batches in this range</td></tr>
            ) : batches.map((b: any) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/compounding/batches/${b.id}`} className="text-sm font-mono text-[#40721D] hover:underline">
                    {b.batchNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {b.formulaVersion.formula.name}
                  <span className="text-gray-400 ml-1 text-xs">{b.formulaVersion.formula.formulaCode}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{Number(b.quantityPrepared)} {b.unit}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(b.budDate)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{b.compounder.firstName} {b.compounder.lastName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{b._count.qa}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{b._count.fills}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-700"}`}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; date?: string; startDate?: string; endDate?: string }>;
}) {
  return (
    <PermissionGuard resource="reports" action="read">
      <ReportsPageContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
