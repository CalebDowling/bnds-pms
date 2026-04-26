'use client';

import { useState, useEffect, useCallback } from 'react';
import AdministerForm from './AdministerForm';
import {
  getImmunizationDashboard,
  getPatientImmunizations,
  getVaccineRecommendations,
  searchPatients,
  type ImmunizationDashboard,
  type PatientSearchResult,
} from './actions';
import type { ImmunizationRecord, VaccineRecommendation } from '@/lib/integrations/immunization-registry';
import { formatPatientName } from '@/lib/utils/formatters';

// ---------------------------------------------------------------------------
// Urgency badge component
// ---------------------------------------------------------------------------

function UrgencyBadge({ urgency }: { urgency: string }) {
  const styles: Record<string, string> = {
    overdue: 'bg-red-100 text-red-700 border-red-200',
    due: 'bg-amber-100 text-amber-700 border-amber-200',
    upcoming: 'bg-green-100 text-green-700 border-green-200',
    complete: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
        styles[urgency] ?? styles.complete
      }`}
    >
      {urgency}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stats card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ImmunizationsPage() {
  // Dashboard state
  const [dashboard, setDashboard] = useState<ImmunizationDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  // Patient search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected patient
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [patientHistory, setPatientHistory] = useState<ImmunizationRecord[]>([]);
  const [recommendations, setRecommendations] = useState<VaccineRecommendation[]>([]);
  const [loadingPatient, setLoadingPatient] = useState(false);

  // Administer form
  const [showAdministerForm, setShowAdministerForm] = useState(false);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getImmunizationDashboard();
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Debounced patient search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPatients(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function selectPatient(patient: PatientSearchResult) {
    setSelectedPatient(patient);
    setSearchQuery('');
    setSearchResults([]);
    setLoadingPatient(true);

    try {
      const [historyResult, recs] = await Promise.all([
        getPatientImmunizations(patient.id),
        getVaccineRecommendations(patient.id),
      ]);
      setPatientHistory(historyResult.merged);
      setRecommendations(recs);
    } catch (err) {
      console.error('Failed to load patient data:', err);
    } finally {
      setLoadingPatient(false);
    }
  }

  function handleAdministerSuccess() {
    setShowAdministerForm(false);
    // Reload patient data and dashboard
    if (selectedPatient) {
      selectPatient(selectedPatient);
    }
    loadDashboard();
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Immunization Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Louisiana LINKS Registry &middot; Vaccine tracking &amp; CDC schedule recommendations
          </p>
        </div>
        {selectedPatient && (
          <button
            onClick={() => setShowAdministerForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Administer Vaccine
          </button>
        )}
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          ))}
        </div>
      ) : dashboard ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Vaccines Given Today"
            value={dashboard.vaccinesGivenToday}
            color="bg-blue-100 text-blue-600"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Vaccines This Month"
            value={dashboard.vaccinesGivenMonth}
            color="bg-emerald-100 text-emerald-600"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard
            label="Patients Due for Vaccines"
            value={dashboard.patientsDueForVaccines}
            color="bg-amber-100 text-amber-600"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            }
          />
        </div>
      ) : null}

      {/* Patient search */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Patient Lookup</h2>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name, MRN, or date of birth..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searching && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPatient(p)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                  {p.firstName[0]}
                  {p.lastName[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {formatPatientName({ firstName: p.firstName, lastName: p.lastName }, { format: 'last-first' })}
                  </p>
                  <p className="text-xs text-gray-500">
                    DOB: {p.dateOfBirth}
                    {p.mrn ? ` | MRN: ${p.mrn}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected patient badge */}
        {selectedPatient && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {selectedPatient.firstName[0]}
              {selectedPatient.lastName[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">
                {formatPatientName({ firstName: selectedPatient.firstName, lastName: selectedPatient.lastName }, { format: 'last-first' })}
              </p>
              <p className="text-xs text-blue-600">
                DOB: {selectedPatient.dateOfBirth}
                {selectedPatient.mrn ? ` | MRN: ${selectedPatient.mrn}` : ''}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedPatient(null);
                setPatientHistory([]);
                setRecommendations([]);
              }}
              className="rounded-md p-1 text-blue-400 transition-colors hover:bg-blue-100 hover:text-blue-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Patient data panels */}
      {selectedPatient && (
        <>
          {loadingPatient ? (
            <div className="space-y-4">
              <div className="h-48 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
              <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Recommendations panel */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-1">
                <div className="border-b border-gray-200 px-5 py-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Recommended Vaccines
                  </h3>
                  <p className="text-xs text-gray-500">Based on CDC schedule</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {recommendations.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-500">
                      No recommendations at this time
                    </div>
                  ) : (
                    recommendations.map((rec, i) => (
                      <div key={i} className="px-5 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {rec.vaccineName}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {rec.reason}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              Due: {rec.dueDate}
                              {rec.totalDoses > 0
                                ? ` (Dose ${rec.doseNumber}/${rec.totalDoses})`
                                : ''}
                            </p>
                          </div>
                          <UrgencyBadge urgency={rec.urgency} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* History table */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
                <div className="border-b border-gray-200 px-5 py-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Immunization History
                  </h3>
                  <p className="text-xs text-gray-500">
                    {patientHistory.length} record{patientHistory.length !== 1 ? 's' : ''} on file
                  </p>
                </div>
                {patientHistory.length === 0 ? (
                  <div className="px-5 py-12 text-center text-sm text-gray-500">
                    No immunization records found for this patient
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                          <th className="px-5 py-3">Vaccine</th>
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3">Lot #</th>
                          <th className="hidden px-5 py-3 md:table-cell">Manufacturer</th>
                          <th className="hidden px-5 py-3 lg:table-cell">Site</th>
                          <th className="hidden px-5 py-3 lg:table-cell">Route</th>
                          <th className="hidden px-5 py-3 xl:table-cell">Pharmacist</th>
                          <th className="px-5 py-3">Registry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {patientHistory.map((rec) => (
                          <tr key={rec.id} className="transition-colors hover:bg-gray-50">
                            <td className="whitespace-nowrap px-5 py-3 font-medium text-gray-900">
                              {rec.vaccineName}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">
                              {rec.dateAdministered}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-gray-600">
                              {rec.lotNumber}
                            </td>
                            <td className="hidden whitespace-nowrap px-5 py-3 text-gray-600 md:table-cell">
                              {rec.manufacturer}
                            </td>
                            <td className="hidden whitespace-nowrap px-5 py-3 text-gray-600 lg:table-cell">
                              {rec.administrationSite}
                            </td>
                            <td className="hidden whitespace-nowrap px-5 py-3 text-gray-600 lg:table-cell">
                              {rec.administrationRoute}
                            </td>
                            <td className="hidden whitespace-nowrap px-5 py-3 text-gray-600 xl:table-cell">
                              {rec.administeringPharmacist}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3">
                              {rec.registrySubmitted ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Submitted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                                  </svg>
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Recent vaccinations when no patient selected */}
      {!selectedPatient && dashboard && dashboard.recentVaccinations.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h3 className="text-base font-semibold text-gray-900">
              Recent Vaccinations
            </h3>
            <p className="text-xs text-gray-500">
              Latest vaccines administered at this pharmacy
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Vaccine</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="hidden px-5 py-3 md:table-cell">Lot #</th>
                  <th className="hidden px-5 py-3 md:table-cell">Manufacturer</th>
                  <th className="hidden px-5 py-3 lg:table-cell">Pharmacist</th>
                  <th className="px-5 py-3">Registry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dashboard.recentVaccinations.map((rec) => (
                  <tr key={rec.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-gray-900">
                      {rec.patientName}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-600">
                      {rec.vaccineName}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-600">
                      {rec.dateAdministered}
                    </td>
                    <td className="hidden whitespace-nowrap px-5 py-3 font-mono text-xs text-gray-600 md:table-cell">
                      {rec.lotNumber}
                    </td>
                    <td className="hidden whitespace-nowrap px-5 py-3 text-gray-600 md:table-cell">
                      {rec.manufacturer}
                    </td>
                    <td className="hidden whitespace-nowrap px-5 py-3 text-gray-600 lg:table-cell">
                      {rec.administeringPharmacist}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      {rec.registrySubmitted ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Submitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                          </svg>
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Administer form modal */}
      {showAdministerForm && selectedPatient && (
        <AdministerForm
          patientId={selectedPatient.id}
          patientName={formatPatientName({ firstName: selectedPatient.firstName, lastName: selectedPatient.lastName })}
          dateOfBirth={selectedPatient.dateOfBirth}
          pharmacistName="Current User"
          onClose={() => setShowAdministerForm(false)}
          onSuccess={handleAdministerSuccess}
        />
      )}
    </div>
  );
}
