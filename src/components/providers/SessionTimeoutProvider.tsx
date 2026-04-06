"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export default function SessionTimeoutProvider({
  children,
  timeoutMinutes = 30,
  warningMinutes = 5,
}: SessionTimeoutProviderProps) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningMinutes * 60 * 1000;

  const handleLogout = useCallback(async () => {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Clear any timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setShowWarning(false);
    router.push("/login");
  }, [router]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Clear existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setShowWarning(false);

    // Set warning timer (5 minutes before timeout)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsRemaining(warningMs / 1000);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, timeoutMs - warningMs);

    // Set logout timer
    timerRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  }, [timeoutMs, warningMs, handleLogout]);

  const handleStayLoggedIn = useCallback(() => {
    setShowWarning(false);
    resetTimer();
  }, [resetTimer]);

  // Set up activity listeners
  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    let activityTimeout: NodeJS.Timeout | null = null;

    const handleActivity = () => {
      // Debounce activity detection to avoid resetting timer on every keystroke
      if (activityTimeout) clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        resetTimer();
      }, 1000);
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial timer
    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (activityTimeout) clearTimeout(activityTimeout);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimer]);

  return (
    <>
      {children}

      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-amber-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900">
              Session Expiring
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your session will expire due to inactivity in{" "}
              <span className="font-semibold text-amber-600">
                {Math.floor(secondsRemaining / 60)}:
                {String(secondsRemaining % 60).padStart(2, "0")}
              </span>
              .
            </p>

            {/* Progress bar */}
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-amber-500 transition-all duration-1000"
                style={{
                  width: `${(secondsRemaining / (warningMs / 1000)) * 100}%`,
                }}
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleStayLoggedIn}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Stay Logged In
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
