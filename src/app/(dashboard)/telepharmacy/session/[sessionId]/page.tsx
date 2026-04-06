"use client";

/**
 * BNDS PMS — Telepharmacy Video Consultation Page
 * Video container, patient info sidebar, verification details,
 * counseling checklist, session notes, and outcome recording.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getSessionDetail,
  joinSessionAction,
  completeSession,
  type SessionDetailData,
} from "../../actions";
import type {
  SessionOutcome,
  CounselingChecklistItem,
} from "@/lib/telepharmacy/video-session";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TelepharmacySessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [detail, setDetail] = useState<SessionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState("");
  const [outcomeResult, setOutcomeResult] = useState<SessionOutcome["result"]>("completed");
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [counselingChecklist, setCounselingChecklist] = useState<CounselingChecklistItem[]>([]);
  const [completing, setCompleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const data = await getSessionDetail(sessionId);
      setDetail(data);

      if (data?.session) {
        // Auto-join if waiting
        if (data.session.status === "waiting") {
          await joinSessionAction(sessionId);
          const refreshed = await getSessionDetail(sessionId);
          setDetail(refreshed);
        }

        // Initialize counseling checklist
        if (data.session.counselingChecklist) {
          setCounselingChecklist(data.session.counselingChecklist);
        }

        // Initialize notes
        if (data.session.notes) {
          setNotes(data.session.notes);
        }
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Timer
  useEffect(() => {
    if (detail?.session?.status === "active" && detail.session.startedAt) {
      const startTime = new Date(detail.session.startedAt).getTime();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.round((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [detail?.session?.status, detail?.session?.startedAt]);

  // -- Handlers --

  function handleChecklistToggle(id: string) {
    setCounselingChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  }

  async function handleComplete() {
    if (!outcomeSummary.trim()) return;
    setCompleting(true);
    try {
      const outcome: SessionOutcome = {
        result: outcomeResult,
        summary: outcomeSummary,
        clinicalNotes: notes,
        followUpRequired: outcomeResult === "follow_up",
      };

      await completeSession(
        sessionId,
        notes,
        outcome,
        counselingChecklist.length > 0 ? counselingChecklist : undefined,
      );

      router.push("/telepharmacy");
    } catch (err) {
      console.error("Failed to complete session:", err);
    } finally {
      setCompleting(false);
    }
  }

  function formatTimer(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading session...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Session not found</div>
      </div>
    );
  }

  const { session, patientInfo, fillInfo } = detail;
  const isActive = session.status === "active" || session.status === "waiting";
  const isCompleted = session.status === "completed";
  const isVerification = session.type === "verification";
  const isCounseling = session.type === "counseling";

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/telepharmacy")}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {isVerification
                ? "RPh Verification"
                : isCounseling
                  ? "Patient Counseling"
                  : "Consultation"}
            </h1>
            <p className="text-xs text-gray-500">
              {session.participantName}
              {session.remoteLocationName ? ` — ${session.remoteLocationName}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Timer */}
          {isActive && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="font-mono text-sm font-semibold text-red-700">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>
          )}
          {isCompleted && session.duration && (
            <div className="text-sm text-gray-500">
              Duration: {formatTimer(session.duration)}
            </div>
          )}
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
              session.status === "active"
                ? "bg-green-100 text-green-700"
                : session.status === "completed"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {session.status}
          </span>
        </div>
      </div>

      {/* Main Content: Video + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Video + Notes */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Container */}
          <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center relative">
            {isActive ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>
                <p className="text-gray-300 text-sm font-medium">Video Session Active</p>
                <p className="text-gray-500 text-xs mt-1">
                  WebRTC video feed will render here when connected
                </p>
                <p className="text-gray-600 text-xs mt-3 font-mono">
                  Room: {session.roomUrl}
                </p>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Session {session.status}</div>
            )}
            {/* Video controls bar */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-3 flex items-center justify-center gap-4">
                <button className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <button className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                  </svg>
                </button>
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-10 h-10 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors"
                  title="End Session"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Session Notes */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Session Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document clinical observations, patient questions, counseling points..."
              rows={4}
              disabled={isCompleted}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 resize-none"
            />
          </div>

          {/* Counseling Checklist */}
          {isCounseling && counselingChecklist.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Counseling Checklist
              </h3>
              <div className="space-y-2">
                {counselingChecklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleChecklistToggle(item.id)}
                      disabled={isCompleted}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`text-sm ${item.checked ? "text-gray-400 line-through" : "text-gray-700"}`}
                    >
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-400">
                {counselingChecklist.filter((i) => i.checked).length} of{" "}
                {counselingChecklist.length} items completed
              </div>
            </div>
          )}

          {/* Complete Session Panel */}
          {isActive && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Complete Session</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Outcome
                  </label>
                  <select
                    value={outcomeResult}
                    onChange={(e) =>
                      setOutcomeResult(e.target.value as SessionOutcome["result"])
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {isVerification ? (
                      <>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="follow_up">Follow-Up Required</option>
                      </>
                    ) : (
                      <>
                        <option value="completed">Completed</option>
                        <option value="follow_up">Follow-Up Required</option>
                        <option value="referred">Referred</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Outcome Summary
                  </label>
                  <input
                    type="text"
                    value={outcomeSummary}
                    onChange={(e) => setOutcomeSummary(e.target.value)}
                    placeholder={
                      isVerification
                        ? "e.g., Fill verified, no DUR issues"
                        : "e.g., Patient counseled on new medication"
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleComplete}
                  disabled={completing || !outcomeSummary.trim()}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {completing ? "Completing..." : "Complete Session"}
                </button>
              </div>
            </div>
          )}

          {/* Completed outcome display */}
          {isCompleted && session.outcome && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Session Outcome</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Result:</span>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      session.outcome.result === "approved" || session.outcome.result === "completed"
                        ? "bg-green-100 text-green-700"
                        : session.outcome.result === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {session.outcome.result}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Summary: </span>
                  <span className="text-sm text-gray-700">{session.outcome.summary}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Patient Info + Fill Details */}
        <div className="space-y-4">
          {/* Patient Info */}
          {patientInfo && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Patient Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Name</div>
                  <div className="text-sm font-medium text-gray-900 mt-0.5">
                    {patientInfo.name}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">DOB</div>
                  <div className="text-sm text-gray-700 mt-0.5">{patientInfo.dob}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Allergies</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {patientInfo.allergies.map((a) => (
                      <span
                        key={a}
                        className="inline-block bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5 text-xs font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">
                    Active Medications
                  </div>
                  <ul className="mt-1 space-y-1">
                    {patientInfo.activeMeds.map((med) => (
                      <li key={med} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-blue-400 mt-0.5">&#x2022;</span>
                        {med}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Fill Details (Verification sessions) */}
          {isVerification && fillInfo && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Fill Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Rx Number</div>
                  <div className="text-sm font-mono text-blue-600 mt-0.5">
                    {fillInfo.rxNumber}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Medication</div>
                  <div className="text-sm font-medium text-gray-900 mt-0.5">
                    {fillInfo.medication}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Directions</div>
                  <div className="text-sm text-gray-700 mt-0.5">{fillInfo.directions}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Quantity</div>
                  <div className="text-sm text-gray-700 mt-0.5">{fillInfo.quantity}</div>
                </div>
              </div>

              {/* Label Preview placeholder */}
              <div className="mt-4 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                <svg
                  className="w-8 h-8 text-gray-300 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <p className="text-xs text-gray-400">Label preview loads here</p>
              </div>

              {/* DUR Alerts */}
              {fillInfo.durAlerts.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                    DUR Alerts
                  </div>
                  <div className="space-y-2">
                    {fillInfo.durAlerts.map((alert, i) => (
                      <div
                        key={i}
                        className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2"
                      >
                        <svg
                          className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                          />
                        </svg>
                        {alert}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Session Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Session Info</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Session ID</span>
                <span className="text-gray-700 font-mono">{session.id.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pharmacist</span>
                <span className="text-gray-700">{session.pharmacistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Participant</span>
                <span className="text-gray-700">
                  {session.participantName} ({session.participantRole})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-700">
                  {new Date(session.createdAt).toLocaleString()}
                </span>
              </div>
              {session.startedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Started</span>
                  <span className="text-gray-700">
                    {new Date(session.startedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {session.endedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Ended</span>
                  <span className="text-gray-700">
                    {new Date(session.endedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
