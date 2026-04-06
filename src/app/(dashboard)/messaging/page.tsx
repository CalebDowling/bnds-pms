/**
 * Messaging Dashboard
 * Staff view for sending notifications and viewing history
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMessagingStats, getNotificationHistory } from "./actions";
import { sendManualNotification } from "./actions";

interface MessageStats {
  totalSent: number;
  emailsSent: number;
  smsSent: number;
  lastSentAt: string | null;
  byTemplate: Record<string, number>;
}

export default function MessagingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [formData, setFormData] = useState({
    patientId: "",
    template: "readyForPickup" as const,
    channels: ["email", "sms"],
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Load stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await getMessagingStats();
        setStats(statsData);
      } catch (error) {
        console.error("Failed to load stats:", error);
      }
    };

    loadStats();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (!formData.patientId) {
        setMessage({ type: "error", text: "Please select a patient" });
        return;
      }

      const result = await sendManualNotification(
        formData.patientId,
        formData.template,
        {},
        formData.channels as any
      );

      if (result.success) {
        setMessage({ type: "success", text: "Notification sent successfully!" });
        setFormData({ patientId: "", template: "readyForPickup", channels: ["email", "sms"] });
        // Reload stats
        const statsData = await getMessagingStats();
        setStats(statsData);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to send notification",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChannelToggle = (channel: "email" | "sms") => {
    setFormData({
      ...formData,
      channels: formData.channels.includes(channel)
        ? formData.channels.filter((c) => c !== channel)
        : [...formData.channels, channel],
    });
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Patient Messaging</h1>
        <p className="mt-2 text-gray-600">Send notifications to patients via email and SMS</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600">Total Sent</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSent}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600">Emails</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{stats.emailsSent}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600">SMS</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{stats.smsSent}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600">Last Sent</div>
            <div className="text-sm text-gray-900 mt-2">
              {stats.lastSentAt ? new Date(stats.lastSentAt).toLocaleDateString() : "Never"}
            </div>
          </div>
        </div>
      )}

      {/* Quick Send Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Send Notification</h2>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSendNotification} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient ID
              </label>
              <input
                type="text"
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                placeholder="Enter patient ID or MRN"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
              />
            </div>

            {/* Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template
              </label>
              <select
                value={formData.template}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    template: e.target.value as any,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#40721D] focus:border-transparent"
              >
                <option value="readyForPickup">Ready for Pickup</option>
                <option value="refillDue">Refill Due</option>
                <option value="refillProcessed">Refill Processed</option>
                <option value="shippingUpdate">Shipping Update</option>
                <option value="prescriptionExpiring">Prescription Expiring</option>
              </select>
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Send Via
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.channels.includes("email")}
                  onChange={() => handleChannelToggle("email")}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-gray-700">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.channels.includes("sms")}
                  onChange={() => handleChannelToggle("sms")}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-gray-700">SMS</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !formData.patientId}
            className="w-full bg-[#40721D] text-white py-2 rounded-lg font-medium hover:bg-[#2d5018] disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? "Sending..." : "Send Notification"}
          </button>
        </form>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-2">About Patient Notifications</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>
            • <strong>Email</strong>: Sent to patient email address if available
          </li>
          <li>
            • <strong>SMS</strong>: Sent to patient phone if they have opted in
          </li>
          <li>• All notifications are logged in the Communication Log for compliance</li>
          <li>• Templates are pre-formatted with pharmacy branding</li>
        </ul>
      </div>
    </div>
  );
}
