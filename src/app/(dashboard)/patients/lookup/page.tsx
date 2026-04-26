"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { searchPatientsLive, type PatientLookupResult } from "./actions";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export default function PatientLookupPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientLookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchPatientsLive(q);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 500);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query);
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-6 py-2.5 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
        <Link href="/dashboard" className="text-[var(--green-700)] no-underline font-medium hover:underline">Home</Link>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <Link href="/patients" className="text-[var(--green-700)] no-underline font-medium hover:underline">Patients</Link>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <span className="text-[var(--text-secondary)] font-semibold">Lookup</span>
      </div>

      <div className="px-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Lookup</h1>
            <p className="text-sm text-gray-500 mt-1">Search by patient name or RX number</p>
          </div>
          <Link
            href="/patients"
            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            &larr; Patients
          </Link>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => handleInput(e.target.value)}
                placeholder="Enter patient name (e.g. John Smith) or RX number..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]/30 focus:border-[#40721D]"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Enter a name to find a patient, or an RX number to find fills.
          </p>
        </form>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <svg className="animate-spin h-4 w-4 text-[#40721D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Searching...
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-lg mb-2">No patients found</p>
                <p className="text-gray-400 text-sm">Try a different name or RX number</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-2">
                  {results.length} patient{results.length !== 1 ? "s" : ""} found
                </p>
                {results.map((patient) => {
                  const isExpanded = expandedPatient === patient.id;
                  const totalFills = patient.fills.length;

                  return (
                    <div key={patient.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* Patient header */}
                      <div
                        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedPatient(isExpanded ? null : patient.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#40721D] flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-white">
                              {(patient.firstName[0] || "").toUpperCase()}{(patient.lastName[0] || "").toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {patient.lastName}, {patient.firstName}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                              <span>DOB: {formatDate(patient.dob)}</span>
                              <span>&middot;</span>
                              <span>Phone: {formatPhone(patient.phone)}</span>
                              {patient.deliveryMethod && (
                                <>
                                  <span>&middot;</span>
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">
                                    {patient.deliveryMethod}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                            patient.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}>
                            {patient.active ? "Active" : "Inactive"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {totalFills} fill{totalFills !== 1 ? "s" : ""}
                          </span>
                          <span className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                            ▾
                          </span>
                        </div>
                      </div>

                      {/* Expanded fills table */}
                      {isExpanded && (
                        <div className="border-t border-gray-100">
                          {patient.fills.length === 0 ? (
                            <div className="px-5 py-6 text-center text-sm text-gray-400">
                              No fills found for this patient
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">RX</th>
                                    <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Drug</th>
                                    <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fill Date</th>
                                    <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Days</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {patient.fills.map((fill) => (
                                    <tr key={fill.fillId} className="hover:bg-gray-50/50">
                                      <td className="px-4 py-2">
                                        <span className="text-sm font-mono font-bold text-[#40721D]">{fill.rxId}</span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <span className="text-sm text-gray-700">{fill.drugName}</span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                          {fill.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <span className="text-xs text-gray-500">{formatDate(fill.fillDate)}</span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <span className="text-sm font-bold text-gray-800">{fill.quantity}</span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <span className="text-sm text-gray-600">{fill.daysSupply ?? "—"}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          <div className="px-5 py-2 bg-gray-50 border-t border-gray-100">
                            <span className="text-[10px] text-gray-400">
                              Patient ID: {patient.id} &middot; Showing up to 20 recent fills
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Empty state when no search yet */}
        {!loading && !searched && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-1">Search for a patient by name or RX number</p>
          </div>
        )}
      </div>
    </div>
  );
}
