'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  getControlledSubstancesDashboard,
  recordPhysicalCount,
  type CSDashboardData,
} from './actions';
import type { CSBalance } from '@/lib/compliance/controlled-substance-ledger';

// ---------------------------------------------------------------------------
// Schedule color helpers
// ---------------------------------------------------------------------------

function scheduleColor(schedule: number): string {
  switch (schedule) {
    case 2:
      return '#dc2626'; // red
    case 3:
      return '#ea580c'; // orange
    case 4:
      return '#ca8a04'; // yellow-700
    case 5:
      return '#2563eb'; // blue
    default:
      return '#6b7280'; // gray
  }
}

function scheduleBadgeBg(schedule: number): string {
  switch (schedule) {
    case 2:
      return '#fef2f2';
    case 3:
      return '#fff7ed';
    case 4:
      return '#fefce8';
    case 5:
      return '#eff6ff';
    default:
      return '#f9fafb';
  }
}

function scheduleLabel(schedule: number): string {
  return schedule >= 2 && schedule <= 5 ? `C-${schedule}` : `Sch ${schedule}`;
}

// ---------------------------------------------------------------------------
// Physical Count Modal
// ---------------------------------------------------------------------------

function PhysicalCountModal({
  item,
  onClose,
  onSubmit,
}: {
  item: CSBalance;
  onClose: () => void;
  onSubmit: (count: number, notes: string) => void;
}) {
  const [count, setCount] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
          Record Physical Count
        </h3>
        <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
          {item.itemName} ({item.ndc}) &mdash; Current calculated balance:{' '}
          <strong>{item.calculatedBalance}</strong>
        </p>

        <label style={labelStyle}>Count</label>
        <input
          type="number"
          min={0}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          placeholder="Enter physical count"
          style={inputStyle}
          autoFocus
        />

        <label style={labelStyle}>Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Counted by RPh Smith"
          style={inputStyle}
        />

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose} style={btnSecondaryStyle}>
            Cancel
          </button>
          <button
            onClick={() => {
              if (count === '') return;
              onSubmit(parseInt(count, 10), notes);
            }}
            disabled={count === ''}
            style={{
              ...btnPrimaryStyle,
              opacity: count === '' ? 0.5 : 1,
            }}
          >
            Record Count
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function ControlledSubstancesDashboard() {
  const [data, setData] = useState<CSDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<number | null>(null);
  const [countItem, setCountItem] = useState<CSBalance | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getControlledSubstancesDashboard();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePhysicalCount = async (count: number, notes: string) => {
    if (!countItem) return;
    try {
      const result = await recordPhysicalCount(countItem.itemId, count, notes);
      if (result.discrepancy !== null) {
        alert(
          `Discrepancy detected: Calculated balance differs from physical count by ${result.discrepancy} units.`
        );
      }
      setCountItem(null);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record count');
    }
  };

  // Filter items
  const filteredItems = (data?.items ?? []).filter((item) => {
    const matchesSearch =
      search === '' ||
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.ndc.toLowerCase().includes(search.toLowerCase());
    const matchesSchedule =
      scheduleFilter === null || item.deaSchedule === scheduleFilter;
    return matchesSearch && matchesSchedule;
  });

  if (loading) {
    return (
      <div style={pageStyle}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading controlled substances...</p>
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

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)' }}>
            Controlled Substances
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            DEA perpetual inventory &mdash; Schedules II through V
          </p>
        </div>
        <Link href="/compliance/controlled-substances/biennial" style={btnPrimaryStyle}>
          Biennial Report
        </Link>
      </div>

      {/* Summary Cards */}
      <div style={cardsRow}>
        <SummaryCard
          label="Total Controlled Items"
          value={data?.totalControlledItems ?? 0}
          color="var(--green-700)"
        />
        <SummaryCard
          label="Discrepancies"
          value={data?.itemsWithDiscrepancies ?? 0}
          color={data?.itemsWithDiscrepancies ? '#dc2626' : 'var(--green-700)'}
        />
        <SummaryCard
          label="Schedule II Items"
          value={data?.scheduleIICount ?? 0}
          color="#dc2626"
        />
        <SummaryCard
          label="Transactions Today"
          value={data?.transactionsToday ?? 0}
          color="var(--text-primary)"
        />
      </div>

      {/* Filters */}
      <div style={filterRow}>
        <input
          type="text"
          placeholder="Search by name or NDC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, maxWidth: '360px' }}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          <FilterChip
            label="All"
            active={scheduleFilter === null}
            onClick={() => setScheduleFilter(null)}
          />
          <FilterChip
            label="C-II"
            active={scheduleFilter === 2}
            onClick={() => setScheduleFilter(2)}
            color="#dc2626"
          />
          <FilterChip
            label="C-III"
            active={scheduleFilter === 3}
            onClick={() => setScheduleFilter(3)}
            color="#ea580c"
          />
          <FilterChip
            label="C-IV"
            active={scheduleFilter === 4}
            onClick={() => setScheduleFilter(4)}
            color="#ca8a04"
          />
          <FilterChip
            label="C-V"
            active={scheduleFilter === 5}
            onClick={() => setScheduleFilter(5)}
            color="#2563eb"
          />
        </div>
      </div>

      {/* Balance Table */}
      <div style={tableContainer}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Item Name</th>
              <th style={thStyle}>NDC</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Schedule</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Balance</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Last Count</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Discrepancy</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Last Tx</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No controlled substances found
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.itemId} style={rowHover}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '4px',
                          height: '28px',
                          borderRadius: '2px',
                          backgroundColor: scheduleColor(item.deaSchedule),
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {item.itemName}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px' }}>
                    {item.ndc}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: scheduleColor(item.deaSchedule),
                        backgroundColor: scheduleBadgeBg(item.deaSchedule),
                        border: `1px solid ${scheduleColor(item.deaSchedule)}30`,
                      }}
                    >
                      {scheduleLabel(item.deaSchedule)}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                    {item.calculatedBalance}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {item.lastPhysicalCount !== null ? item.lastPhysicalCount : '\u2014'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {item.discrepancy !== null && item.discrepancy !== 0 ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#fff',
                          backgroundColor: '#dc2626',
                        }}
                      >
                        {item.discrepancy > 0 ? '+' : ''}
                        {item.discrepancy}
                      </span>
                    ) : item.discrepancy === 0 ? (
                      <span style={{ color: 'var(--green-700)', fontSize: '13px' }}>OK</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>&mdash;</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {item.lastTransactionDate
                      ? new Date(item.lastTransactionDate).toLocaleDateString()
                      : '\u2014'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => setCountItem(item)}
                        style={btnSmallStyle}
                        title="Record physical count"
                      >
                        Record Count
                      </button>
                      <Link
                        href={`/compliance/controlled-substances/${item.itemId}`}
                        style={{
                          ...btnSmallStyle,
                          backgroundColor: 'transparent',
                          color: 'var(--green-700)',
                          border: '1px solid var(--green-700)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        View Ledger
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Physical Count Modal */}
      {countItem && (
        <PhysicalCountModal
          item={countItem}
          onClose={() => setCountItem(null)}
          onSubmit={handlePhysicalCount}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px',
        borderRadius: '16px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        border: active
          ? `2px solid ${color ?? 'var(--green-700)'}`
          : '1px solid var(--border)',
        backgroundColor: active
          ? `${color ?? 'var(--green-700)'}15`
          : 'transparent',
        color: active ? color ?? 'var(--green-700)' : 'var(--text-secondary)',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const pageStyle: React.CSSProperties = {
  padding: '24px 32px',
  maxWidth: '1400px',
  margin: '0 auto',
};

const cardsRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
  marginBottom: '24px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '16px 20px',
};

const filterRow: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  marginBottom: '16px',
  flexWrap: 'wrap',
};

const tableContainer: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  overflow: 'auto',
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
  whiteSpace: 'nowrap',
};

const rowHover: React.CSSProperties = {
  transition: 'background 0.1s',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
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
  textDecoration: 'none',
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  backgroundColor: 'transparent',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};

const btnSmallStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '4px',
  border: 'none',
  backgroundColor: 'var(--green-700)',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-primary)',
  marginBottom: '4px',
  marginTop: '12px',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '24px',
  minWidth: '420px',
  maxWidth: '500px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};
