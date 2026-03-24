"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL = 30_000; // 30 seconds

export default function QueuePollingWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [secondsLeft, setSecondsLeft] = useState(30);

  const refresh = useCallback(() => {
    router.refresh();
    setLastRefresh(Date.now());
    setSecondsLeft(30);
  }, [router]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  // Countdown timer
  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastRefresh) / 1000);
      setSecondsLeft(Math.max(0, 30 - elapsed));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastRefresh]);

  return (
    <div>
      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-b border-gray-100 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[10px] text-gray-400 font-medium">
            Live &middot; refreshes in {secondsLeft}s
          </span>
        </div>
        <button
          onClick={refresh}
          className="text-[10px] text-[#40721D] font-semibold hover:underline cursor-pointer"
        >
          Refresh now
        </button>
      </div>
      {children}
    </div>
  );
}
