'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getBiennialReport } from '../actions';
import type { BiennialLineItem } from '@/lib/compliance/controlled-substance-ledger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scheduleColor(schedule: number): string {
  switch (schedule) {
    case 2: return '#dc2626';
    case 3: return '#ea580c';
    case 4: return '#ca8a04';
    case 5: return '#2563eb';
    default: return '#6b7280';
  }
}

function scheduleBadgeBg(schedule: number): string {
  switch (schedule) {
    case 2: return '#fef2f2';
    case 3: return '#fff7ed';
    case 4: return '#fefce8';
    case 5: return '#eff6ff';
    default: return '#f9fafb';
  }
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BiennialReportPage() {
  const [asOfDate, setAsOfDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [report, setReport] = useState<BiennialLineItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!asOfDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBiennialReport(asOfDate);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;
    const headers = [
      'Item Name',
      'NDC',
      'Schedule',
      'Dosage Form',
      'Strength',
      'Unit',
      'Quantity on Hand',
      'Date Counted',
      'Counted By',
    ];
    const rows = report.map((item) => [
      `"${item.itemName}"`,
      item.ndc,
      `C-${item.deaSchedule}`,
      item.dosageForm ?? '',
      item.strength ?? '',
      item.unit ?? '',
      item.quantityOnHand,
      item.dateCounted ? new Date(item.dateCounted).toLocaleDateString() : '',
      item.countedBy ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biennial-inventory-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Summary statistics
  const totalItems = report?.length ?? 0;
  const scheduleIIItems = report?.filter((r) => r.deaSchedule === 2).length ?? 0;
  const totalUnits = report?.reduce((sum, r) => sum + r.quantityOnHand, 0) ?? 0;

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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)' }}>
            Biennial Inventory Report
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            DEA-required biennial inventory of all controlled substances
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={controlsCard}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>Inventory Date</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !asOfDate}
            style={{
              ...btnPrimaryStyle,
              opacity: loading || !asOfDate ? 0.5 : 1,
            }}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {report && (
            <>
              <button onClick={handlePrint} style={btnSecondaryStyle}>
                Print
              </button>
              <button onClick={handleExportCSV} style={btnSecondaryStyle}>
                Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Report */}
      {report && (
        <>
          {/* Report Header (for print) */}
          <div style={reportHeader} className="print-header">
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: 'var(--text-primary)' }}>
              Boudreaux&apos;s New Drug Store
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
              Biennial Controlled Substance Inventory &mdash; As of{' '}
              {new Date(asOfDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Total Items: <strong>{totalItems}</strong>
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Schedule II Items: <strong>{scheduleIIItems}</strong>
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Total Units: <strong>{totalUnits.toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {/* Report Table */}
          <div style={tableContainer}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Item Name</th>
                  <th style={thStyle}>NDC</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Schedule</th>
                  <th style={thStyle}>Form</th>
                  <th style={thStyle}>Strength</th>
                  <th style={thStyle}>Unit</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Qty on Hand</th>
                  <th style={thStyle}>Date Counted</th>
                  <th style={thStyle}>Counted By</th>
                </tr>
              </thead>
              <tbody>
                {report.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No controlled substances found
                    </td>
                  </tr>
                ) : (
                  report.map((item) => (
                    <tr key={item.itemId}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{item.itemName}</td>
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
                          C-{item.deaSchedule}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: '13px' }}>
                        {item.dosageForm ?? '\u2014'}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '13px' }}>
                        {item.strength ?? '\u2014'}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '13px' }}>
                        {item.unit ?? '\u2014'}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          fontSize: '14px',
                        }}
                      >
                        {item.quantityOnHand}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {item.dateCounted
                          ? new Date(item.dateCounted).toLocaleDateString()
                          : '\u2014'}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '13px' }}>
                        {item.countedBy ?? '\u2014'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Signature Block (for print) */}
          <div style={signatureBlock}>
            <div style={{ display: 'flex', gap: '48px', marginTop: '40px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ borderBottom: '1px solid var(--text-primary)', marginBottom: '4px', height: '30px' }} />
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Pharmacist-in-Charge Signature
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ borderBottom: '1px solid var(--text-primary)', marginBottom: '4px', height: '30px' }} />
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Date
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ borderBottom: '1px solid var(--text-primary)', marginBottom: '4px', height: '30px' }} />
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  DEA Registration Number
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-header, .print-header * { visibility: visible; }
          table, table * { visibility: visible; }
          @page { margin: 0.5in; }
        }
      `}</style>
    </div>
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

const controlsCard: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '20px',
};

const reportHeader: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '16px',
};

const tableContainer: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  overflow: 'auto',
  marginBottom: '20px',
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

const signatureBlock: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '20px 24px',
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
