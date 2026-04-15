/**
 * Messaging Dashboard
 * Staff view for sending notifications and viewing history
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Mail, MessageSquare, Clock, Info } from "lucide-react";
import { getMessagingStats, sendManualNotification } from "./actions";
import PageShell from "@/components/layout/PageShell";
import StatsRow from "@/components/layout/StatsRow";

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
    <PageShell
      title="Patient Messaging"
      subtitle="Send notifications to patients via email and SMS"
      stats={
        stats ? (
          <StatsRow
            stats={[
              { label: "Total Sent", value: stats.totalSent, icon: <Send size={12} /> },
              { label: "Emails", value: stats.emailsSent, icon: <Mail size={12} />, accent: "#2563eb" },
              { label: "SMS", value: stats.smsSent, icon: <MessageSquare size={12} />, accent: "var(--color-primary)" },
              {
                label: "Last Sent",
                value: stats.lastSentAt
                  ? new Date(stats.lastSentAt).toLocaleDateString()
                  : "Never",
                icon: <Clock size={12} />,
              },
            ]}
          />
        ) : undefined
      }
    >
      {/* Quick Send Form */}
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        <h2 className="mb-6">Send Notification</h2>

        {message && (
          <div
            className="mb-6 p-4 rounded-lg text-sm font-semibold"
            style={{
              backgroundColor: message.type === "success" ? "var(--green-100)" : "#fef2f2",
              border: `1px solid ${message.type === "success" ? "var(--border)" : "#fecaca"}`,
              color: message.type === "success" ? "var(--green-700)" : "#b91c1c",
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSendNotification} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient ID */}
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Patient ID
              </label>
              <input
                type="text"
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                placeholder="Enter patient ID or MRN"
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--page-bg)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Template */}
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: "var(--text-muted)" }}
              >
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
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--page-bg)",
                  color: "var(--text-primary)",
                }}
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
            <label
              className="block text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              Send Via
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.channels.includes("email")}
                  onChange={() => handleChannelToggle("email")}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "var(--color-primary)" }}
                />
                <Mail size={14} style={{ color: "var(--text-muted)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.channels.includes("sms")}
                  onChange={() => handleChannelToggle("sms")}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "var(--color-primary)" }}
                />
                <MessageSquare size={14} style={{ color: "var(--text-muted)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>SMS</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !formData.patientId}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Send size={14} />
            {isLoading ? "Sending..." : "Send Notification"}
          </button>
        </form>
      </div>

      {/* Help Text */}
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }}
      >
        <div className="flex items-start gap-3">
          <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#1d4ed8" }} />
          <div>
            <h3 className="text-sm font-bold mb-2" style={{ color: "#1e40af" }}>
              About Patient Notifications
            </h3>
            <ul className="text-xs space-y-1.5" style={{ color: "#1e3a8a" }}>
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
      </div>
    </PageShell>
  );
}
