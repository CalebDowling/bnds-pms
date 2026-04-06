'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getItemLedger,
  recordManualTransaction,
  type ItemLedgerData,
} from '../actions';
import type { CSTransactionType } from '@/lib/compliance/controlled-substance-ledger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TX_TYPE_LABELS: Record<string, string> = {
  cs_receipt: 'Receipt',
  cs_dispense: 'Dispense',
  cs_return_to_stock: 'Return to Stock',
  cs_destruction: 'Destruction',
  cs_loss: 'Theft/Loss',
  cs_adjustment: 'Adjustment',
  cs_physical_count: 'Physical Count',
};

const TX_TYPE_COLORS: Record<string, string> = {
  cs_receipt: '#16a34a',
  cs_dispense: '#dc2626',
  cs_return_to_stock: '#2563eb',
  cs_destruction: '#9333ea',
  cs_loss: '#dc2626',
  cs_adjustment: '#ca8a04',
  cs_physical_count: '#6b7280',
};

function scheduleColor(schedule: number): string {
  switch (schedule) {
    case 2: return '#dc2626';
    case 3: return '#ea580c';
    case 4: return '#ca8a04';
    case 5: return '#2563eb';
    default: return '#6b7280';
  }
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString();
}

// ---------------------------------------------------------------------------
// SVG Running Balance Chart
// ---------------------------------------------------------------------------

