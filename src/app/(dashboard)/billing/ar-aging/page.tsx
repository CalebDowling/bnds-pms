"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getArAgingReport, type AgingSummary, type PatientAging } from "./actions";
import { formatDate } from "@/lib/utils/formatters";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export default function ArAgingPage() {
  const [report, setReport] = useState<AgingSummary | null>(null);
  const [search, setSearch] = useState("");
  const [minBalance, setMinBalance] = useState(0);
  const [sortBy, setSortBy] = useState("total_desc");
  const [loading, setLoading] = useState(true);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getArAgingReport({ search, minBalance, sortBy });
      setReport(data);
    } catch (err) {
      console.error("Failed to load AR aging:", err);
    } finally {
      setLoading(false);
    }
  }, [search, minBalance, sortBy]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const totals = report?.totals || {
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
    days120Plus: 0,
    total: 0,
  };

  // Calculate bar widths for aging visual
  const maxBucket = Math.max(
    totals.current,
    totals.days30,
    totals.days60,
    totals.days90,
    totals.days120Plus,
    1
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AR Aging Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            Accounts receivable by 30/60/90/120+ day aging buckets
          </p>
        </div>
        <Link
          href="/billing"
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back to Billing
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Total AR</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.total)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {report?.patientCount || 0} patient{report?.patientCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <p className="text-xs font-semibold text-green-500 uppercase">Current</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totals.current)}</p>
          <p className="text-xs text-gray-400 mt-1">0-30 days</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-xs font-semibold text-amber-500 uppercase">31-60</p>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(totals.days30)}</p>
          <p className="text-xs text-gray-400 mt-1">31-60 days</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <p className="text-xs font-semibold text-orange-500 uppercase">61-90</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(totals.days60)}</p>
          <p className="text-xs text-gray-400 mt-1">61-90 days</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-xs font-semibold text-red-400 uppercase">91-120</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totals.days90)}</p>
          <p className="text-xs text-gray-400 mt-1">91-120 days</p>
        </div>
        <div className="bg-white rounded-xl border border-red-300 p-4">
          <p className="text-xs font-semibold text-red-600 uppercase">120+</p>
          <p className="text-xl font-bold text-red-700">{formatCurrency(totals.days120Plus)}</p>
          <p className="text-xs text-gray-400 mt-1">Over 120 days</p>
        </div>
      </div>

      {/* Aging Distribution Bar */}
      {totals.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
            Aging Distribution
          </h3>
          <div className="flex h-8 rounded-lg overflow-hidden">
            {[
              { amount: totals.current, color: "bg-green-500", label: "Current" },
              { amount: totals.days30, color: "bg-amber-500", label: "31-60" },
              { amount: totals.days60, color: "bg-orange-500", label: "61-90" },
              { amount: totals.days90, color: "bg-red-500", label: "91-120" },
              { amount: totals.days120Plus, color: "bg-red-700", label: "120+" },
            ]
              .filter((b) => b.amount > 0)
              .map((bucket) => (
                <div
                  key={bucket.label}
                  className={`${bucket.color} flex items-center justify-center text-white text-[10px] font-bold transition-all`}
                  style={{
                    width: `${(bucket.amount / totals.total) * 100}%`,
                    minWidth: bucket.amount > 0 ? "40px" : "0",
                  }}
                  title={`${bucket.label}: ${formatCurrency(bucket.amount)}`}
                >
                  {((bucket.amount / totals.total) * 100).toFixed(0)}%
                </div>
              ))}
          </div>
          <div className="flex gap-4 mt-2">
            {[
              { color: "bg-green-500", label: "Current" },
              { color: "bg-amber-500", label: "31-60" },
              { color: "bg-orange-500", label: "61-90" },
              { color: "bg-red-500", label: "91-120" },
              { color: "bg-red-700", label: "120+" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${b.color}`} />
                <span className="text-[10px] text-gray-500">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient name or MRN..."
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] w-72"
        />
        <select
          value={minBalance}
          onChange={(e) => setMinBalance(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
        >
          <option value={0}>All Balances</option>
          <option value={10}>$10+</option>
          <option value={50}>$50+</option>
          <option value={100}>$100+</option>
          <option value={500}>$500+</option>
          <option value={1000}>$1,000+</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
        >
          <option value="total_desc">Highest Balance</option>
          <option value="total_asc">Lowest Balance</option>
          <option value="oldest">Oldest First</option>
          <option value="patient">By Patient Name</option>
        </select>
      </div>

      {/* Patient Table */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">Loading aging report...</div>
      ) : !report || report.patients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">💰</p>
          <p className="text-sm text-gray-400">No outstanding balances found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Patient
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-green-500 uppercase">
                  Current
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-amber-500 uppercase">
                  31-60
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-orange-500 uppercase">
                  61-90
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-red-400 uppercase">
                  91-120
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-red-600 uppercase">
                  120+
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Total
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Last Payment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.patients.map((p) => (
                <PatientRow
                  key={p.patientId}
                  patient={p}
                  expanded={expandedPatient === p.patientId}
                  onToggle={() =>
                    setExpandedPatient(
                      expandedPatient === p.patientId ? null : p.patientId
                    )
                  }
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                <td className="px-3 py-2.5 text-sm text-gray-900">
                  Totals ({report.patientCount} patient{report.patientCount !== 1 ? "s" : ""})
                </td>
                <td className="px-3 py-2.5 text-sm text-right text-green-600">
                  {formatCurrency(totals.current)}
                </td>
                <td className="px-3 py-2.5 text-sm text-right text-amber-600">
                  {formatCurrency(totals.days30)}
                </td>
                <td className="px-3 py-2.5 text-sm text-right text-orange-600">
                  {formatCurrency(totals.days60)}
                </td>
                <td className="px-3 py-2.5 text-sm text-right text-red-500">
                  {formatCurrency(totals.days90)}
                </td>
                <td className="px-3 py-2.5 text-sm text-right text-red-700">
                  {formatCurrency(totals.days120Plus)}
                </td>
                <td className="px-3 py-2.5 text-sm text-right text-gray-900 font-bold">
                  {formatCurrency(totals.total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function PatientRow({
  patient,
  expanded,
  onToggle,
}: {
  patient: PatientAging;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasOldDebt =
    patient.buckets.days90 > 0 || patient.buckets.days120Plus > 0;

  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer transition-colors ${
          hasOldDebt ? "bg-red-50/30" : "hover:bg-gray-50"
        }`}
      >
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{expanded ? "▾" : "▸"}</span>
            <div>
              <p className="text-sm font-medium text-gray-900">{patient.patientName}</p>
              <p className="text-xs text-gray-400">{patient.mrn}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 text-sm text-right text-gray-600">
          {patient.buckets.current > 0 ? formatCurrency(patient.buckets.current) : "—"}
        </td>
        <td className="px-3 py-2.5 text-sm text-right text-gray-600">
          {patient.buckets.days30 > 0 ? formatCurrency(patient.buckets.days30) : "—"}
        </td>
        <td className="px-3 py-2.5 text-sm text-right text-gray-600">
          {patient.buckets.days60 > 0 ? formatCurrency(patient.buckets.days60) : "—"}
        </td>
        <td className="px-3 py-2.5 text-sm text-right">
          <span className={patient.buckets.days90 > 0 ? "text-red-600 font-medium" : "text-gray-600"}>
            {patient.buckets.days90 > 0 ? formatCurrency(patient.buckets.days90) : "—"}
          </span>
        </td>
        <td className="px-3 py-2.5 text-sm text-right">
          <span className={patient.buckets.days120Plus > 0 ? "text-red-700 font-bold" : "text-gray-600"}>
            {patient.buckets.days120Plus > 0 ? formatCurrency(patient.buckets.days120Plus) : "—"}
          </span>
        </td>
        <td className="px-3 py-2.5 text-sm text-right font-semibold text-gray-900">
          {formatCurrency(patient.buckets.total)}
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-500">
          {patient.lastPaymentDate ? (
            <>
              {formatCurrency(patient.lastPaymentAmount || 0)} on{" "}
              {formatDate(patient.lastPaymentDate)}
            </>
          ) : (
            <span className="text-gray-400">No payments</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="px-6 py-3 bg-gray-50/50 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 font-semibold mb-1">Account</p>
                <p className="text-gray-700">{patient.accountNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold mb-1">Phone</p>
                <p className="text-gray-700">{formatPhone(patient.phone)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold mb-1">Email</p>
                <p className="text-gray-700">{patient.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold mb-1">Oldest Charge</p>
                <p className="text-gray-700">{formatDate(patient.oldestChargeDate)}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/patients/${patient.patientId}`}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                View Patient
              </Link>
              <Link
                href={`/billing?patient=${patient.patientId}`}
                className="px-3 py-1.5 text-xs font-medium bg-[#40721D] text-white rounded-lg hover:bg-[#2D5114] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                View Account
              </Link>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
