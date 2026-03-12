"use client";

import { useState, useCallback } from "react";

const DIAL_PAD = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" },
  { digit: "0", letters: "+" },
  { digit: "#", letters: "" },
];

function formatDialedNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function PhoneDialer() {
  const [number, setNumber] = useState("");
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [timerRef, setTimerRef] = useState<NodeJS.Timeout | null>(null);
  const [minimized, setMinimized] = useState(false);

  const pressDigit = useCallback((digit: string) => {
    if (number.replace(/\D/g, "").length < 10) {
      setNumber((prev) => prev + digit);
    }
  }, [number]);

  const backspace = useCallback(() => {
    setNumber((prev) => prev.slice(0, -1));
  }, []);

  const clearAll = useCallback(() => {
    setNumber("");
  }, []);

  const startCall = useCallback(() => {
    if (number.replace(/\D/g, "").length < 7) return;
    setCallActive(true);
    setCallDuration(0);
    const ref = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
    setTimerRef(ref);
  }, [number]);

  const endCall = useCallback(() => {
    setCallActive(false);
    setCallDuration(0);
    if (timerRef) clearInterval(timerRef);
    setTimerRef(null);
  }, [timerRef]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        className="bg-[var(--card-bg)] rounded-[10px] border border-[var(--border)] p-3 cursor-pointer hover:border-[var(--green-600)] transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--green-100)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">Phone</span>
          </div>
          {callActive && (
            <span className="text-[11px] font-mono text-[var(--green-700)] bg-[var(--green-100)] px-2 py-0.5 rounded-full animate-pulse">
              {formatDuration(callDuration)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-[10px] border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Phone
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-0.5"
          title="Minimize"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      {/* Display */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between bg-[var(--green-50)] rounded-lg px-3 py-2.5 border border-[var(--border-light)]">
          <span className={`font-mono text-[18px] tracking-wider ${
            number ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
          }`}>
            {number ? formatDialedNumber(number) : "(___) ___-____"}
          </span>
          {number && !callActive && (
            <button
              onClick={backspace}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Backspace"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
            </button>
          )}
        </div>
        {callActive && (
          <div className="text-center mt-1.5">
            <span className="text-[12px] font-semibold text-[var(--green-700)]">
              Calling... {formatDuration(callDuration)}
            </span>
          </div>
        )}
      </div>

      {/* Dial Pad */}
      <div className="px-4 pb-2">
        <div className="grid grid-cols-3 gap-1.5">
          {DIAL_PAD.map(({ digit, letters }) => (
            <button
              key={digit}
              onClick={() => pressDigit(digit)}
              className="flex flex-col items-center justify-center py-2.5 rounded-lg bg-[var(--page-bg)] hover:bg-[var(--green-100)] active:bg-[var(--green-600)] active:text-white transition-all cursor-pointer border-none"
            >
              <span className="text-[16px] font-semibold text-[var(--text-primary)] leading-none">{digit}</span>
              {letters && (
                <span className="text-[8px] font-medium text-[var(--text-muted)] tracking-[2px] mt-0.5">{letters}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-3 flex gap-2">
        {!callActive ? (
          <>
            <button
              onClick={clearAll}
              disabled={!number}
              className="flex-1 py-2 text-[12px] font-semibold rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--page-bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={startCall}
              disabled={number.replace(/\D/g, "").length < 7}
              className="flex-[2] py-2 text-[12px] font-semibold rounded-lg bg-[var(--green-700)] text-white hover:bg-[var(--green-900)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Call
            </button>
          </>
        ) : (
          <button
            onClick={endCall}
            className="flex-1 py-2.5 text-[12px] font-semibold rounded-lg bg-[#dc2626] text-white hover:bg-[#b91c1c] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            End Call
          </button>
        )}
      </div>
    </div>
  );
}