function BalanceChart({ data }: { data: { date: Date; balance: number }[] }) {
  if (data.length < 2) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
        Not enough data points for chart
      </div>
    );
  }

  const width = 700;
  const height = 200;
  const padX = 50;
  const padY = 24;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const balances = data.map((d) => d.balance);
  const minB = Math.min(...balances, 0);
  const maxB = Math.max(...balances, 1);
  const range = maxB - minB || 1;

  const toX = (i: number) => padX + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => padY + chartH - ((v - minB) / range) * chartH;

  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.balance).toFixed(1)}`)
    .join(' ');

  // Grid lines
  const gridLines = 4;
  const gridStep = range / gridLines;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxHeight: '220px' }}>
      {/* Grid */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const val = minB + gridStep * i;
        const y = toY(val);
        return (
          <g key={i}>
            <line
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="4 4"
            />
            <text x={padX - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-secondary)">
              {Math.round(val)}
            </text>
          </g>
        );
      })}

      {/* Zero line */}
      {minB < 0 && (
        <line
          x1={padX}
          y1={toY(0)}
          x2={width - padX}
          y2={toY(0)}
          stroke="var(--text-secondary)"
          strokeWidth={1}
          opacity={0.5}
        />
      )}

      {/* Line */}
      <path d={pathD} fill="none" stroke="var(--green-700)" strokeWidth={2} />

      {/* Dots */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(d.balance)}
          r={3}
          fill="var(--green-700)"
        >
          <title>
            {formatDate(d.date)}: {d.balance}
          </title>
        </circle>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Record Transaction Form
// ---------------------------------------------------------------------------

const MANUAL_TX_TYPES: { value: CSTransactionType; label: string }[] = [
  { value: 'cs_receipt', label: 'Receipt (from wholesaler)' },
  { value: 'cs_dispense', label: 'Dispense' },
  { value: 'cs_return_to_stock', label: 'Return to Stock' },
  { value: 'cs_destruction', label: 'Destruction' },
  { value: 'cs_loss', label: 'Theft / Loss' },
  { value: 'cs_adjustment', label: 'Adjustment (+/-)' },
];

function RecordTransactionForm({
  itemId,
  onRecorded,
}: {
  itemId: string;
  onRecorded: () => void;
}) {
  const [txType, setTxType] = useState<CSTransactionType>('cs_receipt');
  const [quantity, setQuantity] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity) return;
    setSubmitting(true);
    try {
      const qty = parseInt(quantity, 10);
      await recordManualTransaction(
        itemId,
        txType,
        qty,
        reference || undefined,
        notes || undefined
      );
      setQuantity('');
      setReference('');
      setNotes('');
      onRecorded();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
        Record Transaction
      </h3>

      <div style={formGrid}>
        <div>
          <label style={labelStyle}>Type</label>
          <select
            value={txType}
            onChange={(e) => setTxType(e.target.value as CSTransactionType)}
            style={inputStyle}
          >
            {MANUAL_TX_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Reference (PO#, Fill ID, etc.)</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Optional"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="submit"
          disabled={!quantity || submitting}
          style={{
            ...btnPrimaryStyle,
            opacity: !quantity || submitting ? 0.5 : 1,
          }}
        >
          {submitting ? 'Recording...' : 'Record Transaction'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main Item Ledger Page
// ---------------------------------------------------------------------------

export default function ItemLedgerPage() {
  const params = useParams();
  const itemId = params.itemId as string;

  const [data, setData] = useState<ItemLedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const range =
        dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
      const result = await getItemLedger(itemId, range);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [itemId, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div style={pageStyle}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <p style={{ color: '#dc2626' }}>Error: {error}</p>
      </div>
    );
  }

  const balance = data!.balance;
  const transactions = data!.transactions;

  // Chart data
  const chartData = transactions
    .filter((t) => t.transactionType !== 'cs_physical_count')
    .map((t) => ({
      date: new Date(t.createdAt),
      balance: t.runningBalance,
    }));

  return (
    <div style={pageStyle}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          href="/compliance/controlled-substances"
          style={{ color: 'var(--green-700)', textDecoration: 'none', fontSize: '14px' }}
        >
          &larr; Back to Controlled Substances
        </Link>
      </div>

      {/* Item Header */}
      <div style={headerCard}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary)' }}>
              {balance.itemName}
            </h1>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 12px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#fff',
                backgroundColor: scheduleColor(balance.deaSchedule),
              }}
            >
              C-{balance.deaSchedule}
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            NDC: {balance.ndc}
            {balance.strength && <> &mdash; {balance.strength}</>}
            {balance.dosageForm && <> &mdash; {balance.dosageForm}</>}
          </p>
        </div>

        <div style={balanceBoxes}>
          <div style={balanceBox}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Current Balance</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green-700)' }}>
              {balance.calculatedBalance}
            </div>
          </div>
          <div style={balanceBox}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Last Count</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {balance.lastPhysicalCount ?? '\u2014'}
            </div>
          </div>
          {balance.discrepancy !== null && balance.discrepancy !== 0 && (
            <div style={{ ...balanceBox, borderColor: '#dc2626' }}>
              <div style={{ fontSize: '12px', color: '#dc2626' }}>Discrepancy</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626' }}>
                {balance.discrepancy > 0 ? '+' : ''}
                {balance.discrepancy}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Running Balance Chart */}
      <div style={sectionCard}>
        <h2 style={sectionTitle}>Running Balance</h2>
        <BalanceChart data={chartData} />
      </div>

      {/* Record Transaction */}
      <RecordTransactionForm itemId={itemId} onRecorded={fetchData} />

      {/* Date Filter */}
      <div style={sectionCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={sectionTitle}>Transaction History</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ ...inputStyle, fontSize: '13px' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ ...inputStyle, fontSize: '13px' }}
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                style={btnSmallSecondary}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Transaction Table */}
        <div style={{ overflow: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Type</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Balance</th>
                <th style={thStyle}>Reference</th>
                <th style={thStyle}>Performed By</th>
                <th style={thStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No transactions found
                  </td>
                </tr>
              ) : (
                [...transactions].reverse().map((tx) => {
                  const isPositive = tx.quantity > 0;
                  return (
                    <tr key={tx.id}>
                      <td style={{ ...tdStyle, fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {formatDate(tx.createdAt)}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: TX_TYPE_COLORS[tx.transactionType] ?? '#6b7280',
                            backgroundColor: `${TX_TYPE_COLORS[tx.transactionType] ?? '#6b7280'}15`,
                          }}
                        >
                          {TX_TYPE_LABELS[tx.transactionType] ?? tx.transactionType}
                        </span>
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          color: tx.transactionType === 'cs_physical_count'
                            ? 'var(--text-secondary)'
                            : isPositive
                            ? '#16a34a'
                            : '#dc2626',
                        }}
                      >
                        {tx.transactionType === 'cs_physical_count'
                          ? `(${tx.quantity})`
                          : isPositive
                          ? `+${tx.quantity}`
                          : tx.quantity}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 500 }}>
                        {tx.transactionType === 'cs_physical_count' ? '\u2014' : tx.runningBalance}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {tx.referenceId ?? '\u2014'}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '13px' }}>
                        {tx.performedByName ?? tx.performedBy ?? '\u2014'}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tx.notes ?? ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const pageStyle: React.CSSProperties = {
  padding: '24px 32px',
  maxWidth: '1200px',
  margin: '0 auto',
};

const headerCard: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '20px 24px',
  marginBottom: '20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '16px',
};

const balanceBoxes: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
};

const balanceBox: React.CSSProperties = {
  textAlign: 'center',
  padding: '10px 20px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  minWidth: '110px',
};

const sectionCard: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '20px 24px',
  marginBottom: '20px',
};

const sectionTitle: React.CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const formStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '20px 24px',
  marginBottom: '20px',
};

const formGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '12px',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '14px',
};

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
  borderBottom: '2px solid var(--border)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--border)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-primary)',
  marginBottom: '4px',
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: 'var(--green-700)',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};

const btnSmallSecondary: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '4px',
  border: '1px solid var(--border)',
  backgroundColor: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  cursor: 'pointer',
};
