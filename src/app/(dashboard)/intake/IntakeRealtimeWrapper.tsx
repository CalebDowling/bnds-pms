"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRealtime } from "@/hooks/useRealtime";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Wrapper component that subscribes to intake_queue realtime changes
 * and displays a notification banner when new items arrive.
 * Children (server-rendered IntakeQueueContent) are passed through.
 */
export default function IntakeRealtimeWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [newItemsCount, setNewItemsCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  // Subscribe to intake_queue changes
  useRealtime({
    table: "intake_queue",
    event: "INSERT",
    onEvent: (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      setNewItemsCount((prev) => prev + 1);
      setShowBanner(true);

      // Trigger server re-fetch
      router.refresh();

      // Auto-hide banner after 8 seconds
      setTimeout(() => {
        setShowBanner(false);
      }, 8000);
    },
  });

  const handleDismissBanner = () => {
    setShowBanner(false);
    setNewItemsCount(0);
  };

  return (
    <>
      {/* New Items Notification Banner */}
      {showBanner && newItemsCount > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 animate-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <div className="flex flex-col">
                <span className="font-semibold">New item{newItemsCount > 1 ? "s" : ""} received</span>
                <span className="text-blue-100 text-sm">
                  {newItemsCount} new {newItemsCount === 1 ? "intake item" : "intake items"} in queue
                </span>
              </div>
            </div>

            <button
              onClick={handleDismissBanner}
              className="flex-shrink-0 text-blue-200 hover:text-white transition-colors"
              aria-label="Dismiss notification"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main content with top padding when banner is showing */}
      <div className={showBanner && newItemsCount > 0 ? "pt-20" : ""}>
        {children}
      </div>
    </>
  );
}
