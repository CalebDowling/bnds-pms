"use client";

/**
 * BNDS PMS — Telepharmacy Dashboard
 * Active sessions, pending verifications, session history, stats.
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getTelepharmacyDashboard,
  createConsultation,
  type TelepharmacyDashboardData,
} from "./actions";
import type {
  TelepharmacySession,
  SessionType,
  PendingVerification,
} from "@/lib/telepharmacy/video-session";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  verification: "RPh Verification",
  counseling: "Patient Counseling",
  consultation: "Consultation",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-gray-100 text-gray-700",
  waiting: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TelepharmacyDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<TelepharmacyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewSession, setShowNewSession] = useState(false);
  const [creating, setCreating] = useState(false);

  // New session form
  const [sessionType, setSessionType] = useState<SessionType>("consultation");
  const [participantName, setParticipantName] = useState("");
  const [remoteSite, setRemoteSite] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getTelepharmacyDashboard();
      setDashboard(data);
    } catch (err) {
      console.error("Failed to load telepharmacy dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    // Auto-refresh every 30s for active sessions
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  // -- Handlers --

  async function handleStartConsultation() {
    if (!participantName.trim()) return;
    setCreating(true);
    try {
      const session = await createConsultation(sessionType, `pt_new_${Date.now()}`, participantName, {
        participantRole: sessionType === "verification" ? "technician" : "patient",
        remoteLocationName: remoteSite || undefined,
      });
      setShowNewSession(false);
      setParticipantName("");
      setRemoteSite("");
      router.push(`/telepharmacy/session/${session.id}`);
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setCreating(false);
    }
  }

  function handleJoinSession(sessionId: string) {
    router.push(`/telepharmacy/session/${sessionId}`);
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return "--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading telepharmacy dashboard...</div>
      </div>
    );
  }

  const { activeSessions, recentSessions, pendingVerifications, stats } = dashboard ?? {
    activeSessions: [],
    recentSessions: [],
    pendingVerifications: [],
    stats: null,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telepharmacy</h1>
          <p className="text-sm text-gray-500 mt-1">
            Remote RPh verification, patient counseling, and video consultations
          </p>
        </div>
        <button
          onClick={() => setShowNewSession(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
        >
          + Start Consultation
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Sessions Today" value={stats.sessionsToday} color="blue" />
          <StatCard
            label="Avg Duration"
            value={stats.avgDurationMinutes > 0 ? `${stats.avgDurationMinutes} min` : "--"}
            color="green"
          />
          <StatCard label="Remote Verifications" value={stats.remoteVerifications} color="purple" />
          <StatCard label="Active Now" value={stats.activeSessions} color="emerald" />
          <StatCard label="Pending Verifications" value={stats.pendingVerifications} color="orange" />
        </div>
      )}

      {/* New Session Modal */}
      {showNewSession && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Start New Consultation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Type
                </label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value as SessionType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(SESSION_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {sessionType === "verification" ? "Technician Name" : "Patient Name"}
                </label>
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Enter name..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remote Site (optional)
                </label>
                <input
                  type="text"
                  value={remoteSite}
                  onChange={(e) => setRemoteSite(e.target.value)}
                  placeholder="e.g., Natchitoches Branch"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {sessionType === "verification" && (
                <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-700">
                  RPh verification session: you will review the fill details, label, and DUR alerts
                  via video with the remote technician.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewSession(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleStartConsultation}
                disabled={creating || !participantName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating..." : "Start Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Active Sessions</h2>
        {activeSessions.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
            No active telepharmacy sessions
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Patient / Location
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pharmacist</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Duration</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeSessions.map((s: TelepharmacySession) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{s.participantName}</div>
                      {s.remoteLocationName && (
                        <div className="text-xs text-gray-400">{s.remoteLocationName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.pharmacistName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-purple-50 text-purple-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {SESSION_TYPE_LABELS[s.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-gray-500">
                      {s.startedAt ? formatDuration(Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000)) : "Waiting"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status]}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleJoinSession(s.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        Join
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pending Verifications */}
      {pendingVerifications.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Pending Remote Verifications
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rx #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Medication</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Remote Site</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Priority</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingVerifications.map((v: PendingVerification) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm text-blue-600">{v.rxNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{v.patientName}</td>
                    <td className="px-4 py-3 text-gray-600">{v.medication}</td>
                    <td className="px-4 py-3 text-gray-500">{v.remoteSiteName}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          v.priority === "urgent"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {v.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={async () => {
                          const session = await createConsultation("verification", v.id, v.patientName, {
                            participantRole: "technician",
                            remoteLocationName: v.remoteSiteName,
                            fillId: v.fillId,
                            rxNumber: v.rxNumber,
                          });
                          router.push(`/telepharmacy/session/${session.id}`);
                        }}
                        className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition-colors"
                      >
                        Verify Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Session History */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Session History</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pharmacist</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Duration</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No session history yet
                  </td>
                </tr>
              ) : (
                recentSessions.map((s: TelepharmacySession) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleJoinSession(s.id)}
                  >
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.participantName}</td>
                    <td className="px-4 py-3 text-gray-600">{s.pharmacistName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-purple-50 text-purple-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {SESSION_TYPE_LABELS[s.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-gray-500">
                      {formatDuration(s.duration)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status]}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[200px]">
                      {s.notes ?? "--"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card sub-component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className={`text-2xl font-bold ${colorClasses[color]?.split(" ")[1] ?? "text-gray-900"}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
