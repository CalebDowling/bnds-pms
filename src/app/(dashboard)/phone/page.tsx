"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  getPhoneDashboard,
  holdCallAction,
  retrieveCallAction,
  transferCallAction,
  endCallAction,
} from "./actions";
import type {
  ActiveCall,
  HoldQueueEntry,
  CallStats,
  TransferTarget,
  PhoneDashboard,
} from "./actions";

// Extension labels (duplicated here to avoid importing server-only module in client component)
const EXTENSION_LABELS: Record<TransferTarget, string> = {
  pharmacy_main: "Pharmacy (Main)",
  pharmacist: "Pharmacist Direct",
  billing: "Billing",
  shipping: "Shipping",
  voicemail: "Voicemail",
};

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function reasonBadge(reason: string): { label: string; color: string } {
  switch (reason) {
    case "refill":
      return { label: "Refill", color: "bg-blue-100 text-blue-700" };
    case "status":
      return { label: "Rx Status", color: "bg-purple-100 text-purple-700" };
    case "pharmacist":
      return { label: "Pharmacist", color: "bg-emerald-100 text-emerald-700" };
    case "billing":
      return { label: "Billing", color: "bg-amber-100 text-amber-700" };
    case "shipping":
      return { label: "Shipping", color: "bg-cyan-100 text-cyan-700" };
    default:
      return { label: "General", color: "bg-gray-100 text-gray-600" };
  }
}

function statusBadge(status: string): { label: string; color: string } {
  switch (status) {
    case "ringing":
      return { label: "Ringing", color: "bg-yellow-100 text-yellow-700 animate-pulse" };
    case "active":
      return { label: "Active", color: "bg-green-100 text-green-700" };
    case "on-hold":
      return { label: "On Hold", color: "bg-yellow-100 text-yellow-700" };
    case "transferred":
      return { label: "Transferred", color: "bg-blue-100 text-blue-700" };
    default:
      return { label: status, color: "bg-gray-100 text-gray-600" };
  }
}

// ---------------------------------------------------------------------------
// Live Timer component
// ---------------------------------------------------------------------------

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="font-mono text-sm tabular-nums">{formatDuration(elapsed)}</span>
  );
}

// ---------------------------------------------------------------------------
// Stats Cards
// ---------------------------------------------------------------------------

