import Link from "next/link";
import { Receipt, DollarSign, Monitor } from "lucide-react";
import { getTransactions, getSessions, getPosStats } from "./actions";
import { formatDate } from "@/lib/utils";
import { formatPatientName } from "@/lib/utils/formatters";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import StatsRow from "@/components/layout/StatsRow";
import { Suspense } from "react";

async function PosPageContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || "transactions";
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);

  const stats = await getPosStats();

  const tabs = [
    { id: "transactions", label: "Transactions" },
    { id: "sessions", label: "Sessions" },
  ];

  return (
    <PageShell
      eyebrow="Operations"
      title="Point of Sale"
      subtitle="Transactions, sessions, and register management"
      stats={
        <StatsRow
          stats={[
            {
              label: "Today's Transactions",
              value: stats.todayTransactions,
              icon: <Receipt size={12} />,
            },
            {
              label: "Today's Revenue",
              value: `$${stats.todayRevenue.toFixed(2)}`,
              icon: <DollarSign size={12} />,
              accent: "#1f5a3a",
            },
            {
              label: "Active Registers",
              value: stats.activeSessions,
              icon: <Monitor size={12} />,
            },
          ]}
        />
      }
      toolbar={
        <FilterBar
          filters={
            <div
              className="inline-flex items-center"
              style={{
                gap: 2,
                padding: 3,
                backgroundColor: "#f3efe7",
                borderRadius: 8,
                border: "1px solid #e3ddd1",
              }}
            >
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <Link
                    key={t.id}
                    href={`/pos?tab=${t.id}`}
                    className="inline-flex items-center no-underline transition-all"
                    style={{
                      padding: "6px 12px",
                      fontSize: 12.5,
                      fontWeight: active ? 600 : 500,
                      color: active ? "#14201a" : "#6b7a72",
                      backgroundColor: active ? "#ffffff" : "transparent",
                      borderRadius: 6,
                      boxShadow: active
                        ? "0 1px 0 rgba(20,32,26,0.04), 0 1px 2px rgba(20,32,26,0.04)"
                        : "none",
                    }}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>
          }
          search={
            tab === "transactions" ? (
              <Suspense fallback={null}>
                <SearchBar
                  placeholder="Search by patient name or card last 4..."
                  basePath="/pos?tab=transactions"
                />
              </Suspense>
            ) : undefined
          }
        />
      }
    >
      {tab === "transactions" ? (
        <TransactionsTab search={search} page={page} />
      ) : (
        <SessionsTab page={page} />
      )}
    </PageShell>
  );
}

async function TransactionsTab({ search, page }: { search: string; page: number }) {
  const { transactions, total, pages } = await getTransactions({ search, page });

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
    >
      {transactions.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-lg" style={{ color: "#7a8a78" }}>No transactions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e3ddd1", backgroundColor: "#f4ede0" }}>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Date</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Patient</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Type</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Items</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Subtotal</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Tax</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Total</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Payment</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Cashier</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, idx) => (
                <tr
                  key={t.id}
                  className="transition-colors"
                  style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}
                >
                  <td className="px-4 py-3" style={{ color: "#3a4a3c" }}>{formatDate(t.processedAt)}</td>
                  <td className="px-4 py-3">
                    {t.patient ? (
                      <>
                        <p style={{ color: "#0f2e1f", fontWeight: 500 }}>{formatPatientName({ firstName: t.patient.firstName, lastName: t.patient.lastName }, { format: "last-first" })}</p>
                        <p style={{ color: "#7a8a78", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{t.patient.mrn}</p>
                      </>
                    ) : (
                      <span style={{ color: "#7a8a78" }}>Walk-in</span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize" style={{ color: "#3a4a3c" }}>{t.transactionType.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "#3a4a3c" }}>{t._count.lineItems}</td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "#3a4a3c" }}>${Number(t.subtotal).toFixed(2)}</td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "#3a4a3c" }}>${Number(t.tax).toFixed(2)}</td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "#0f2e1f", fontWeight: 600 }}>${Number(t.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize" style={{ color: "#3a4a3c" }}>{t.paymentMethod.replace(/_/g, " ")}</span>
                    {t.cardLastFour && (
                      <span className="ml-1" style={{ color: "#7a8a78", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>****{t.cardLastFour}</span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#3a4a3c" }}>{formatPatientName({ firstName: t.cashier.firstName, lastName: t.cashier.lastName })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="px-4 pb-4">
        <Suspense fallback={null}>
          <Pagination total={total} pages={pages} page={page} basePath="/pos?tab=transactions" />
        </Suspense>
      </div>
    </div>
  );
}

async function SessionsTab({ page }: { page: number }) {
  const { sessions, total, pages } = await getSessions({ page });

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
    >
      {sessions.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-lg" style={{ color: "#7a8a78" }}>No register sessions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e3ddd1", backgroundColor: "#f4ede0" }}>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Register</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Opened By</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Opened At</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Opening $</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Closed At</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Closing $</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Txns</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, idx) => (
                <tr
                  key={s.id}
                  className="transition-colors"
                  style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}
                >
                  <td className="px-4 py-3" style={{ color: "#0f2e1f", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 600, fontSize: 13 }}>{s.registerId}</td>
                  <td className="px-4 py-3" style={{ color: "#3a4a3c" }}>{formatPatientName({ firstName: s.opener.firstName, lastName: s.opener.lastName })}</td>
                  <td className="px-4 py-3" style={{ color: "#3a4a3c" }}>{formatDate(s.openedAt)}</td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "#3a4a3c" }}>${Number(s.openingBalance).toFixed(2)}</td>
                  <td className="px-4 py-3" style={{ color: "#3a4a3c" }}>{s.closedAt ? formatDate(s.closedAt) : "—"}</td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "#3a4a3c" }}>{s.closingBalance ? `$${Number(s.closingBalance).toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "#3a4a3c" }}>{s._count.transactions}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center capitalize"
                      style={{
                        backgroundColor: s.status === "open" ? "rgba(90,168,69,0.14)" : "rgba(122,138,120,0.14)",
                        color: s.status === "open" ? "#2d6a1f" : "#5a6b58",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="px-4 pb-4">
        <Suspense fallback={null}>
          <Pagination total={total} pages={pages} page={page} basePath="/pos?tab=sessions" />
        </Suspense>
      </div>
    </div>
  );
}

export default function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; page?: string }>;
}) {
  return (
    <PermissionGuard resource="pos" action="read">
      <PosPageContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
