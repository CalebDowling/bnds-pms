'use client';

import { useState, useEffect, useCallback } from 'react';
import { recordSale, checkBuyerLimits, calcGramEquivalent, type RecordSaleInput } from './actions';
import type { PseLimitCheck, IdType } from '@/lib/compliance/pse-tracking';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const ID_TYPES: { value: IdType; label: string }[] = [
  { value: 'driver_license', label: 'Driver License' },
  { value: 'state_id', label: 'State ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'military_id', label: 'Military ID' },
];

interface NewSaleFormProps {
  productList: { name: string; gramsPerPackage: number }[];
  onClose: () => void;
  onSaleRecorded: () => void;
}

export default function NewSaleForm({ productList, onClose, onSaleRecorded }: NewSaleFormProps) {
  // Buyer info
  const [buyerName, setBuyerName] = useState('');
  const [buyerDob, setBuyerDob] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [addrState, setAddrState] = useState('LA');
  const [zip, setZip] = useState('');

  // ID info
  const [idType, setIdType] = useState<IdType>('driver_license');
  const [idNumber, setIdNumber] = useState('');
  const [idState, setIdState] = useState('LA');

  // Product info
  const [productName, setProductName] = useState(productList[0]?.name ?? '');
  const [packageCount, setPackageCount] = useState(1);
  const [gramEquivalent, setGramEquivalent] = useState(0);
  const [manualGrams, setManualGrams] = useState(false);

  // State
  const [limits, setLimits] = useState<PseLimitCheck | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Auto-calculate gram equivalent when product or package count changes
  useEffect(() => {
    if (!manualGrams && productName && packageCount > 0) {
      calcGramEquivalent(productName, packageCount).then((grams) => {
        if (grams > 0) {
          setGramEquivalent(Math.round(grams * 1000) / 1000);
        }
      });
    }
  }, [productName, packageCount, manualGrams]);

  // Check limits when buyer info + quantity changes
  const doLimitCheck = useCallback(async () => {
    if (!buyerName.trim() || !buyerDob || !idNumber.trim() || gramEquivalent <= 0) {
      setLimits(null);
      return;
    }
    setLimitsLoading(true);
    try {
      const result = await checkBuyerLimits(buyerName, buyerDob, idNumber, gramEquivalent);
      setLimits(result);
    } catch {
      setLimits(null);
    } finally {
      setLimitsLoading(false);
    }
  }, [buyerName, buyerDob, idNumber, gramEquivalent]);

  useEffect(() => {
    const timer = setTimeout(doLimitCheck, 500);
    return () => clearTimeout(timer);
  }, [doLimitCheck]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const data: RecordSaleInput = {
      buyerName,
      buyerDob,
      buyerAddress: { street, city, state: addrState, zip },
      idType,
      idNumber,
      idState,
      productName,
      packageCount,
      quantityGrams: gramEquivalent,
    };

    const result = await recordSale(data);
    setSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onSaleRecorded();
        onClose();
      }, 1500);
    } else {
      setError(result.error ?? 'Failed to record sale');
    }
  };

  const limitExceeded = limits !== null && !limits.allowed;

  function getLimitColor(percent: number): string {
    if (percent > 90) return 'var(--red-600, #dc2626)';
    if (percent > 75) return 'var(--yellow-600, #ca8a04)';
    return 'var(--green-700, #15803d)';
  }

  function getLimitBg(percent: number): string {
    if (percent > 90) return 'rgba(220, 38, 38, 0.1)';
    if (percent > 75) return 'rgba(202, 138, 4, 0.1)';
    return 'rgba(21, 128, 61, 0.1)';
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    }}>
      <div style={{
        backgroundColor: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: '12px',
        width: '100%', maxWidth: '720px', maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border, #e5e7eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{
            margin: 0, fontSize: '18px', fontWeight: 700,
            color: 'var(--text-primary, #111827)',
          }}>
            New PSE Sale
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '20px', color: 'var(--text-primary, #6b7280)',
              padding: '4px 8px', borderRadius: '4px',
            }}
          >
            &times;
          </button>
        </div>

        {success ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>&#10003;</div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--green-700, #15803d)' }}>
              PSE sale recorded successfully
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {/* Limit Check Display */}
            {limits && (
              <div style={{
                marginBottom: '20px', padding: '16px', borderRadius: '8px',
                border: `1px solid ${limitExceeded ? 'var(--red-600, #dc2626)' : 'var(--border, #e5e7eb)'}`,
                backgroundColor: limitExceeded ? 'rgba(220, 38, 38, 0.05)' : 'var(--card-bg, #f9fafb)',
              }}>
                <div style={{
                  fontSize: '13px', fontWeight: 700, marginBottom: '12px',
                  color: limitExceeded ? 'var(--red-600, #dc2626)' : 'var(--text-primary, #111827)',
                }}>
                  {limitExceeded ? 'PURCHASE DENIED -- Limits Exceeded' : 'Purchase Limit Status'}
                  {limits.isBlocked && ' -- BUYER BLOCKED'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Daily limit bar */}
                  <div>
                    <div style={{
                      fontSize: '12px', color: 'var(--text-primary, #6b7280)', marginBottom: '4px',
                      display: 'flex', justifyContent: 'space-between',
                    }}>
                      <span>Daily</span>
                      <span style={{ color: getLimitColor(limits.dailyPercent), fontWeight: 600 }}>
                        {(limits.dailyUsed + gramEquivalent).toFixed(2)}g / {limits.dailyLimit}g
                      </span>
                    </div>
                    <div style={{
                      height: '8px', borderRadius: '4px', overflow: 'hidden',
                      backgroundColor: 'var(--border, #e5e7eb)',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: '4px',
                        width: `${Math.min(100, ((limits.dailyUsed + gramEquivalent) / limits.dailyLimit) * 100)}%`,
                        backgroundColor: getLimitColor(
                          ((limits.dailyUsed + gramEquivalent) / limits.dailyLimit) * 100
                        ),
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>

                  {/* Monthly limit bar */}
                  <div>
                    <div style={{
                      fontSize: '12px', color: 'var(--text-primary, #6b7280)', marginBottom: '4px',
                      display: 'flex', justifyContent: 'space-between',
                    }}>
                      <span>30-Day</span>
                      <span style={{ color: getLimitColor(limits.monthlyPercent), fontWeight: 600 }}>
                        {(limits.monthlyUsed + gramEquivalent).toFixed(2)}g / {limits.monthlyLimit}g
                      </span>
                    </div>
                    <div style={{
                      height: '8px', borderRadius: '4px', overflow: 'hidden',
                      backgroundColor: 'var(--border, #e5e7eb)',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: '4px',
                        width: `${Math.min(100, ((limits.monthlyUsed + gramEquivalent) / limits.monthlyLimit) * 100)}%`,
                        backgroundColor: getLimitColor(
                          ((limits.monthlyUsed + gramEquivalent) / limits.monthlyLimit) * 100
                        ),
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {limits.warnings.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    {limits.warnings.map((w, i) => (
                      <div key={i} style={{
                        fontSize: '12px', padding: '4px 8px', borderRadius: '4px',
                        marginTop: i > 0 ? '4px' : 0,
                        color: w.includes('exceeded') || w.includes('blocked')
                          ? 'var(--red-600, #dc2626)'
                          : w.includes('Approaching')
                            ? 'var(--yellow-600, #ca8a04)'
                            : 'var(--text-primary, #6b7280)',
                        backgroundColor: w.includes('exceeded') || w.includes('blocked')
                          ? 'rgba(220, 38, 38, 0.1)'
                          : w.includes('Approaching')
                            ? 'rgba(202, 138, 4, 0.1)'
                            : 'transparent',
                      }}>
                        {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {limitsLoading && (
              <div style={{
                marginBottom: '16px', padding: '12px', borderRadius: '8px',
                backgroundColor: 'var(--card-bg, #f9fafb)',
                fontSize: '13px', color: 'var(--text-primary, #6b7280)',
                textAlign: 'center',
              }}>
                Checking purchase limits...
              </div>
            )}

            {/* Buyer Information */}
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 20px 0' }}>
              <legend style={{
                fontSize: '14px', fontWeight: 700, marginBottom: '12px',
                color: 'var(--text-primary, #111827)',
              }}>
                Buyer Information
              </legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Last, First Middle"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={buyerDob}
                    onChange={(e) => setBuyerDob(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Street Address *</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>State *</label>
                  <select
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    style={inputStyle}
                  >
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>ZIP Code *</label>
                  <input
                    type="text"
                    required
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    pattern="[0-9]{5}(-[0-9]{4})?"
                    placeholder="70601"
                    style={inputStyle}
                  />
                </div>
              </div>
            </fieldset>

            {/* ID Information */}
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 20px 0' }}>
              <legend style={{
                fontSize: '14px', fontWeight: 700, marginBottom: '12px',
                color: 'var(--text-primary, #111827)',
              }}>
                Identification
              </legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>ID Type *</label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value as IdType)}
                    style={inputStyle}
                  >
                    {ID_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>ID Number *</label>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Issuing State *</label>
                  <select
                    value={idState}
                    onChange={(e) => setIdState(e.target.value)}
                    style={inputStyle}
                  >
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </fieldset>

            {/* Product Information */}
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 20px 0' }}>
              <legend style={{
                fontSize: '14px', fontWeight: 700, marginBottom: '12px',
                color: 'var(--text-primary, #111827)',
              }}>
                Product
              </legend>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Product Name *</label>
                  <select
                    value={productName}
                    onChange={(e) => {
                      setProductName(e.target.value);
                      setManualGrams(false);
                    }}
                    style={inputStyle}
                  >
                    {productList.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.gramsPerPackage}g/pkg)
                      </option>
                    ))}
                    <option value="__custom__">Other (enter manually)</option>
                  </select>
                  {productName === '__custom__' && (
                    <input
                      type="text"
                      placeholder="Enter product name"
                      onChange={(e) => setProductName(e.target.value)}
                      style={{ ...inputStyle, marginTop: '8px' }}
                    />
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Package Qty *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={packageCount}
                    onChange={(e) => setPackageCount(parseInt(e.target.value) || 1)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Grams *
                    {!manualGrams && gramEquivalent > 0 && (
                      <span style={{ fontWeight: 400, color: 'var(--green-700, #15803d)' }}> (auto)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    required
                    min={0.001}
                    step={0.001}
                    value={gramEquivalent}
                    onChange={(e) => {
                      setManualGrams(true);
                      setGramEquivalent(parseFloat(e.target.value) || 0);
                    }}
                    style={{
                      ...inputStyle,
                      backgroundColor: manualGrams ? 'var(--card-bg, #fff)' : 'rgba(21, 128, 61, 0.05)',
                    }}
                  />
                </div>
              </div>
            </fieldset>

            {/* Error */}
            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                color: 'var(--red-600, #dc2626)',
                fontSize: '13px', fontWeight: 600,
                border: '1px solid rgba(220, 38, 38, 0.2)',
              }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{
              display: 'flex', gap: '12px', justifyContent: 'flex-end',
              paddingTop: '16px', borderTop: '1px solid var(--border, #e5e7eb)',
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px', borderRadius: '8px',
                  border: '1px solid var(--border, #e5e7eb)',
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  color: 'var(--text-primary, #374151)',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || limitExceeded}
                style={{
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  backgroundColor: limitExceeded
                    ? 'var(--border, #d1d5db)'
                    : 'var(--green-700, #15803d)',
                  color: '#ffffff',
                  fontSize: '14px', fontWeight: 700, cursor: limitExceeded ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Recording...' : limitExceeded ? 'Limits Exceeded' : 'Record PSE Sale'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-primary, #374151)',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border, #d1d5db)',
  backgroundColor: 'var(--card-bg, #ffffff)',
  color: 'var(--text-primary, #111827)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};
