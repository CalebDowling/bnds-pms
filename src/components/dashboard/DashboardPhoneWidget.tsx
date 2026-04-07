"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Phone,
  PhoneOff,
  PhoneForwarded,
  Pause,
  Play,
  ChevronRight,
  History,
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

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="font-mono text-xs tabular-nums">{formatDuration(elapsed)}</span>;
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

// ---------------------------------------------------------------------------
// Compact Active Call Row
// ---------------------------------------------------------------------------

function ActiveCallRow({
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

  return (
    <div
      className={`px-3 py-2 transition-all ${
        isRinging ? "animate-pulse" : ""
      }`}
      style={{
        borderLeft: `3px solid ${
          isOnHold ? "#eab308" : isRinging ? "#f97316" : "#22c55e"
        }`,
        backgroundColor: isOnHold
          ? "rgba(234,179,8,0.04)"
          : isRinging
          ? "rgba(249,115,22,0.04)"
          : "transparent",
      }}
    >
      {/* Row 1: caller info + duration */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {call.callerName ?? formatPhone(call.callerPhone)}
            </span>
            {call.patientMrn && (
              <span className="text-[10px] font-medium px-1 py-px rounded" style={{ color: "var(--green-700)", backgroundColor: "var(--green-100)" }}>
                {call.patientMrn}
              </span>
            )}
          </div>
          {call.callerName && (
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {formatPhone(call.callerPhone)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: isOnHold ? "#fef9c3" : isRinging ? "#fff7ed" : "#dcfce7",
              color: isOnHold ? "#a16207" : isRinging ? "#c2410c" : "#15803d",
            }}
          >
            {isOnHold ? "Hold" : isRinging ? "Ring" : "Live"}
          </span>
          <LiveTimer startedAt={call.startedAt} />
        </div>
      </div>

      {/* Row 2: action buttons */}
      <div className="flex items-center gap-1.5 mt-1.5">
        {/* Hold / Retrieve */}
        <button
          onClick={() => onHold(call.callSid)}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md border transition-colors disabled:opacity-40"
          style={{
            borderColor: isOnHold ? "var(--green-600)" : "#eab308",
            color: isOnHold ? "var(--green-700)" : "#a16207",
            backgroundColor: isOnHold ? "var(--green-50)" : "#fefce8",
          }}
          title={isOnHold ? "Retrieve from hold" : "Place on hold"}
        >
          {isOnHold ? <Play size={10} /> : <Pause size={10} />}
          {isOnHold ? "Pick Up" : "Hold"}
        </button>

        {/* Transfer (dropdown) */}
        <div className="relative">
          <button
            onClick={() => setShowTransfer(!showTransfer)}
            disabled={busy}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-40"
            title="Transfer call"
          >
            <PhoneForwarded size={10} />
            Xfer
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

        {/* End Call */}
        <button
          onClick={() => onEnd(call.callSid)}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40 ml-auto"
          title="End call"
        >
          <PhoneOff size={10} />
          End
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hold Queue Row (compact)
// ---------------------------------------------------------------------------

function HoldRow({
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
      className="flex items-center justify-between px-3 py-1.5"
      style={{
        borderLeft: `3px solid ${isLongWait ? "#ef4444" : "#eab308"}`,
        backgroundColor: isLongWait ? "rgba(239,68,68,0.04)" : "transparent",
      }}
    >
      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-medium truncate block" style={{ color: "var(--text-primary)" }}>
          {entry.callerName ?? formatPhone(entry.callerPhone)}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`text-[10px] font-mono tabular-nums font-semibold ${
            isLongWait ? "text-red-600" : "text-yellow-600"
          }`}
        >
          {formatDuration(entry.waitSeconds)}
        </span>
        <button
          onClick={() => onRetrieve(entry.callSid)}
          disabled={busy}
          className="px-2 py-0.5 text-[10px] font-semibold rounded text-white transition-colors disabled:opacity-40"
          style={{ backgroundColor: "var(--color-primary, #40721D)" }}
        >
          Pick Up
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Widget
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
  const hasActivity = activeCalls.length > 0 || holdQueue.length > 0;

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-light)" }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Phone System
          </span>
          {/* Live indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "var(--green-400)" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "var(--green-500)" }} />
          </span>
        </div>
        <Link href="/phone" className="text-[9px] font-semibold hover:underline" style={{ color: "var(--green-700)" }}>
          Full Dashboard
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 divide-x" style={{ borderBottom: "1px solid var(--border-light)", borderColor: "var(--border-light)" }}>
        {[
          { label: "Active", value: stats.activeCalls, color: stats.activeCalls > 0 ? "#22c55e" : undefined },
          { label: "Hold", value: stats.onHoldCount, color: stats.onHoldCount > 0 ? "#eab308" : undefined },
          { label: "Today", value: stats.callsToday, color: undefined },
          { label: "Missed", value: stats.missedCalls, color: stats.missedCalls > 0 ? "#ef4444" : undefined },
        ].map((s) => (
          <div key={s.label} className="py-2 text-center" style={{ borderColor: "var(--border-light)" }}>
            <div
              className="text-[16px] font-bold tabular-nums"
              style={{ color: s.color ?? "var(--text-primary)" }}
            >
              {loading ? "—" : s.value}
            </div>
            <div className="text-[9px] font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Active Calls */}
      {activeCalls.length > 0 && (
        <div>
          <div className="px-3 pt-2 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Active Calls
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
            {activeCalls.slice(0, 4).map((call) => (
              <ActiveCallRow
                key={call.callSid}
                call={call}
                onHold={handleHold}
                onTransfer={handleTransfer}
                onEnd={handleEnd}
                busy={actionPending === call.callSid}
              />
            ))}
          </div>
          {activeCalls.length > 4 && (
            <div className="px-3 py-1 text-center">
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                +{activeCalls.length - 4} more calls
              </span>
            </div>
          )}
        </div>
      )}

      {/* Hold Queue */}
      {holdQueue.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-light)" }}>
          <div className="px-3 pt-2 pb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              On Hold
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: holdQueue.some((h) => h.waitSeconds > 120) ? "#fef2f2" : "#fefce8",
                color: holdQueue.some((h) => h.waitSeconds > 120) ? "#dc2626" : "#a16207",
              }}
            >
              {holdQueue.length}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
            {holdQueue.slice(0, 3).map((entry) => (
              <HoldRow
                key={entry.callSid}
                entry={entry}
                onRetrieve={handleRetrieve}
                busy={actionPending === entry.callSid}
              />
            ))}
          </div>
          {holdQueue.length > 3 && (
            <div className="px-3 py-1 text-center">
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                +{holdQueue.length - 3} more on hold
              </span>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasActivity && (
        <div className="py-4 text-center">
          <Phone size={20} style={{ color: "var(--text-muted)", margin: "0 auto" }} strokeWidth={1.5} />
          <p className="text-[11px] font-medium mt-1.5" style={{ color: "var(--text-muted)" }}>
            No active calls
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Incoming calls appear here automatically
          </p>
        </div>
      )}

      {/* Footer — quick links */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderTop: "1px solid var(--border-light)" }}>
        <Link
          href="/phone"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold rounded-md text-white no-underline transition-colors"
          style={{ backgroundColor: "var(--color-primary, #40721D)" }}
        >
          <Phone size={11} />
          Call Center
          <ChevronRight size={10} />
        </Link>
        <Link
          href="/phone/history"
          className="flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-semibold rounded-md no-underline transition-colors"
          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <History size={11} />
          History
        </Link>
      </div>
    </div>
  );
}
