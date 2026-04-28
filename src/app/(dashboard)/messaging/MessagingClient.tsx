"use client";

import * as React from "react";
import { DesignPage, I, KPI, Toolbar } from "@/components/design";

export interface MessageEntry {
  id: string;
  channel: "email" | "sms";
  to: string;
  patientName: string | null;
  subject: string | null;
  template: string | null;
  sentAt: string;
}

interface Props {
  entries: MessageEntry[];
  stats: { totalSent: number; smsSent: number; emailsSent: number; lastSentAt: string | null };
}

export default function MessagingClient({ entries, stats }: Props) {
  const [filter, setFilter] = React.useState<"all" | "sms" | "email">("all");
  const [searchInput, setSearchInput] = React.useState("");

  const TABS = [
    { id: "all", label: "All", count: entries.length },
    { id: "sms", label: "SMS", count: stats.smsSent },
    { id: "email", label: "Email", count: stats.emailsSent },
  ];

  const filtered = entries.filter((e) => {
    if (filter !== "all" && e.channel !== filter) return false;
    if (searchInput) {
      const q = searchInput.toLowerCase();
      const hay = `${e.patientName ?? ""} ${e.to} ${e.subject ?? ""} ${e.template ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <DesignPage
      sublabel="Insights"
      title="Messaging"
      subtitle={
        stats.lastSentAt
          ? `${stats.totalSent.toLocaleString()} messages sent · last on ${stats.lastSentAt}`
          : "No messages sent yet"
      }
      actions={
        <a
          href="/messaging/notifications"
          className="btn btn-primary btn-sm"
          style={{ textDecoration: "none" }}
        >
          <I.Send className="ic-sm" /> Send notification
        </a>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPI label="Total sent" value={stats.totalSent.toLocaleString()} tone="forest" />
        <KPI label="SMS" value={stats.smsSent.toLocaleString()} tone="info" />
        <KPI label="Email" value={stats.emailsSent.toLocaleString()} tone="info" />
      </div>

      <Toolbar
        tabs={TABS}
        active={filter}
        onChange={(t) => setFilter(t as typeof filter)}
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search by patient, recipient, subject, template…"
      />

      <div className="card" style={{ overflow: "hidden", marginTop: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            {entries.length === 0
              ? "No outbound messages yet. Use Send notification to fire the first one."
              : `No ${filter === "all" ? "" : filter + " "}messages matching "${searchInput}".`}
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Channel</th>
                <th>Patient</th>
                <th>To</th>
                <th>Template / subject</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className={`pill ${e.channel === "sms" ? "pill-leaf" : "pill-info"}`}>
                      {e.channel === "sms" ? "SMS" : "Email"}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{e.patientName ?? "—"}</td>
                  <td className="t-xs">{e.to}</td>
                  <td className="t-xs">
                    {e.template ?? e.subject ?? "—"}
                  </td>
                  <td className="t-xs">{e.sentAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ padding: 16, marginTop: 16, fontSize: 12.5, color: "var(--ink-3)" }}>
        <strong style={{ color: "var(--ink-2)" }}>Note:</strong> the messaging schema currently records
        outbound notifications only. Two-way thread support (Twilio inbound webhook ↔ reply UI) is a
        future build — when patients text back, the reply lands in CommunicationLog as a separate row
        and isn't yet visually linked to the outbound thread.
      </div>
    </DesignPage>
  );
}
