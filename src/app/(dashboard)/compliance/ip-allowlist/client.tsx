"use client";

import React, { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

interface IPEntry {
  ip: string;
  label?: string;
  addedAt?: string;
}

interface IPAllowlistPageProps {
  initialIps: string[];
  initialEnabled: boolean;
}

export function IPAllowlistPage({
  initialIps,
  initialEnabled,
}: IPAllowlistPageProps) {
  const [ips, setIps] = useState<string[]>(initialIps);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [newIP, setNewIP] = useState("");
  const [currentIP, setCurrentIP] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    // Get current client IP
    const detectIP = async () => {
      try {
        const res = await fetch("/api/ip");
        if (res.ok) {
          const { ip } = await res.json();
          setCurrentIP(ip);
        }
      } catch (error) {
        console.error("Failed to detect IP:", error);
      }
    };

    detectIP();
  }, []);

  const handleAddIP = async () => {
    if (!newIP.trim()) {
      console.log("Please enter an IP or CIDR");
      return;
    }

    try {
      setAdding(true);
      const res = await fetch("/api/ip-allowlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: newIP.trim() }),
      });

      if (!res.ok) throw new Error("Failed to add IP");

      const { ips: newIps } = await res.json();
      setIps(newIps);
      setNewIP("");
      console.log("IP added to allowlist");
    } catch (error) {
      console.error("Failed to add IP:", error);
      console.log(error instanceof Error ? error.message : "Failed to add IP");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveIP = async (ip: string) => {
    try {
      setRemoving(true);
      const res = await fetch("/api/ip-allowlist/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });

      if (!res.ok) throw new Error("Failed to remove IP");

      const { ips: newIps } = await res.json();
      setIps(newIps);
      console.log("IP removed from allowlist");
    } catch (error) {
      console.error("Failed to remove IP:", error);
      console.log(error instanceof Error ? error.message : "Failed to remove IP");
    } finally {
      setRemoving(false);
    }
  };

  const handleToggle = async () => {
    try {
      const res = await fetch("/api/ip-allowlist/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });

      if (!res.ok) throw new Error("Failed to toggle");

      const { enabled: newEnabled } = await res.json();
      setEnabled(newEnabled);
      console.log(newEnabled ? "IP allowlist enabled" : "IP allowlist disabled");
    } catch (error) {
      console.error("Failed to toggle allowlist:", error);
      console.log("Failed to toggle IP allowlist");
    }
  };

  const handleAddCurrentIP = async () => {
    if (!currentIP) {
      console.log("Could not detect your IP address");
      return;
    }

    try {
      setAdding(true);
      const res = await fetch("/api/ip-allowlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: currentIP }),
      });

      if (!res.ok) throw new Error("Failed to add IP");

      const { ips: newIps } = await res.json();
      setIps(newIps);
      console.log(`Your IP (${currentIP}) added to allowlist`);
    } catch (error) {
      console.error("Failed to add current IP:", error);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading IP allowlist...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        IP Allowlist (Admin)
      </h1>
      <p className="mb-8 text-gray-600">
        Restrict admin access to specific IP addresses
      </p>

      {/* Enable/Disable Toggle */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">IP Allowlist Status</h2>
            <p className="mt-1 text-sm text-gray-600">
              {enabled
                ? "IP allowlist is active. Only listed IPs can access admin features."
                : "IP allowlist is disabled. All authenticated users can access admin features."}
            </p>
          </div>
          <button
            onClick={handleToggle}
            className={`rounded-md px-4 py-2 font-medium text-white ${
              enabled
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-600 hover:bg-gray-700"
            }`}
          >
            {enabled ? "Disable" : "Enable"}
          </button>
        </div>
      </div>

      {/* Current IP */}
      {currentIP && (
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="font-semibold text-blue-900">Your Current IP</h3>
          <p className="mt-2 text-sm text-blue-700">
            <code className="rounded bg-blue-100 px-2 py-1 font-mono">
              {currentIP}
            </code>
          </p>
          {!ips.includes(currentIP) && (
            <button
              onClick={handleAddCurrentIP}
              disabled={adding}
              className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add My IP"}
            </button>
          )}
        </div>
      )}

      {/* Add IP Form */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Add IP Address</h2>
        <p className="mb-4 text-sm text-gray-600">
          Enter individual IPs (192.168.1.1) or CIDR ranges (192.168.1.0/24)
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
            placeholder="192.168.1.1 or 192.168.1.0/24"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAddIP}
            disabled={adding || !newIP.trim()}
            className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      {/* IP List */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">
          Allowed IPs ({ips.length})
        </h2>

        {ips.length === 0 ? (
          <p className="text-sm text-gray-500">
            No IP addresses in allowlist. Add one above to enable IP restrictions.
          </p>
        ) : (
          <div className="space-y-2">
            {ips.map((ip) => (
              <div
                key={ip}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3"
              >
                <code className="font-mono text-sm text-gray-900">{ip}</code>
                <button
                  onClick={() => handleRemoveIP(ip)}
                  disabled={removing}
                  className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h3 className="font-semibold text-amber-900">Important Notes</h3>
        <ul className="mt-3 space-y-2 text-sm text-amber-800">
          <li>
            • When enabled, only IPs in the allowlist can access admin features
          </li>
          <li>
            • CIDR notation (e.g., 192.168.0.0/16) is supported for network ranges
          </li>
          <li>• Make sure to add your IP before enabling to avoid lockout</li>
          <li>
            • This feature is specifically for admin access, not regular user access
          </li>
        </ul>
      </div>
    </div>
  );
}
