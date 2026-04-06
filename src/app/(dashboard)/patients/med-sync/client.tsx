'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  getMedSyncPatients,
  enrollPatient,
  unenrollPatient,
  generateSyncBatch,
  getMedSyncStats,
  searchPatientsForSync,
  getPatientPrescriptions,
  getSyncCalendar,
  getAdherenceData,
} from './actions';

export const dynamic = 'force-dynamic';

export interface SyncPatient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  metadata: any;
}

export interface MedSyncStats {
  enrolledCount: number;
  nextBatchDate: string | null;
  avgMedsPerPatient: number;
}

interface Prescription {
  id: string;
  itemId: string;
  item: { name: string; genericName: string };
  daysSupply?: number;
}

interface MedSyncPageProps {
  initialPatients: SyncPatient[];
  initialStats: MedSyncStats;
}

const BRAND_COLOR = '#40721D';

export function MedSyncPage({
  initialPatients,
  initialStats,
}: MedSyncPageProps) {
  const [patients, setPatients] = useState<SyncPatient[]>(initialPatients);
  const [stats, setStats] = useState<MedSyncStats | null>(initialStats);
  const [activeTab, setActiveTab] = useState<'patients' | 'calendar' | 'adherence'>('patients');
  const [syncLoading, setSyncLoading] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SyncPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<SyncPatient | null>(null);
  const [selectedSyncDay, setSelectedSyncDay] = useState<number>(15);
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [availablePrescriptions, setAvailablePrescriptions] = useState<Prescription[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [enrollmentStep, setEnrollmentStep] = useState<'search' | 'select' | 'configure'>('search');
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<Record<number, any[]>>({});
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [adherenceMetrics, setAdherenceMetrics] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const filterInputRef = useRef<HTMLInputElement>(null);

  // Load calendar data when calendar tab is opened
  useEffect(() => {
    if (activeTab === 'calendar') {
      loadCalendarData();
    }
  }, [activeTab]);

  // Load adherence data when adherence tab is opened
  useEffect(() => {
    if (activeTab === 'adherence') {
      loadAdherenceData();
    }
  }, [activeTab]);

  const loadCalendarData = async () => {
    try {
      const data = await getSyncCalendar();
      setCalendarData(data);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    }
  };

  const loadAdherenceData = async () => {
    try {
      const data = await getAdherenceData();
      setAdherenceMetrics(data);
    } catch (error) {
      console.error('Failed to load adherence data:', error);
    }
  };

  const loadData = async () => {
    try {
      const [patientsData, statsData] = await Promise.all([
        getMedSyncPatients(),
        getMedSyncStats(),
      ]);
      setPatients(patientsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load med sync data:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchPatientsForSync(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleSelectPatient = async (patient: SyncPatient) => {
    setSelectedPatient(patient);
    setEnrollmentStep('select');
    setLoadingPrescriptions(true);
    try {
      const prescriptions = await getPatientPrescriptions(patient.id);
      setAvailablePrescriptions(prescriptions as any);
      setSelectedMeds(prescriptions.map((p: any) => p.id));
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedPatient || selectedMeds.length === 0) {
      alert('Please select at least one medication');
      return;
    }

    try {
      await enrollPatient(selectedPatient.id, selectedSyncDay, selectedMeds);
      setShowEnrollModal(false);
      resetEnrollmentModal();
      await loadData();
      alert(`Successfully enrolled ${selectedPatient.firstName} ${selectedPatient.lastName}`);
    } catch (error) {
      alert(`Enrollment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUnenroll = async (patientId: string) => {
    if (!confirm('Are you sure you want to unenroll this patient?')) {
      return;
    }

    try {
      await unenrollPatient(patientId);
      await loadData();
    } catch (error) {
      alert(`Unenrollment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleGenerateBatch = async () => {
    setSyncLoading(true);
    try {
      const result = await generateSyncBatch(new Date());
      alert(`Generated ${result.fillsCreated} fills for med sync batch`);
      await loadData();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to generate batch'}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const resetEnrollmentModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPatient(null);
    setSelectedSyncDay(15);
    setSelectedMeds([]);
    setAvailablePrescriptions([]);
    setEnrollmentStep('search');
  };

  const enrolledPatients = patients.filter(
    (p) => p.metadata?.medSync?.enrolled
  );

  const filteredPatients = enrolledPatients.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(query) ||
      p.lastName.toLowerCase().includes(query) ||
      p.mrn.toLowerCase().includes(query)
    );
  });

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-gray-50" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const patientsOnDay = calendarData[day] || [];
      const isSelected = selectedCalendarDay === day;

      days.push(
        <div
          key={day}
          onClick={() => setSelectedCalendarDay(isSelected ? null : day)}
          className={`min-h-24 p-2 border cursor-pointer transition-colors ${
            isSelected
              ? 'bg-green-50 border-green-300'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="font-semibold text-sm text-gray-900 mb-1">{day}</div>
          {patientsOnDay.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-600">
                {patientsOnDay.length} patient{patientsOnDay.length !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-gray-500">
                {patientsOnDay.reduce((sum, p) => sum + p.medCount, 0)} meds total
              </div>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Medication Synchronization
        </h1>
        <p className="text-gray-600">
          Manage patient med sync programs and generate batches
        </p>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Enrolled Patients</p>
              <p className="text-3xl font-bold" style={{ color: BRAND_COLOR }}>
                {stats.enrolledCount}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Avg Meds/Patient</p>
              <p className="text-3xl font-bold" style={{ color: BRAND_COLOR }}>
                {stats.avgMedsPerPatient.toFixed(1)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Next Batch Date</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.nextBatchDate
                  ? new Date(stats.nextBatchDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Adherence Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {adherenceMetrics ? `${adherenceMetrics.adherenceRate}%` : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          {(['patients', 'calendar', 'adherence'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-1 py-4 border-b-2 transition-colors capitalize font-medium ${
                activeTab === tab
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Patients Tab */}
      {activeTab === 'patients' && (
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setShowEnrollModal(true);
                setTimeout(() => filterInputRef.current?.focus(), 100);
              }}
              className="px-4 py-2 rounded-lg text-white transition-colors font-medium"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              + Enroll Patient
            </button>
            <button
              onClick={handleGenerateBatch}
              disabled={syncLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              {syncLoading ? 'Generating...' : '▶ Generate Sync Batch'}
            </button>
          </div>

          {/* Search Filter */}
          <div>
            <input
              type="text"
              placeholder="Search by name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
            />
          </div>

          {/* Patient Cards */}
          <div className="grid grid-cols-1 gap-4">
            {filteredPatients.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                {enrolledPatients.length === 0
                  ? 'No patients enrolled in med sync program'
                  : 'No matching patients found'}
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      setExpandedPatientId(
                        expandedPatientId === patient.id ? null : patient.id
                      )
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </h3>
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: BRAND_COLOR }}
                          >
                            Active
                          </span>
                        </div>
                        <div className="flex gap-6 text-sm text-gray-600">
                          <span>MRN: {patient.mrn}</span>
                          <span>Sync Day: {patient.metadata?.medSync?.syncDay}</span>
                          <span>
                            Meds: {patient.metadata?.medSync?.medications?.length || 0}
                          </span>
                        </div>
                      </div>
                      <div className="text-2xl">
                        {expandedPatientId === patient.id ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Medications List */}
                  {expandedPatientId === patient.id && (
                    <div className="border-t border-gray-200 bg-gray-50 p-6">
                      <div className="space-y-4">
                        {availablePrescriptions.length === 0 ? (
                          <div className="text-sm text-gray-600">
                            Loading medications...
                          </div>
                        ) : (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">
                              Synced Medications
                            </h4>
                            <div className="space-y-2">
                              {(patient.metadata?.medSync?.medications || []).map(
                                (medId: string, idx: number) => (
                                  <div
                                    key={idx}
                                    className="text-sm text-gray-700 flex items-center gap-2"
                                  >
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND_COLOR }} />
                                    Med ID: {medId}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-gray-300">
                          <button
                            onClick={() => handleUnenroll(patient.id)}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
                          >
                            Unenroll
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-6">
            <button
              onClick={handlePrevMonth}
              className="px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Previous
            </button>
            <h2 className="text-2xl font-semibold text-gray-900">
              {currentMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </h2>
            <button
              onClick={handleNextMonth}
              className="px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Next →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Day of week headers */}
            <div className="grid grid-cols-7 gap-0 border-b border-gray-200 bg-gray-50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="p-4 text-center font-semibold text-gray-700 text-sm"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-0">
              {renderCalendar()}
            </div>
          </div>

          {/* Selected Day Details */}
          {selectedCalendarDay && calendarData[selectedCalendarDay] && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Patients Syncing on Day {selectedCalendarDay}
              </h3>
              <div className="space-y-3">
                {calendarData[selectedCalendarDay].map((patient: any) => (
                  <div
                    key={patient.patientId}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{patient.name}</p>
                      <p className="text-sm text-gray-600">
                        {patient.medCount} medication{patient.medCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adherence Tab */}
      {activeTab === 'adherence' && (
        <div className="space-y-6">
          {adherenceMetrics ? (
            <>
              {/* Adherence Rate Big Number */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-8">
                <p className="text-green-700 text-sm font-medium mb-2">
                  Patient Adherence Rate
                </p>
                <p className="text-6xl font-bold text-green-900">
                  {adherenceMetrics.adherenceRate}%
                </p>
                <p className="text-green-700 text-sm mt-3">
                  {adherenceMetrics.adherentPatients} of{' '}
                  {adherenceMetrics.totalPatients} patients adherent
                </p>
              </div>

              {/* Fill Rate Metric */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Fill Rate
                </h3>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-4xl font-bold" style={{ color: BRAND_COLOR }}>
                      {adherenceMetrics.fillRate}%
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {adherenceMetrics.onTimeFills} of{' '}
                      {adherenceMetrics.totalMeds} prescriptions filled on time
                    </p>
                  </div>
                </div>
              </div>

              {/* Adherence Bar Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Patient Status Distribution
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        Adherent
                      </span>
                      <span className="text-sm font-medium text-gray-600">
                        {adherenceMetrics.adherentPatients}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full transition-all duration-300 bg-green-600"
                        style={{
                          width: `${
                            adherenceMetrics.totalPatients > 0
                              ? (adherenceMetrics.adherentPatients /
                                  adherenceMetrics.totalPatients) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        Non-Adherent
                      </span>
                      <span className="text-sm font-medium text-gray-600">
                        {adherenceMetrics.totalPatients -
                          adherenceMetrics.adherentPatients}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full transition-all duration-300 bg-red-600"
                        style={{
                          width: `${
                            adherenceMetrics.totalPatients > 0
                              ? ((adherenceMetrics.totalPatients -
                                  adherenceMetrics.adherentPatients) /
                                  adherenceMetrics.totalPatients) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Loading adherence data...
            </div>
          )}
        </div>
      )}

      {/* Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Enroll Patient</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 1: Search */}
              {enrollmentStep === 'search' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Search for Patient
                    </label>
                    <input
                      ref={filterInputRef}
                      type="text"
                      placeholder="Enter name or MRN..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Found {searchResults.length} patient{searchResults.length !== 1 ? 's' : ''}
                      </p>
                      <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-4">
                        {searchResults.map((patient) => (
                          <button
                            key={patient.id}
                            onClick={() => handleSelectPatient(patient)}
                            className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-300"
                          >
                            <p className="font-medium text-gray-900">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="text-sm text-gray-600">MRN: {patient.mrn}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Select Medications */}
              {enrollmentStep === 'select' && selectedPatient && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Selected Patient: <span className="font-medium text-gray-900">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </span>
                    </p>
                    <button
                      onClick={() => setEnrollmentStep('search')}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Change patient
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      Select Medications to Sync
                    </label>
                    {loadingPrescriptions ? (
                      <p className="text-gray-600">Loading prescriptions...</p>
                    ) : availablePrescriptions.length === 0 ? (
                      <p className="text-gray-600">No active prescriptions found</p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-4">
                        {availablePrescriptions.map((rx: any) => (
                          <label
                            key={rx.id}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMeds.includes(rx.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMeds([...selectedMeds, rx.id]);
                                } else {
                                  setSelectedMeds(
                                    selectedMeds.filter((m) => m !== rx.id)
                                  );
                                }
                              }}
                              className="w-4 h-4 rounded cursor-pointer"
                            />
                            <div>
                              <p className="font-medium text-gray-900">
                                {rx.item.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                {rx.item.genericName}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setEnrollmentStep('configure')}
                    disabled={selectedMeds.length === 0}
                    className="w-full py-2 rounded-lg text-white transition-colors font-medium disabled:opacity-50"
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    Continue to Schedule
                  </button>
                </div>
              )}

              {/* Step 3: Configure Sync Day */}
              {enrollmentStep === 'configure' && selectedPatient && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Sync Day of Month (1-28)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={selectedSyncDay}
                      onChange={(e) => setSelectedSyncDay(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      The medication sync will occur on day {selectedSyncDay} of
                      each month
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-900 font-medium mb-2">
                      Enrollment Summary
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>Patient: {selectedPatient.firstName} {selectedPatient.lastName}</li>
                      <li>Medications: {selectedMeds.length} selected</li>
                      <li>Sync Schedule: Day {selectedSyncDay} of each month</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setEnrollmentStep('select')}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleEnroll}
                      className="flex-1 px-4 py-2 rounded-lg text-white transition-colors font-medium"
                      style={{ backgroundColor: BRAND_COLOR }}
                    >
                      Confirm Enrollment
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  resetEnrollmentModal();
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
