"use client";

import { useState, useEffect } from "react";
import {
  getAlertConfigs,
  updateAlertConfig,
  getAlertHistory,
  testAlert,
} from "./actions";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const dynamic = "force-dynamic";

const ALERT_TYPES = [
  { id: "turnaround_time", label: "Turnaround Time Exceeds (minutes)" },
  { id: "daily_fills_low", label: "Daily Fill Count Below" },
  { id: "low_stock", label: "Low Stock Items Exceed" },
  { id: "rejection_rate", label: "Insurance Rejection Rate Exceeds (%)" },
  { id: "revenue_low", label: "Daily Revenue Below ($)" },
  { id: "pending_rx_high", label: "Pending Prescriptions Exceed" },
];

interface AlertConfig {
  id: string;
  type: string;
  enabled: boolean;
  threshold: number;
  channel: "email" | "sms" | "dashboard";
  recipients: string[];
}

export default function AlertsPage() {
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [alertHistory, setAlertHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cfgs, history] = await Promise.all([getAlertConfigs(), getAlertHistory()]);
      setConfigs(cfgs);
      setAlertHistory(history);
    } catch (error) {
      console.error("Failed to load alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (config: AlertConfig) => {
    try {
      await updateAlertConfig(config.id, { ...config, enabled: !config.enabled });
      loadData();
    } catch (error) {
      console.error("Failed to update alert:", error);
    }
  };

  const handleUpdateThreshold = async (config: AlertConfig, newThreshold: number) => {
    try {
      await updateAlertConfig(config.id, { ...config, threshold: newThreshold });
      loadData();
    } catch (error) {
      console.error("Failed to update alert:", error);
    }
  };

  const handleUpdateChannel = async (
    config: AlertConfig,
    newChannel: "email" | "sms" | "dashboard"
  ) => {
    try {
      await updateAlertConfig(config.id, { ...config, channel: newChannel });
      loadData();
    } catch (error) {
      console.error("Failed to update alert:", error);
    }
  };

  const handleTestAlert = async (alertId: string) => {
    try {
      setTestingId(alertId);
      await testAlert(alertId);
      alert("Test alert sent!");
    } catch (error) {
      console.error("Failed to test alert:", error);
      alert("Failed to send test alert");
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <PermissionGuard resource="settings" action="write">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading alerts...</p>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard resource="settings" action="write">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">KPI Alert System</h1>
          <p className="text-sm text-gray-500 mt-1">Configure alerts for pharmacy KPIs</p>
        </div>

        {/* Alert Configurations */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Alert Configurations</h2>
          {ALERT_TYPES.map((alertType) => {
            const config = configs.find((c) => c.type === alertType.id);
            if (!config) return null;

            return (
              <div
                key={config.id}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={() => handleToggle(config)}
                        className="rounded w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {alertType.label}
                      </span>
                    </label>
                  </div>
                  <button
                    onClick={() => handleTestAlert(config.id)}
                    disabled={testingId === config.id}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {testingId === config.id ? "Testing..." : "Test Alert"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Threshold */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase mb-2 block">
                      Threshold Value
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={config.threshold}
                        onChange={(e) =>
                          handleUpdateThreshold(config, Number(e.target.value))
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* Channel */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase mb-2 block">
                      Notification Channel
                    </label>
                    <select
                      value={config.channel}
                      onChange={(e) =>
                        handleUpdateChannel(
                          config,
                          e.target.value as "email" | "sms" | "dashboard"
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="dashboard">Dashboard</option>
                    </select>
                  </div>

                  {/* Recipients */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase mb-2 block">
                      Recipients
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {config.recipients.length === 0 ? (
                        <p className="text-xs text-gray-400">No recipients configured</p>
                      ) : (
                        config.recipients.map((r) => (
                          <span
                            key={r}
                            className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded"
                          >
                            {r}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alert History */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Alert Triggers</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Alert Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Threshold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Current Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Triggered At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alertHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                      No alerts triggered recently
                    </td>
                  </tr>
                ) : (
                  alertHistory.map((alert, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {ALERT_TYPES.find((t) => t.id === alert.type)?.label}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{alert.threshold}</td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        {alert.currentValue}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {new Date(alert.triggeredAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                            alert.status === "sent"
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-50 text-gray-700"
                          }`}
                        >
                          {alert.status === "sent" ? "Notified" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
