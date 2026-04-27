/**
 * Messaging Notifications
 * Staff view for sending one-off automated notifications (email + SMS).
 * Lives at /messaging/notifications — the main /messaging route is now the chat inbox.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Send, Mail, MessageSquare, Clock, Info } from "lucide-react";
import { getMessagingStats, sendManualNotification } from "../actions";
import { DesignPage, KPI } from "@/components/design";
import { formatDateTime } from "@/lib/utils/formatters";

interface MessageStats {
  totalSent: number;
  emailsSent: number;
  smsSent: number;
  lastSentAt: string | null;
  byTemplate: Record<string, number>;
}

export default function MessagingNotificationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [formData, setFormData] = useState({
    patientId: "",
    template: "readyForPickup" as const,
    channels: ["email", "sms"] as Array<"email" | "sms">,
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        formData.channels as ("email" | "sms")[]
      );

      if (result.success) {
        setMessage({ type: "success", text: "Notification sent successfully!" });
        setFormData({ patientId: "", template: "readyForPickup", channels: ["email", "sms"] });
        const statsData = await getMessagingStats();
        setStats(statsData);
      } else {
        setMessage({ type: "error", text: result.error || "Failed to send notification" });
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
    <DesignPage
      sublabel="Insights · Messaging"
      title="Patient notifications"
      subtitle="Send one-off email + SMS notifications using saved templates."
      actions={
        <a href="/messaging" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
          Back to inbox
        </a>
      }
    >
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <KPI label="Total sent" value={stats.totalSent.toString()} tone="forest" />
          <KPI label="Emails" value={stats.emailsSent.toString()} tone="info" />
          <KPI label="SMS" value={stats.smsSent.toString()} tone="ok" />
          <KPI label="Last sent" value={stats.lastSentAt ? formatDateTime(stats.lastSentAt) : "Never"} />
        </div>
      )}

      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div className="t-eyebrow">Send notification</div>
        <h3 className="bnds-serif" style={{ fontSize: 20, fontWeight: 500, marginTop: 4, marginBottom: 18 }}>
          Quick send
        </h3>

        {message && (
          <div
            style={{
              marginBottom: 18,
              padding: 12,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              background: message.type === "success" ? "var(--bnds-leaf-100)" : "rgba(184,58,47,0.08)",
              border: `1px solid ${message.type === "success" ? "rgba(31,90,58,0.3)" : "rgba(184,58,47,0.3)"}`,
              color: message.type === "success" ? "var(--bnds-forest-700)" : "var(--danger)",
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSendNotification} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="t-eyebrow" style={{ display: "block", marginBottom: 6 }}>
                Patient ID
              </label>
              <input
                type="text"
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                placeholder="Enter patient ID or MRN"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: 0,
                }}
              />
            </div>

            <div>
              <label className="t-eyebrow" style={{ display: "block", marginBottom: 6 }}>
                Template
              </label>
              <select
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value as typeof formData.template })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: 0,
                }}
              >
                <option value="readyForPickup">Ready for pickup</option>
                <option value="refillDue">Refill due</option>
                <option value="refillProcessed">Refill processed</option>
                <option value="shippingUpdate">Shipping update</option>
                <option value="prescriptionExpiring">Prescription expiring</option>
              </select>
            </div>
          </div>

          <div>
            <label className="t-eyebrow" style={{ display: "block", marginBottom: 8 }}>
              Send via
            </label>
            <div style={{ display: "flex", gap: 24 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={formData.channels.includes("email")}
                  onChange={() => handleChannelToggle("email")}
                  style={{ accentColor: "var(--bnds-forest)" }}
                />
                <Mail size={14} /> Email
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={formData.channels.includes("sms")}
                  onChange={() => handleChannelToggle("sms")}
                  style={{ accentColor: "var(--bnds-forest)" }}
                />
                <MessageSquare size={14} /> SMS
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !formData.patientId}
            className="btn btn-primary"
            style={{ alignSelf: "flex-start" }}
          >
            <Send size={14} />
            {isLoading ? "Sending…" : "Send notification"}
          </button>
        </form>
      </div>

      <div
        className="card"
        style={{
          padding: 18,
          background: "rgba(56,109,140,0.06)",
          borderColor: "rgba(56,109,140,0.20)",
          display: "flex",
          gap: 12,
        }}
      >
        <Info size={16} style={{ color: "var(--info)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="t-eyebrow" style={{ color: "var(--info)" }}>
            About notifications
          </div>
          <ul style={{ marginTop: 6, paddingLeft: 16, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
            <li>
              <strong>Email</strong>: Sent to the patient's email if one is on file.
            </li>
            <li>
              <strong>SMS</strong>: Sent to the patient's phone if they have opted in.
            </li>
            <li>All notifications are logged in the Communication Log for compliance.</li>
            <li>Templates are pre-formatted with pharmacy branding.</li>
          </ul>
        </div>
      </div>
    </DesignPage>
  );
}
