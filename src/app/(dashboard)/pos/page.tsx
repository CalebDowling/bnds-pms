import Link from "next/link";
import { Receipt, DollarSign, Monitor } from "lucide-react";
import { getTransactions, getSessions, getPosStats } from "./actions";
import { formatDate } from "@/lib/utils";
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
              accent: "var(--color-primary)",
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
            <>
              {tabs.map((t) => (
                <Link
                  key={t.id}
                  href={`/pos?tab=${t.id}`}
                  className="px-4 py-1.5 text-xs font-semibold rounded-full border no-underline transition-colors"
                  style={{
                    backgroundColor: tab === t.id ? "var(--color-primary)" : "transparent",
                    color: tab === t.id ? "#fff" : "var(--text-secondary)",
                    borderColor: tab === t.id ? "var(--color-primary)" : "var(--border)",
                  }}
                >
                  {t.label}
                </Link>
              ))}
            </>
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
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
    >
      {transactions.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-lg" style={{ color: "var(--text-muted)" }}>No transactions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--green-50)" }}>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Items</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Subtotal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Tax</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Payment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Cashier</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, idx) => (
                <tr
                  key={t.id}
                  className="transition-colors"
                  style={{ borderTop: idx > 0 ? "1px solid var(--border-light)" : undefined }}
                >
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{formatDate(t.processedAt)}</td>
                  <td className="px-4 py-3">
                    {t.patient ? (
                      <>
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t.patient.lastName}, {t.patient.firstName}</p>
                        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{t.patient.mrn}</p>
                      </>
                    ) : (
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>Walk-in</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{t.transactionType.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>{t._count.lineItems}</td>
                  <td className="px-4 py-3 text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>${Number(t.subtotal).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>${Number(t.tax).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>${Number(t.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{t.paymentMethod.replace(/_/g, " ")}</span>
                    {t.cardLastFour && (
                      <span className="text-xs ml-1 font-mono" style={{ color: "var(--text-muted)" }}>****{t.cardLastFour}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{t.cashier.firstName} {t.cashier.lastName}</td>
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
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
    >
      {sessions.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-lg" style={{ color: "var(--text-muted)" }}>No register sessions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--green-50)" }}>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Register</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Opened By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Opened At</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Opening $</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Closed At</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Closing $</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Txns</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, idx) => (
                <tr
                  key={s.id}
                  className="transition-colors"
                  style={{ borderTop: idx > 0 ? "1px solid var(--border-light)" : undefined }}
                >
                  <td className="px-4 py-3 text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{s.registerId}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{s.opener.firstName} {s.opener.lastName}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{formatDate(s.openedAt)}</td>
                  <td className="px-4 py-3 text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>${Number(s.openingBalance).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{s.closedAt ? formatDate(s.closedAt) : "—"}</td>
                  <td className="px-4 py-3 text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>{s.closingBalance ? `$${Number(s.closingBalance).toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3 text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>{s._count.transactions}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full"
                      style={{
                        backgroundColor: s.status === "open" ? "var(--green-100)" : "rgba(0,0,0,0.05)",
                        color: s.status === "open" ? "var(--green-700)" : "var(--text-muted)",
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
