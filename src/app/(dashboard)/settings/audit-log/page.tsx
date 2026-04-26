"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ExportButton from "@/components/ui/ExportButton";
import { formatDate } from "@/lib/utils";
import { formatPatientName } from "@/lib/utils/formatters";
import PermissionGuard from "@/components/auth/PermissionGuard";

interface AuditLogEntry {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  action: string;
  tableName: string;
  recordId: string;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface AuditLogsResponse {
  data: AuditLogEntry[];
  pagination: PaginationInfo;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-50 text-green-700",
  UPDATE: "bg-blue-50 text-blue-700",
  DELETE: "bg-red-50 text-red-700",
  LOGIN: "bg-gray-50 text-gray-700",
  LOGOUT: "bg-gray-100 text-gray-600",
  VIEW: "bg-purple-50 text-purple-700",
  EXPORT: "bg-orange-50 text-orange-700",
  VERIFY: "bg-cyan-50 text-cyan-700",
};

const RESOURCE_COLORS: Record<string, string> = {
  auth: "bg-gray-100",
  users: "bg-blue-100",
  patients: "bg-green-100",
  prescriptions: "bg-purple-100",
  inventory: "bg-orange-100",
  compounding: "bg-pink-100",
  billing: "bg-yellow-100",
  claim: "bg-indigo-100",
};

function ActionBadge({ action }: { action: string }) {
  const colorClass = ACTION_COLORS[action] || "bg-gray-50 text-gray-700";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {action}
    </span>
  );
}

function ResourceBadge({ resource }: { resource: string }) {
  const colorClass = RESOURCE_COLORS[resource] || "bg-gray-100";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-700 ${colorClass}`}
    >
      {resource}
    </span>
  );
}

interface ExpandedRowState {
  [key: string]: boolean;
}

function DetailsCell({ entry }: { entry: AuditLogEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasDetails = entry.oldValues || entry.newValues;

  if (!hasDetails) {
    return <span className="text-gray-400 text-sm">—</span>;
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-[#40721D] hover:text-[#2D5114] font-medium text-sm inline-flex items-center gap-1"
      >
        {isExpanded ? "Hide" : "Show"} Details
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
          {entry.oldValues && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">OLD VALUES:</p>
              <pre className="text-xs text-gray-700 overflow-x-auto max-h-48 whitespace-pre-wrap break-words">
                {JSON.stringify(entry.oldValues, null, 2)}
              </pre>
            </div>
          )}
          {entry.newValues && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">NEW VALUES:</p>
              <pre className="text-xs text-gray-700 overflow-x-auto max-h-48 whitespace-pre-wrap break-words">
                {JSON.stringify(entry.newValues, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AuditLogPageContent() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  async function fetchLogs(page: number = 1) {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "50");

      if (actionFilter) params.set("action", actionFilter);
      if (resourceFilter) params.set("resource", resourceFilter);
      if (dateFromFilter) params.set("dateFrom", dateFromFilter);
      if (dateToFilter) params.set("dateTo", dateToFilter);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You don't have permission to view audit logs");
        }
        throw new Error(`Failed to fetch audit logs: ${response.status}`);
      }

      const data: AuditLogsResponse = await response.json();
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audit logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, resourceFilter, dateFromFilter, dateToFilter]);

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchLogs(pagination.page - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.pages) {
      fetchLogs(pagination.page + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">Track all system activities and user actions</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            endpoint="/api/export/audit-logs"
            filename="audit_logs"
            sheetName="Audit Logs"
            params={{
              action: actionFilter,
              resource: resourceFilter,
              dateFrom: dateFromFilter,
              dateTo: dateToFilter,
            }}
          />
          <Link
            href="/settings"
            className="text-sm text-[#40721D] hover:text-[#2D5114] font-medium"
          >
            ← Back to Settings
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Action Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="VIEW">View</option>
              <option value="EXPORT">Export</option>
              <option value="VERIFY">Verify</option>
            </select>
          </div>

          {/* Resource Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Resource
            </label>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
            >
              <option value="">All Resources</option>
              <option value="auth">Auth</option>
              <option value="users">Users</option>
              <option value="patients">Patients</option>
              <option value="prescriptions">Prescriptions</option>
              <option value="inventory">Inventory</option>
              <option value="compounding">Compounding</option>
              <option value="billing">Billing</option>
              <option value="claim">Claims</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
            />
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setActionFilter("");
                setResourceFilter("");
                setDateFromFilter("");
                setDateToFilter("");
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg">No audit log entries found</p>
            {(actionFilter || resourceFilter || dateFromFilter || dateToFilter) && (
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Timestamp
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Resource
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Resource ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Details
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(new Date(log.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {formatPatientName({ firstName: log.user.firstName, lastName: log.user.lastName })}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{log.user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3">
                      <ResourceBadge resource={log.tableName} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono max-w-xs truncate">
                      {log.recordId && log.recordId !== "unknown" ? log.recordId : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <DetailsCell entry={log} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {log.ipAddress ? (
                        <span className="font-mono text-xs">{log.ipAddress}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} entries
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => fetchLogs(p)}
                    className={`px-2 py-1 text-sm rounded-lg transition-colors ${
                      pagination.page === p
                        ? "bg-[#40721D] text-white"
                        : "border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={handleNextPage}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <PermissionGuard resource="settings" action="admin">
      <AuditLogPageContent />
    </PermissionGuard>
  );
}
