'use client';

import React, { useState, useEffect } from 'react';
import {
  getMedSyncPatients,
  getMedSyncStats,
  enrollPatient,
  unenrollPatient,
  generateSyncBatch,
} from './actions';

export const dynamic = 'force-dynamic';

interface SyncPatient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  metadata: any;
}

interface MedSyncStats {
  enrolledCount: number;
  nextBatchDate: string | null;
  avgMedsPerPatient: number;
}

export function MedSyncPage() {
  const [patients, setPatients] = useState<SyncPatient[]>([]);
  const [stats, setStats] = useState<MedSyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [patientsData, statsData] = await Promise.all([
        getMedSyncPatients(),
        getMedSyncStats(),
      ]);
      setPatients(patientsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load med sync data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBatch = async () => {
    setSyncLoading(true);
    try {
      const result = await generateSyncBatch(new Date());
      alert(`Generated ${result.fillsCreated} fills for med sync`);
      await loadData();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to generate batch'}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const enrolledPatients = patients.filter(
    (p) => p.metadata?.medSync?.enrolled
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin text-gray-400 text-2xl">⟳</div>
      </div>
    );
  }

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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-option-b-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Enrolled Patients</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.enrolledCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                <span className="text-xl font-semibold text-blue-600">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-option-b-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Next Batch Date</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.nextBatchDate
                    ? new Date(stats.nextBatchDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                <span className="text-xl font-semibold text-green-600">📅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-option-b-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Meds/Patient</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.avgMedsPerPatient.toFixed(1)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                <span className="text-xl font-semibold text-purple-600">💊</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowEnrollModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-option-b-light to-option-b-dark text-white rounded-xl hover:shadow-lg transition-all"
        >
          + Enroll Patient
        </button>
        <button
          onClick={handleGenerateBatch}
          disabled={syncLoading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
        >
          {syncLoading ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <span>▶</span>
          )}
          Generate Sync Batch
        </button>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-option-b-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Patient Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  MRN
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Sync Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Medications
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {enrolledPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No patients enrolled in med sync program
                  </td>
                </tr>
              ) : (
                enrolledPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {patient.firstName} {patient.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {patient.mrn}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      Day {patient.metadata?.medSync?.syncDay || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {patient.metadata?.medSync?.medications?.length || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={async () => {
                          await unenrollPatient(patient.id);
                          await loadData();
                        }}
                        className="text-sm text-red-600 hover:text-red-700 transition-colors"
                      >
                        Unenroll
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
