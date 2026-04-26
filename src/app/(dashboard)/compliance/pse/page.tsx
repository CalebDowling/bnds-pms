'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPseDashboard, searchBuyer, type PseDashboardData } from './actions';
import type { PsePurchaseRecord } from '@/lib/compliance/pse-tracking';
import NewSaleForm from './NewSaleForm';
import { formatDate } from '@/lib/utils/formatters';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getLimitColor(percent: number): string {
  if (percent > 90) return 'var(--red-600, #dc2626)';
  if (percent > 75) return 'var(--yellow-600, #ca8a04)';
  return 'var(--green-700, #15803d)';
}

function getLimitBg(percent: number): string {
  if (percent > 90) return 'rgba(220, 38, 38, 0.08)';
  if (percent > 75) return 'rgba(202, 138, 4, 0.08)';
  return 'rgba(21, 128, 61, 0.08)';
}

export default function PseTrackingPage() {
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewSale, setShowNewSale] = useState(false);
  const [data, setData] = useState<PseDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<PsePurchaseRecord[] | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPseDashboard(startDate, endDate);
      setData(result);
    } catch (err) {
      console.error('Failed to load PSE data:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const result = await searchBuyer(searchQuery);
    setSearchResults(result.records);
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
    }
  }, [searchQuery]);

  const displayRecords = searchResults ?? data?.report.records ?? [];
  const report = data?.report;

  // Build daily totals per buyer for the "daily total" column
  const dailyTotals: Record<string, number> = {};
  if (report) {
    for (const r of report.records) {
      if (r.blocked) continue;
      const dayKey = r.buyerName.toLowerCase() + '|' + r.dateTime.split('T')[0];
      dailyTotals[dayKey] = (dailyTotals[dayKey] ?? 0) + r.quantityGrams;
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: '24px', fontWeight: 800,
            color: 'var(--text-primary, #111827)',
          }}>
            PSE Tracking Log
          </h1>
          <p style={{
            margin: '4px 0 0', fontSize: '14px',
            color: 'var(--text-primary, #6b7280)',
          }}>
            Combat Methamphetamine Epidemic Act (CMEA) Compliance
          </p>
        </div>
        <button
          onClick={() => setShowNewSale(true)}
          style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            backgroundColor: 'var(--green-700, #15803d)', color: '#ffffff',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          + New PSE Sale
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px',
        marginBottom: '24px',
      }}>
        <StatCard
          label="Sales Today"
          value={report?.totalSales ?? 0}
          suffix="transactions"
          color="var(--green-700, #15803d)"
        />
        <StatCard
          label="Grams Today"
          value={report?.totalGrams ?? 0}
          suffix="g dispensed"
          color="var(--green-700, #15803d)"
          format="decimal"
        />
        <StatCard
          label="Blocked Attempts"
          value={report?.blockedAttempts ?? 0}
          suffix="denied"
          color={report && report.blockedAttempts > 0 ? 'var(--red-600, #dc2626)' : 'var(--green-700, #15803d)'}
        />
        <StatCard
          label="30-Day Total"
          value={report?.thirtyDayGrams ?? 0}
          suffix="g (all buyers)"
          color="var(--text-primary, #374151)"
          format="decimal"
        />
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'flex-end',
        marginBottom: '20px', flexWrap: 'wrap',
      }}>
        <div>
          <label style={filterLabelStyle}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={filterInputStyle}
          />
        </div>
        <div>
          <label style={filterLabelStyle}>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={filterInputStyle}
          />
        </div>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={filterLabelStyle}>Search Buyer (Name or ID)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name or ID number..."
              style={{ ...filterInputStyle, flex: 1 }}
            />
            <button
              onClick={handleSearch}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: 'none',
                backgroundColor: 'var(--green-700, #15803d)', color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Search
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            setStartDate(todayStr());
            setEndDate(todayStr());
            setSearchQuery('');
            setSearchResults(null);
          }}
          style={{
            padding: '8px 16px', borderRadius: '6px',
            border: '1px solid var(--border, #d1d5db)',
            backgroundColor: 'var(--card-bg, #fff)',
            color: 'var(--text-primary, #374151)',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Reset
        </button>
      </div>

      {/* Search results indicator */}
      {searchResults !== null && (
        <div style={{
          padding: '8px 16px', borderRadius: '8px', marginBottom: '16px',
          backgroundColor: 'rgba(21, 128, 61, 0.08)',
          fontSize: '13px', color: 'var(--green-700, #15803d)', fontWeight: 600,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Showing {searchResults.length} result(s) for &quot;{searchQuery}&quot;</span>
          <button
            onClick={() => { setSearchQuery(''); setSearchResults(null); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--green-700, #15803d)', fontWeight: 600, fontSize: '13px',
              textDecoration: 'underline',
            }}
          >
            Clear search
          </button>
        </div>
      )}

      {/* Sales Table */}
      <div style={{
        backgroundColor: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: '12px', overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border, #e5e7eb)',
          fontSize: '15px', fontWeight: 700,
          color: 'var(--text-primary, #111827)',
        }}>
          PSE Sales {startDate === endDate && startDate === todayStr() ? 'Today' : `${formatDate(startDate)} - ${formatDate(endDate)}`}
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-primary, #6b7280)' }}>
            Loading PSE records...
          </div>
        ) : displayRecords.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-primary, #6b7280)' }}>
            No PSE sales recorded for this period.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--card-bg, #f9fafb)' }}>
                  {['Time', 'Buyer Name', 'DOB', 'ID', 'Product', 'Qty (g)', 'Daily Total', 'Seller', 'Status'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRecords.map((record) => {
                  const dayKey = record.buyerName.toLowerCase() + '|' + record.dateTime.split('T')[0];
                  const dayTotal = dailyTotals[dayKey] ?? record.quantityGrams;
                  const dayPercent = (dayTotal / 3.6) * 100;

                  return (
                    <tr
                      key={record.id}
                      style={{
                        borderBottom: '1px solid var(--border, #f3f4f6)',
                        backgroundColor: record.blocked
                          ? 'rgba(220, 38, 38, 0.04)'
                          : 'transparent',
                      }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{formatTime(record.dateTime)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-primary, #9ca3af)' }}>
                          {formatDate(record.dateTime)}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary, #111827)' }}>
                          {record.buyerName}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {record.buyerDob}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: '11px', color: 'var(--text-primary, #6b7280)' }}>
                          {record.idType.replace('_', ' ').toUpperCase()}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {record.idNumber} ({record.idState})
                        </div>
                      </td>
                      <td style={tdStyle}>{record.productName}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, fontFamily: 'monospace' }}>
                        {record.quantityGrams.toFixed(3)}g
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '12px', fontSize: '12px',
                          fontWeight: 700, fontFamily: 'monospace',
                          color: getLimitColor(dayPercent),
                          backgroundColor: getLimitBg(dayPercent),
                        }}>
                          {dayTotal.toFixed(2)}g / 3.6g
                        </span>
                      </td>
                      <td style={tdStyle}>{record.sellerName}</td>
                      <td style={tdStyle}>
                        {record.blocked ? (
                          <span style={{
                            padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                            fontWeight: 700, color: '#dc2626',
                            backgroundColor: 'rgba(220, 38, 38, 0.1)',
                          }}>
                            BLOCKED
                          </span>
                        ) : record.nplexSubmitted ? (
                          <span style={{
                            padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                            fontWeight: 700, color: 'var(--green-700, #15803d)',
                            backgroundColor: 'rgba(21, 128, 61, 0.1)',
                          }}>
                            SUBMITTED
                          </span>
                        ) : (
                          <span style={{
                            padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                            fontWeight: 700, color: 'var(--text-primary, #6b7280)',
                            backgroundColor: 'var(--card-bg, #f3f4f6)',
                          }}>
                            PENDING
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Sale Modal */}
      {showNewSale && data && (
        <NewSaleForm
          productList={data.productList}
          onClose={() => setShowNewSale(false)}
          onSaleRecorded={loadData}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card sub-component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  suffix,
  color,
  format,
}: {
  label: string;
  value: number;
  suffix: string;
  color: string;
  format?: 'decimal';
}) {
  return (
    <div style={{
      backgroundColor: 'var(--card-bg, #ffffff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <div style={{
        fontSize: '12px', fontWeight: 600, textTransform: 'uppercase',
        color: 'var(--text-primary, #6b7280)',
        letterSpacing: '0.05em', marginBottom: '8px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '28px', fontWeight: 800, color,
        lineHeight: 1.1,
      }}>
        {format === 'decimal' ? value.toFixed(2) : value}
      </div>
      <div style={{
        fontSize: '12px', color: 'var(--text-primary, #9ca3af)',
        marginTop: '4px',
      }}>
        {suffix}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const filterLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-primary, #374151)',
  marginBottom: '4px',
};

const filterInputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border, #d1d5db)',
  backgroundColor: 'var(--card-bg, #ffffff)',
  color: 'var(--text-primary, #111827)',
  fontSize: '14px',
  outline: 'none',
};

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-primary, #6b7280)',
  borderBottom: '1px solid var(--border, #e5e7eb)',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  color: 'var(--text-primary, #374151)',
  verticalAlign: 'top',
};
