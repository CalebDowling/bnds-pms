"use client";

import React, { useEffect, useState } from "react";

import {
  getHIPAAAuditLog,
  getHIPAAStatsData,
  exportHIPAAAuditCSV,
} from "./actions";
import type { HISTAuditAction } from "@/lib/security/hipaa-audit";

export const dynamic = "force-dynamic";

interface AuditLogEntry {
  id: string;
  createdAt: Date;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  action: string;
  tableName: string;
  recordId: string;
  ipAddress: string | null;
  newValues: any;
}

interface Stats {
  totalPHIAccesses: number;
  uniquePatients: number;
  dataExports: number;
  failedLogins: number;
  userCount: number;
}

const ACTION_COLORS: Record<string, string> = {
  PHI_VIEW: "bg-blue-100 text-blue-800",
  PHI_EDIT: "bg-amber-100 text-amber-800",
  PHI_DELETE: "bg-red-100 text-red-800",
  PHI_EXPORT: "bg-purple-100 text-purple-800",
  RX_VIEW: "bg-blue-100 text-blue-800",
  RX_CREATE: "bg-green-100 text-green-800",
  RX_FILL: "bg-blue-100 text-blue-800",
  PATIENT_VIEW: "bg-blue-100 text-blue-800",
  LOGIN: "bg-gray-100 text-gray-800",
  LOGOUT: "bg-gray-100 text-gray-800",
  LOGIN_FAILED: "bg-red-100 text-red-800",
  "2FA_ENABLE": "bg-green-100 text-green-800",
  "2FA_DISABLE": "bg-red-100 text-red-800",
  DATA_EXPORT: "bg-purple-100 text-purple-800",
};

export function HIPAAAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [action, setAction] = useState<HISTAuditAction | "">("");
  const [userId, setUserId] = useState<string>("");

  const loadData = async () => {
    try {
      setLoading(true);

      const startDateTime = new Date(startDate + "T00:00:00Z");
      const endDateTime = new Date(endDate + "T23:59:59Z");

      const [logsData, statsData] = await Promise.all([
        getHIPAAAuditLog({
          startDate: startDateTime,
          endDate: endDateTime,
          action: action || undefined,
          userId: userId || undefined,
          limit: 500,
        }),
        getHIPAAStatsData(startDateTime, endDateTime),
      ]);

      setLogs(logsData.logs);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load audit data:", error);
      console.log("Failed to load audit data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);

      const startDateTime = new Date(startDate + "T00:00:00Z");
      const endDateTime = new Date(endDate + "T23:59:59Z");

      const csv = await exportHIPAAAuditCSV({
        startDate: startDateTime,
        endDate: endDateTime,
        action: action || undefined,
        userId: userId || undefined,
      });

      // Download CSV
      const element = document.createElement("a");
      element.setAttribute(
        "href",
        "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
      );
      element.setAttribute(
        "download",
        `hipaa-audit-${new Date().toISOString().split("T")[0]}.csv`
      );
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      console.log("Audit log exported");
    } catch (error) {
      console.error("Failed to export:", error);
      console.log("Failed to export audit log");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">HIPAA Audit Trail</h1>
      <p className="mb-8 text-gray-600">
        Monitor and audit all PHI (Protected Health Information) access
      </p>

      {/* Stats */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalPHIAccesses}
            </div>
            <div className="text-sm text-gray-600">PHI Accesses</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold text-gray-900">
              {stats.uniquePatients}
            </div>
            <div className="text-sm text-gray-600">Unique Patients</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold text-gray-900">
              {stats.dataExports}
            </div>
            <div className="text-sm text-gray-600">Data Exports</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold text-red-600">
              {stats.failedLogins}
            </div>
            <div className="text-sm text-gray-600">Failed Logins</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold text-gray-900">
              {stats.userCount}
            </div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Filters</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as HISTAuditAction | "")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="PHI_VIEW">PHI View</option>
              <option value="PHI_EDIT">PHI Edit</option>
              <option value="PHI_DELETE">PHI Delete</option>
              <option value="PHI_EXPORT">PHI Export</option>
              <option value="LOGIN">Login</option>
              <option value="LOGIN_FAILED">Login Failed</option>
            </select>
          </div>
          <div className="flex gap-2 pt-6">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Search"}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                User
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Action
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Record
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-3 text-gray-900">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-gray-900">
                    {log.user ? (
                      <div>
                        <div className="font-medium">
                          {log.user.firstName} {log.user.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.user.email}
                        </div>
                      </div>
                    ) : (
                      "Unknown"
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                        ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-xs text-gray-600">
                      <div>{log.tableName}</div>
                      <div className="font-mono text-gray-500">
                        {log.recordId.substring(0, 8)}...
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-600">
                    {log.ipAddress || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="font-semibold text-blue-900">HIPAA Compliance</h3>
        <ul className="mt-3 space-y-2 text-sm text-blue-800">
          <li>
            • All PHI access is logged automatically (view, edit, delete, export)
          </li>
          <li>• Authentication events (login, 2FA) are logged for accountability</li>
          <li>• Timestamps are recorded in UTC for consistency</li>
          <li>
            • Retain audit logs for a minimum of 6 years per HIPAA requirements
          </li>
          <li>• Export logs for regular audits and compliance verification</li>
        </ul>
      </div>
    </div>
  );
}
