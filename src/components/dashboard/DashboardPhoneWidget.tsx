"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Phone,
  PhoneOff,
  PhoneForwarded,
  PhoneIncoming,
  Pause,
  Play,
  ChevronRight,
  History,
  Clock,
  Users,
} from "lucide-react";
import {
  getPhoneDashboard,
  holdCallAction,
  retrieveCallAction,
  transferCallAction,
  endCallAction,
} from "@/app/(dashboard)/phone/actions";
import type {
  ActiveCall,
  HoldQueueEntry,
  CallStats,
  TransferTarget,
  PhoneDashboard,
} from "@/app/(dashboard)/phone/actions";

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

// ---------------------------------------------------------------------------
// Live Timer — ticks every second from a given start time
// ---------------------------------------------------------------------------

function LiveTimer({ startedAt, className }: { startedAt: string; className?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className={className ?? "font-mono text-[11px] tabular-nums"}>{formatDuration(elapsed)}</span>;
}

// ---------------------------------------------------------------------------
// Transfer Targets
// ---------------------------------------------------------------------------

const TRANSFER_TARGETS: { value: TransferTarget; label: string }[] = [
  { value: "pharmacy_main", label: "Pharmacy" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "billing", label: "Billing" },
  { value: "shipping", label: "Shipping" },
  { value: "voicemail", label: "Voicemail" },
];

// Department status labels for the bottom strip
const DEPARTMENTS = [
  { label: "Pharmacy", color: "#22c55e" },
  { label: "Pharmacist", color: "#22c55e" },
  { label: "Billing", color: "#22c55e" },
  { label: "Shipping", color: "#eab308" },
  { label: "Voicemail", color: "#22c55e" },
];

// ---------------------------------------------------------------------------
// Active Call Card (compact but full-featured)
// ---------------------------------------------------------------------------

function ActiveCallCard({
  call,
  onHold,
  onTransfer,
  onEnd,
  busy,
}: {
  call: ActiveCall;
  onHold: (sid: string) => void;
  onTransfer: (sid: string, target: TransferTarget) => void;
  onEnd: (sid: string) => void;
  busy: boolean;
}) {
  const [showTransfer, setShowTransfer] = useState(false);
  const isOnHold = call.status === "on-hold";
  const isRinging = call.status === "ringing";

  const borderColor = isOnHold ? "#eab308" : isRinging ? "#f97316" : "#22c55e";

  return (
    <div
      className={`rounded-lg p-2.5 transition-all ${isRinging ? "animate-pulse" : ""}`}
      style={{
        border: `1px solid ${borderColor}30`,
        borderLeft: `3px solid ${borderColor}`,
        backgroundColor: isOnHold
          ? "rgba(234,179,8,0.05)"
          : isRinging
          ? "rgba(249,115,22,0.05)"
          : "rgba(34,197,94,0.04)",
      }}
    >
      {/* Row 1: Name + status */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {call.callerName ?? formatPhone(call.callerPhone)}
            </span>
            {call.patientMrn && (
              <span
                className="text-[9px] font-semibold px-1.5 py-px rounded"
                style={{ color: "var(--green-700)", backgroundColor: "var(--green-100)" }}
              >
                {call.patientMrn}
              </span>
            )}
          </div>
          {call.callerName && (
            <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>
              {formatPhone(call.callerPhone)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: isOnHold ? "#fef9c3" : isRinging ? "#fff7ed" : "#dcfce7",
              color: isOnHold ? "#a16207" : isRinging ? "#c2410c" : "#15803d",
            }}
          >
            {isOnHold ? "HOLD" : isRinging ? "RING" : "LIVE"}
          </span>
          <LiveTimer
            startedAt={call.startedAt}
            className={`font-mono text-[11px] tabular-nums font-semibold ${
              isOnHold ? "text-yellow-600" : isRinging ? "text-orange-600" : "text-green-700"
            }`}
          />
        </div>
      </div>

      {/* Row 2: Action buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onHold(call.callSid)}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md border transition-colors disabled:opacity-40"
          style={{
            borderColor: isOnHold ? "#22c55e50" : "#eab30850",
            color: isOnHold ? "#15803d" : "#a16207",
            backgroundColor: isOnHold ? "#f0fdf4" : "#fefce8",
          }}
        >
          {isOnHold ? <Play size={10} /> : <Pause size={10} />}
          {isOnHold ? "Pick Up" : "Hold"}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowTransfer(!showTransfer)}
            disabled={busy}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-40"
          >
            <PhoneForwarded size={10} />
            Transfer
          </button>
          {showTransfer && (
            <div
              className="absolute top-full left-0 mt-1 w-36 rounded-lg border shadow-lg z-30"
              style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}
            >
              {TRANSFER_TARGETS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => { onTransfer(call.callSid, t.value); setShowTransfer(false); }}
                  className="block w-full text-left px-3 py-1.5 text-[11px] font-medium transition-colors first:rounded-t-lg last:rounded-b-lg"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--green-50)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onEnd(call.callSid)}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40 ml-auto"
        >
          <PhoneOff size={10} />
          End
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hold Queue Entry (compact card style)
// ---------------------------------------------------------------------------

function HoldCard({
  entry,
  onRetrieve,
  busy,
}: {
  entry: HoldQueueEntry;
  onRetrieve: (sid: string) => void;
  busy: boolean;
}) {
  const isLongWait = entry.waitSeconds > 120;

  return (
    <div
      className="rounded-lg p-2.5 transition-all"
      style={{
        border: `1px solid ${isLongWait ? "#ef444430" : "#eab30830"}`,
        borderLeft: `3px solid ${isLongWait ? "#ef4444" : "#eab308"}`,
        backgroundColor: isLongWait ? "rgba(239,68,68,0.04)" : "rgba(234,179,8,0.04)",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <span className="text-[12px] font-semibold truncate block" style={{ color: "var(--text-primary)" }}>
            {entry.callerName ?? formatPhone(entry.callerPhone)}
          </span>
          {entry.patientMrn && (
            <span className="text-[9px] font-semibold" style={{ color: "var(--green-700)" }}>
              MRN: {entry.patientMrn}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span
            className={`font-mono text-[12px] tabular-nums font-bold ${
              isLongWait ? "text-red-600" : "text-yellow-600"
            }`}
          >
            {formatDuration(entry.waitSeconds)}
          </span>
          {isLongWait && (
            <span className="text-[8px] font-bold text-red-500 uppercase tracking-wide">Long wait</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onRetrieve(entry.callSid)}
        disabled={busy}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold rounded-md text-white transition-colors disabled:opacity-40"
        style={{ backgroundColor: "var(--color-primary, #40721D)" }}
      >
        <Play size={10} />
        Pick Up Call
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Widget — Split Panel Layout
// ---------------------------------------------------------------------------

export default function DashboardPhoneWidget() {
  const [data, setData] = useState<PhoneDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const dashboard = await getPhoneDashboard();
      setData(dashboard);
    } catch {
      // Silently fail on dashboard — widget is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
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

  // -- Data --

  const activeCalls = data?.activeCalls ?? [];
  const holdQueue = data?.holdQueue ?? [];
  const stats = data?.stats ?? { activeCalls: 0, onHoldCount: 0, callsToday: 0, avgWaitTimeSeconds: 0, missedCalls: 0 };

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}>
      {/* ─── Header ─── */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-light)" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: "var(--color-primary)", color: "white" }}
          >
            <Phone size={12} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Phone System
          </span>
          {/* Live indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#22c55e" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "#22c55e" }} />
          </span>
        </div>
        <Link href="/phone" className="text-[9px] font-semibold hover:underline" style={{ color: "var(--green-700)" }}>
          Full Dashboard →
        </Link>
      </div>

      {/* ─── Stats Strip ─── */}
      <div
        className="grid grid-cols-4"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        {[
          { label: "Active", value: stats.activeCalls, icon: <Phone size={10} />, color: stats.activeCalls > 0 ? "#22c55e" : undefined, pulse: stats.activeCalls > 0 },
          { label: "On Hold", value: stats.onHoldCount, icon: <Pause size={10} />, color: stats.onHoldCount > 0 ? "#eab308" : undefined, pulse: stats.onHoldCount > 0 },
          { label: "Today", value: stats.callsToday, icon: <PhoneIncoming size={10} />, color: undefined, pulse: false },
          { label: "Missed", value: stats.missedCalls, icon: <PhoneOff size={10} />, color: stats.missedCalls > 0 ? "#ef4444" : undefined, pulse: false },
        ].map((s, i) => (
          <div
            key={s.label}
            className="py-2.5 text-center"
            style={{ borderLeft: i > 0 ? "1px solid var(--border-light)" : undefined }}
          >
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span style={{ color: s.color ?? "var(--text-muted)" }}>{s.icon}</span>
              {s.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: s.color }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: s.color }} />
                </span>
              )}
            </div>
            <div
              className="text-[18px] font-extrabold tabular-nums leading-none"
              style={{ color: s.color ?? "var(--text-primary)" }}
            >
              {loading ? "—" : s.value}
            </div>
            <div className="text-[8px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "var(--text-muted)" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Two-Column Split: Active Calls | Hold Queue ─── */}
      <div className="grid grid-cols-2" style={{ minHeight: "100px" }}>
        {/* Left: Active Calls */}
        <div style={{ borderRight: "1px solid var(--border-light)" }}>
          <div className="px-2.5 pt-2 pb-1 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Active Calls
            </span>
            <span
              className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: activeCalls.length > 0 ? "#dcfce7" : "var(--green-50)",
                color: activeCalls.length > 0 ? "#15803d" : "var(--text-muted)",
              }}
            >
              {activeCalls.length}
            </span>
          </div>
          <div className="px-2 pb-2 space-y-1.5">
            {activeCalls.length === 0 ? (
              <div className="py-4 text-center">
                <Phone size={16} style={{ color: "var(--text-muted)", margin: "0 auto" }} strokeWidth={1.5} />
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>No active calls</p>
              </div>
            ) : (
              activeCalls.slice(0, 3).map((call) => (
                <ActiveCallCard
                  key={call.callSid}
                  call={call}
                  onHold={handleHold}
                  onTransfer={handleTransfer}
                  onEnd={handleEnd}
                  busy={actionPending === call.callSid}
                />
              ))
            )}
            {activeCalls.length > 3 && (
              <p className="text-[9px] font-medium text-center" style={{ color: "var(--text-muted)" }}>
                +{activeCalls.length - 3} more
              </p>
            )}
          </div>
        </div>

        {/* Right: Hold Queue */}
        <div>
          <div className="px-2.5 pt-2 pb-1 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              On Hold
            </span>
            <span
              className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: holdQueue.length > 0
                  ? holdQueue.some((h) => h.waitSeconds > 120) ? "#fef2f2" : "#fefce8"
                  : "transparent",
                color: holdQueue.length > 0
                  ? holdQueue.some((h) => h.waitSeconds > 120) ? "#dc2626" : "#a16207"
                  : "var(--text-muted)",
              }}
            >
              {holdQueue.length}
            </span>
          </div>
          <div className="px-2 pb-2 space-y-1.5">
            {holdQueue.length === 0 ? (
              <div className="py-4 text-center">
                <Pause size={16} style={{ color: "var(--text-muted)", margin: "0 auto" }} strokeWidth={1.5} />
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>No callers on hold</p>
              </div>
            ) : (
              holdQueue.slice(0, 3).map((entry) => (
                <HoldCard
                  key={entry.callSid}
                  entry={entry}
                  onRetrieve={handleRetrieve}
                  busy={actionPending === entry.callSid}
                />
              ))
            )}
            {holdQueue.length > 3 && (
              <p className="text-[9px] font-medium text-center" style={{ color: "var(--text-muted)" }}>
                +{holdQueue.length - 3} more on hold
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Department Status Strip ─── */}
      <div style={{ borderTop: "1px solid var(--border-light)" }}>
        <div className="px-3 pt-2 pb-1">
          <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Departments
          </span>
        </div>
        <div className="px-3 pb-2 flex items-center gap-2 flex-wrap">
          {DEPARTMENTS.map((dept) => (
            <div
              key={dept.label}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md"
              style={{ backgroundColor: "rgba(0,0,0,0.02)", border: "1px solid var(--border-light)" }}
            >
              <span
                className="inline-flex h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: dept.color }}
              />
              <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                {dept.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Footer: Quick Actions ─── */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderTop: "1px solid var(--border-light)" }}>
        <Link
          href="/phone"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-md text-white no-underline transition-all hover:shadow-md"
          style={{ backgroundColor: "var(--color-primary, #40721D)" }}
        >
          <Phone size={12} />
          Open Call Center
          <ChevronRight size={11} />
        </Link>
        <Link
          href="/phone/history"
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-md no-underline transition-colors"
          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <History size={12} />
          History
        </Link>
      </div>
    </div>
  );
}