function StatsCards({ stats }: { stats: CallStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Active Calls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Active Calls
          </span>
          {stats.activeCalls > 0 && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-gray-900">{stats.activeCalls}</p>
      </div>

      {/* On Hold */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            On Hold
          </span>
          {stats.onHoldCount > 0 && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-gray-900">{stats.onHoldCount}</p>
      </div>

      {/* Calls Today */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Calls Today
          </span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <p className="text-3xl font-bold text-gray-900">{stats.callsToday}</p>
      </div>

      {/* Avg Wait / Missed */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Avg Wait
          </span>
          {stats.missedCalls > 0 && (
            <span className="text-xs font-medium text-red-600">
              {stats.missedCalls} missed
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-gray-900">
          {formatDuration(stats.avgWaitTimeSeconds)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active Call Card
// ---------------------------------------------------------------------------

function ActiveCallCard({
  call,
  onHold,
  onTransfer,
  onEnd,
}: {
  call: ActiveCall;
  onHold: (sid: string) => void;
  onTransfer: (sid: string, target: TransferTarget) => void;
  onEnd: (sid: string) => void;
}) {
  const [showTransfer, setShowTransfer] = useState(false);
  const { label: statusLabel, color: statusColor } = statusBadge(call.status);
  const { label: reasonLabel, color: reasonColor } = reasonBadge(call.reason);

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all ${
        call.status === "active"
          ? "border-green-300 shadow-sm shadow-green-100"
          : call.status === "on-hold"
          ? "border-yellow-300 shadow-sm shadow-yellow-100"
          : call.status === "ringing"
          ? "border-yellow-400 shadow-md shadow-yellow-100 animate-pulse"
          : "border-gray-200"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {call.callerName ?? formatPhone(call.callerPhone)}
          </p>
          {call.callerName && (
            <p className="text-xs text-gray-500">{formatPhone(call.callerPhone)}</p>
          )}
          {call.patientMrn && (
            <p className="text-xs text-[#40721D] font-medium mt-0.5">
              MRN: {call.patientMrn}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${reasonColor}`}>
            {reasonLabel}
          </span>
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <LiveTimer startedAt={call.startedAt} />
        {call.assignedStaffName && (
          <span className="text-xs text-gray-500 ml-auto">
            {call.assignedStaffName}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {call.status === "active" && (
          <button
            onClick={() => onHold(call.callSid)}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
          >
            Hold
          </button>
        )}
        {call.status === "on-hold" && (
          <button
            onClick={() => onHold(call.callSid)}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
          >
            Retrieve
          </button>
        )}
        <div className="relative flex-1">
          <button
            onClick={() => setShowTransfer(!showTransfer)}
            className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            Transfer
          </button>
          {showTransfer && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-20">
              {(Object.entries(EXTENSION_LABELS) as [TransferTarget, string][]).map(
                ([target, label]) => (
                  <button
                    key={target}
                    onClick={() => {
                      onTransfer(call.callSid, target);
                      setShowTransfer(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => onEnd(call.callSid)}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
        >
          End
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hold Queue Card
// ---------------------------------------------------------------------------

function HoldQueueCard({
  entry,
  onRetrieve,
}: {
  entry: HoldQueueEntry;
  onRetrieve: (sid: string) => void;
}) {
  const isLongWait = entry.waitSeconds > 120; // > 2 min
  const { label: reasonLabel, color: reasonColor } = reasonBadge(entry.reason);

  return (
    <div
      className={`bg-white rounded-lg border p-3 transition-all ${
        isLongWait
          ? "border-red-300 shadow-sm shadow-red-100"
          : "border-yellow-200"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {entry.callerName ?? formatPhone(entry.callerPhone)}
          </p>
          {entry.patientMrn && (
            <p className="text-xs text-[#40721D] font-medium">MRN: {entry.patientMrn}</p>
          )}
        </div>
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${reasonColor}`}>
          {reasonLabel}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span
            className={`text-sm font-mono tabular-nums ${
              isLongWait ? "text-red-600 font-semibold" : "text-yellow-700"
            }`}
          >
            {formatDuration(entry.waitSeconds)}
          </span>
          {isLongWait && (
            <span className="text-xs text-red-500 font-medium">Long wait</span>
          )}
        </div>
        <button
          onClick={() => onRetrieve(entry.callSid)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#40721D] text-white hover:bg-[#345e17] transition-colors"
        >
          Retrieve
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Actions Panel
// ---------------------------------------------------------------------------

function QuickActionsPanel() {
  return (
    <div className="space-y-4">
      {/* Quick Transfer */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Departments</h3>
        <div className="space-y-2">
          {(Object.entries(EXTENSION_LABELS) as [string, string][]).map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100"
            >
              <span className="text-xs font-medium text-gray-700">{label}</span>
              <span className="inline-flex h-2 w-2 rounded-full bg-green-400" title="Available" />
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Links</h3>
        <div className="space-y-2">
          <Link
            href="/phone/history"
            className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Call History
          </Link>
          <Link
            href="/communications"
            className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            All Communications
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="text-center py-8">
      <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PhoneDashboardPage() {
  const [data, setData] = useState<PhoneDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const dashboard = await getPhoneDashboard();
      setData(dashboard);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to load phone dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // -- Action handlers --

  const handleHold = async (callSid: string) => {
    setActionPending(callSid);
    try {
      const call = data?.activeCalls.find((c) => c.callSid === callSid);
      if (call?.status === "on-hold") {
        await retrieveCallAction(callSid);
      } else {
        await holdCallAction(callSid);
      }
      await fetchData();
    } finally {
      setActionPending(null);
    }
  };

  const handleTransfer = async (callSid: string, target: TransferTarget) => {
    setActionPending(callSid);
    try {
      await transferCallAction(callSid, target);
      await fetchData();
    } finally {
      setActionPending(null);
    }
  };

  const handleEnd = async (callSid: string) => {
    setActionPending(callSid);
    try {
      await endCallAction(callSid);
      await fetchData();
    } finally {
      setActionPending(null);
    }
  };

  const handleRetrieve = async (callSid: string) => {
    setActionPending(callSid);
    try {
      await retrieveCallAction(callSid);
      await fetchData();
    } finally {
      setActionPending(null);
    }
  };

  // -- Render --

  if (loading && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeCalls = data?.activeCalls ?? [];
  const holdQueue = data?.holdQueue ?? [];
  const stats = data?.stats ?? {
    activeCalls: 0,
    onHoldCount: 0,
    callsToday: 0,
    avgWaitTimeSeconds: 0,
    missedCalls: 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Phone Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live call management and monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg">
              {error}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </span>
          <Link
            href="/phone/history"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Call History
          </Link>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Active Calls */}
        <div className="lg:col-span-5">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Active Calls
              </h2>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold px-1.5">
                {activeCalls.length}
              </span>
            </div>
            <div className="space-y-3">
              {activeCalls.length === 0 ? (
                <EmptyState
                  title="No active calls"
                  message="Incoming calls will appear here"
                />
              ) : (
                activeCalls.map((call) => (
                  <ActiveCallCard
                    key={call.callSid}
                    call={call}
                    onHold={handleHold}
                    onTransfer={handleTransfer}
                    onEnd={handleEnd}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Hold Queue */}
        <div className="lg:col-span-4">
          <div className="bg-yellow-50/50 rounded-xl border border-yellow-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Hold Queue
              </h2>
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-xs font-bold px-1.5 ${
                  holdQueue.length > 0
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {holdQueue.length}
              </span>
            </div>
            <div className="space-y-3">
              {holdQueue.length === 0 ? (
                <EmptyState
                  title="No callers on hold"
                  message="Callers placed on hold appear here"
                />
              ) : (
                holdQueue.map((entry) => (
                  <HoldQueueCard
                    key={entry.callSid}
                    entry={entry}
                    onRetrieve={handleRetrieve}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Quick Actions */}
        <div className="lg:col-span-3">
          <QuickActionsPanel />
        </div>
      </div>

      {/* Action overlay */}
      {actionPending && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg border border-gray-200 shadow-lg px-4 py-2 flex items-center gap-2 z-50">
          <svg className="w-4 h-4 animate-spin text-[#40721D]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs text-gray-600">Processing call action...</span>
        </div>
      )}
    </div>
  );
}
