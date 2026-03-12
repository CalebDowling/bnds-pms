import Link from "next/link";
import { getTransactions, getSessions, getPosStats } from "./actions";
import { formatDate } from "@/lib/utils";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import { Suspense } from "react";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || "transactions";
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);

  const stats = await getPosStats();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-sm text-gray-500 mt-1">Transactions, sessions, and register management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Today&apos;s Transactions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayTransactions}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Today&apos;s Revenue</p>
          <p className="text-2xl font-bold text-green-600 mt-1">${stats.todayRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Active Registers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeSessions}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <div className="flex gap-0">
          {[{ id: "transactions", label: "Transactions" }, { id: "sessions", label: "Sessions" }].map((t) => (
            <Link key={t.id} href={`/pos?tab=${t.id}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? "border-[#40721D] text-[#40721D]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>{t.label}</Link>
          ))}
        </div>
      </div>

      {tab === "transactions" ? (
        <TransactionsTab search={search} page={page} />
      ) : (
        <SessionsTab page={page} />
      )}
    </div>
  );
}

async function TransactionsTab({ search, page }: { search: string; page: number }) {
  const { transactions, total, pages } = await getTransactions({ search, page });

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by patient name or card last 4..." basePath="/pos?tab=transactions" />
        </Suspense>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {transactions.length === 0 ? (
          <div className="p-12 text-center"><p className="text-gray-400 text-lg">No transactions yet</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Items</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tax</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Payment</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(t.processedAt)}</td>
                    <td className="px-4 py-3">
                      {t.patient ? (
                        <>
                          <p className="text-sm text-gray-900">{t.patient.lastName}, {t.patient.firstName}</p>
                          <p className="text-xs text-gray-400 font-mono">{t.patient.mrn}</p>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Walk-in</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{t.transactionType.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t._count.lineItems}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">${Number(t.subtotal).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">${Number(t.tax).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">${Number(t.total).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 capitalize">{t.paymentMethod.replace(/_/g, " ")}</span>
                      {t.cardLastFour && <span className="text-xs text-gray-400 ml-1">****{t.cardLastFour}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.cashier.firstName} {t.cashier.lastName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Suspense fallback={null}><Pagination total={total} pages={pages} page={page} basePath="/pos?tab=transactions" /></Suspense>
        </div>
      </div>
    </>
  );
}

async function SessionsTab({ page }: { page: number }) {
  const { sessions, total, pages } = await getSessions({ page });

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {sessions.length === 0 ? (
        <div className="p-12 text-center"><p className="text-gray-400 text-lg">No register sessions yet</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Register</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Opened By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Opened At</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Opening $</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Closed At</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Closing $</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Txns</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{s.registerId}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.opener.firstName} {s.opener.lastName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(s.openedAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">${Number(s.openingBalance).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.closedAt ? formatDate(s.closedAt) : "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.closingBalance ? `$${Number(s.closingBalance).toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s._count.transactions}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                      s.status === "open" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="px-4 pb-4">
        <Suspense fallback={null}><Pagination total={total} pages={pages} page={page} basePath="/pos?tab=sessions" /></Suspense>
      </div>
    </div>
  );
}
