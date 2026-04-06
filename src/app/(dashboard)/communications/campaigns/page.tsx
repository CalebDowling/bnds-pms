"use client";

/**
 * BNDS PMS — Outbound Calling Campaign Management
 * Active campaigns table, new campaign creation, call results, stats.
 */

import { useEffect, useState, useCallback } from "react";
import {
  getCampaignDashboard,
  createCampaignAction,
  executeCampaignAction,
  getCampaignDetail,
  retryFailed,
  type CampaignDashboardData,
  type CampaignDetailData,
} from "./actions";
import type { Campaign, CampaignType, CallResult } from "@/lib/communications/outbound-caller";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  rx_ready: "Rx Ready",
  refill_reminder: "Refill Reminder",
  med_sync_reminder: "Med Sync Reminder",
  appointment_reminder: "Appointment Reminder",
  custom: "Custom",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  running: "bg-blue-100 text-blue-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  // Call statuses
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-600",
  answered: "bg-green-100 text-green-700",
  voicemail: "bg-purple-100 text-purple-700",
  no_answer: "bg-orange-100 text-orange-700",
  busy: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CampaignManagementPage() {
  const [dashboard, setDashboard] = useState<CampaignDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetailData | null>(null);
  const [filterType, setFilterType] = useState<CampaignType | "">("");
  const [executing, setExecuting] = useState<string | null>(null);

  // New campaign form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CampaignType>("rx_ready");
  const [creating, setCreating] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getCampaignDashboard(
        filterType ? { type: filterType as CampaignType } : undefined,
      );
      setDashboard(data);
    } catch (err) {
      console.error("Failed to load campaign dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // -- Handlers --

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCampaignAction(newName, newType);
      setShowNewCampaign(false);
      setNewName("");
      await loadDashboard();
    } catch (err) {
      console.error("Failed to create campaign:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleExecute(campaignId: string) {
    setExecuting(campaignId);
    try {
      await executeCampaignAction(campaignId);
      await loadDashboard();
    } catch (err) {
      console.error("Failed to execute campaign:", err);
    } finally {
      setExecuting(null);
    }
  }

  async function handleRetry(campaignId: string) {
    setExecuting(campaignId);
    try {
      await retryFailed(campaignId);
      if (selectedCampaign?.campaign.id === campaignId) {
        const detail = await getCampaignDetail(campaignId);
        setSelectedCampaign(detail);
      }
      await loadDashboard();
    } catch (err) {
      console.error("Failed to retry:", err);
    } finally {
      setExecuting(null);
    }
  }

  async function handleViewDetail(campaignId: string) {
    const detail = await getCampaignDetail(campaignId);
    setSelectedCampaign(detail);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading campaigns...</div>
      </div>
    );
  }

  const stats = dashboard?.stats;
  const campaigns = dashboard?.campaigns ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outbound Calling Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">
            Automated patient outreach — Rx ready, refill reminders, med sync, and more
          </p>
        </div>
        <button
          onClick={() => setShowNewCampaign(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
        >
          + New Campaign
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Calls Today" value={stats.callsToday} icon="phone" />
          <StatCard label="Success Rate" value={`${stats.successRate}%`} icon="check" />
          <StatCard label="Pending Retries" value={stats.pendingRetries} icon="retry" />
          <StatCard
            label="Active Campaigns"
            value={`${stats.activeCampaigns} / ${stats.totalCampaigns}`}
            icon="campaign"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Filter by type:</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as CampaignType | "")}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Types</option>
          {Object.entries(CAMPAIGN_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* New Campaign Modal */}
      {showNewCampaign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Campaign</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Monday Rx Ready Calls"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as CampaignType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(CAMPAIGN_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                The call list will be built automatically from matching database records.
                Default: 2 retries, 4 hours apart.
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewCampaign(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating..." : "Create Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Campaign</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Completed</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Success</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No campaigns yet. Click "New Campaign" to get started.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewDetail(c.id)}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                    >
                      {c.name}
                    </button>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {CAMPAIGN_TYPE_LABELS[c.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono">{c.totalCalls}</td>
                  <td className="px-4 py-3 text-center font-mono">{c.completedCalls}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={c.successRate >= 50 ? "text-green-600 font-semibold" : "text-orange-600"}>
                      {c.successRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.status === "draft" && (
                        <button
                          onClick={() => handleExecute(c.id)}
                          disabled={executing === c.id}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {executing === c.id ? "Calling..." : "Start Calls"}
                        </button>
                      )}
                      {(c.status === "completed" || c.status === "running") && (
                        <button
                          onClick={() => handleRetry(c.id)}
                          disabled={executing === c.id}
                          className="px-3 py-1 bg-orange-500 text-white rounded text-xs font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                        >
                          Retry Failed
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Campaign Detail Panel */}
      {selectedCampaign && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedCampaign.campaign.name}
              </h2>
              <p className="text-sm text-gray-500">
                {CAMPAIGN_TYPE_LABELS[selectedCampaign.campaign.type]} &mdash;{" "}
                {selectedCampaign.campaign.totalCalls} calls
              </p>
            </div>
            <button
              onClick={() => setSelectedCampaign(null)}
              className="text-gray-400 hover:text-gray-600 text-lg"
            >
              Close
            </button>
          </div>

          {/* Call Results Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2 font-medium text-gray-600">Patient</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Phone</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Attempt</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Duration</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Last Attempt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selectedCampaign.callResults.map((call: CallResult) => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">{call.patientName}</td>
                  <td className="px-4 py-2 text-gray-500 font-mono text-xs">{call.phone}</td>
                  <td className="px-4 py-2 text-center text-gray-600">
                    {call.attemptNumber} / {call.maxAttempts}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[call.status] ?? "bg-gray-100"}`}
                    >
                      {call.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center font-mono text-gray-500">
                    {call.duration ? `${call.duration}s` : "--"}
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {call.lastAttemptAt
                      ? new Date(call.lastAttemptAt).toLocaleString()
                      : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card sub-component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  const iconMap: Record<string, string> = {
    phone: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
    check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    retry: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    campaign: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={iconMap[icon] ?? iconMap.phone} />
          </svg>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}
