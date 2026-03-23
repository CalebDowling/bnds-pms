"use client";

import { useEffect, useState } from "react";

interface SyncEntity {
  entity: string;
  lastSync: string | null;
  recordsSynced: number;
  errors: number;
  durationMs: number;
  syncCount: number;
}

interface SyncStatus {
  enabled: boolean;
  entities: SyncEntity[];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function entityLabel(entity: string): string {
  const labels: Record<string, string> = {
    doctors: "Prescribers",
    items: "Drug Catalog",
    patients: "Patients",
    prescriptions: "Prescriptions",
    fills: "Fills",
  };
  return labels[entity] || entity;
}

export default function ShadowModeBanner() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/drx-sync");
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch {
        // Silently fail — banner just won't show
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (!status?.enabled) return null;

  const totalRecords = status.entities.reduce((sum, e) => sum + e.recordsSynced, 0);
  const totalErrors = status.entities.reduce((sum, e) => sum + e.errors, 0);
  const lastSync = status.entities
    .map((e) => e.lastSync)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div className="relative z-40">
      {/* Top banner */}
      <div
        className="flex items-center justify-between px-4 py-2 text-sm cursor-pointer select-none"
        style={{
          background: "linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)",
          color: "#e0e0e0",
          borderBottom: "2px solid #40721D",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {/* Pulsing sync indicator */}
          <span className="relative flex h-3 w-3">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: "#40721D" }}
            />
            <span
              className="relative inline-flex rounded-full h-3 w-3"
              style={{ backgroundColor: "#40721D" }}
            />
          </span>

          <span className="font-semibold tracking-wide" style={{ color: "#40721D" }}>
            SHADOW MODE
          </span>

          <span className="text-xs opacity-70">
            Data synced from DRX — read-only mirror
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {lastSync && (
            <span className="opacity-70">
              Last sync: {timeAgo(lastSync)}
            </span>
          )}
          <span style={{ color: "#40721D" }}>
            {totalRecords.toLocaleString()} records
          </span>
          {totalErrors > 0 && (
            <span className="text-yellow-400">
              {totalErrors} errors
            </span>
          )}
          <span className="opacity-50">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div
          className="border-b px-4 py-3"
          style={{
            background: "#1a1a2e",
            borderColor: "#40721D33",
          }}
        >
          <div className="grid grid-cols-5 gap-3 max-w-4xl">
            {status.entities.map((e) => (
              <div
                key={e.entity}
                className="rounded-lg px-3 py-2 text-xs"
                style={{ background: "#16213e", border: "1px solid #40721D33" }}
              >
                <div className="font-medium text-white mb-1">
                  {entityLabel(e.entity)}
                </div>
                <div className="text-green-400 text-lg font-bold">
                  {e.recordsSynced.toLocaleString()}
                </div>
                <div className="opacity-50 text-gray-400 mt-1">
                  {e.lastSync ? timeAgo(e.lastSync) : "Never synced"}
                </div>
                {e.errors > 0 && (
                  <div className="text-yellow-400 mt-1">
                    {e.errors} errors
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span>
              Sync runs every 5 minutes via Vercel Cron
            </span>
            <span>•</span>
            <span>
              DRX remains the primary system — all data here is read-only
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
