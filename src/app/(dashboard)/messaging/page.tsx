"use client";

import * as React from "react";
import { Avatar, DesignPage, I, StatusPill } from "@/components/design";

// ── Mock messaging inbox (mirrors design-reference/screens/insights.jsx Messaging) ──
type ThreadType = "patient" | "prescriber" | "staff" | "payer";

interface Thread {
  id: string;
  name: string;
  last: string;
  time: string;
  unread: number;
  type: ThreadType;
}

interface Message {
  from: "me" | "them";
  name: string;
  text: string;
  time: string;
}

const THREADS: Thread[] = [
  { id: "thread-1", name: "Dr. Landry · Lafayette Family Med", last: "PA approved for Hebert", time: "11:42", unread: 0, type: "prescriber" },
  { id: "thread-2", name: "James Hebert", last: "Pickup ready — see you tomorrow?", time: "11:08", unread: 2, type: "patient" },
  { id: "thread-3", name: "Yvette Robichaux", last: "Driver ETA 3:40 PM", time: "10:50", unread: 1, type: "patient" },
  { id: "thread-4", name: "Dr. Hebert · Lafayette Cardiology", last: "Fax received — verifying", time: "10:22", unread: 0, type: "prescriber" },
  { id: "thread-5", name: "#staff-main-st", last: "Sara: out at 3, covering David", time: "09:48", unread: 0, type: "staff" },
  { id: "thread-6", name: "BCBS Louisiana · payer", last: "Auth response received", time: "09:14", unread: 0, type: "payer" },
  { id: "thread-7", name: "Marie Comeaux", last: "Thank you!", time: "Yesterday", unread: 0, type: "patient" },
  { id: "thread-8", name: "Beau Thibodeaux", last: "Sent identification photo", time: "Yesterday", unread: 0, type: "patient" },
];

const MESSAGES: Message[] = [
  { from: "them", name: "James Hebert", text: "Hey Marie — got the text that my Atorvastatin is ready for pickup. Are y'all open until 7 today?", time: "10:48 AM" },
  { from: "me", name: "You", text: "Hi James! Yes, we close at 7 PM. Your script is in bin A-01 with a $14.20 copay.", time: "10:52 AM" },
  { from: "them", name: "James Hebert", text: "Perfect. I can come by after work, around 5:30. Any chance Dr. Landry sent over my Lisinopril refill too?", time: "11:02 AM" },
  { from: "me", name: "You", text: "Just checked — yes, Lisinopril 10mg #90 is also ready. No copay on that one (Medicare D). Want me to add a counseling slot for the new statin?", time: "11:06 AM" },
  { from: "them", name: "James Hebert", text: "Pickup ready — see you tomorrow?", time: "11:08 AM" },
];

const TYPE_COLOR: Record<ThreadType, string> = {
  patient: "var(--bnds-leaf)",
  prescriber: "var(--info)",
  staff: "var(--warn)",
  payer: "var(--ink-3)",
};

const TYPE_LABEL: Record<ThreadType, string> = {
  patient: "Patient",
  prescriber: "Prescriber",
  staff: "Staff",
  payer: "Payer",
};

export default function MessagingPage() {
  const [active, setActive] = React.useState("thread-2");
  const sel = THREADS.find((t) => t.id === active) || THREADS[0];

  return (
    <DesignPage
      sublabel="Insights"
      title="Messaging"
      subtitle="Patients · prescribers · staff · payers — one inbox"
      dense
      actions={
        <a href="/messaging/notifications" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
          <I.Send className="ic-sm" /> Notifications
        </a>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr 320px",
          height: "100%",
          minHeight: 0,
          background: "var(--paper)",
        }}
      >
        {/* Thread list */}
        <div
          style={{
            borderRight: "1px solid var(--line)",
            background: "var(--surface)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <h2 className="bnds-serif" style={{ fontSize: 20, fontWeight: 500, margin: 0, flex: 1 }}>
              Inbox
            </h2>
            <button className="btn btn-ghost btn-sm">
              <I.Filter className="ic-sm" />
            </button>
            <button className="btn btn-primary btn-sm">
              <I.Plus />
            </button>
          </div>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--line)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 10px",
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 6,
              }}
            >
              <I.Search className="ic-sm" style={{ color: "var(--ink-3)" }} />
              <input
                placeholder="Search messages…"
                style={{
                  border: 0,
                  outline: 0,
                  background: "transparent",
                  flex: 1,
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {THREADS.map((t) => (
              <div
                key={t.id}
                onClick={() => setActive(t.id)}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--line)",
                  background: active === t.id ? "var(--bnds-leaf-100)" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  gap: 11,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ position: "relative" }}>
                  <Avatar name={t.name} size={36} />
                  <span
                    style={{
                      position: "absolute",
                      bottom: -1,
                      right: -1,
                      width: 11,
                      height: 11,
                      borderRadius: 999,
                      background: TYPE_COLOR[t.type],
                      border: "2px solid var(--surface)",
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13.5,
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.name}
                    </div>
                    <div className="t-xs">{t.time}</div>
                  </div>
                  <div
                    className="t-xs"
                    style={{
                      marginTop: 2,
                      color: t.unread ? "var(--ink)" : "var(--ink-3)",
                      fontWeight: t.unread ? 500 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.last}
                  </div>
                </div>
                {t.unread > 0 && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: "0 6px",
                      borderRadius: 999,
                      background: "var(--bnds-leaf)",
                      color: "white",
                      fontSize: 11,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {t.unread}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--line)",
              background: "var(--surface)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Avatar name={sel.name} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{sel.name}</div>
              <div className="t-xs" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: TYPE_COLOR[sel.type] }} />{" "}
                {TYPE_LABEL[sel.type]} · SMS via Twilio
              </div>
            </div>
            <button className="btn btn-ghost btn-sm">
              <I.Phone className="ic-sm" />
            </button>
            <button className="btn btn-ghost btn-sm">
              <I.Eye className="ic-sm" /> Profile
            </button>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "var(--paper)",
            }}
          >
            <div className="t-xs" style={{ textAlign: "center", color: "var(--ink-4)" }}>
              — Today —
            </div>
            {MESSAGES.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "70%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    alignItems: m.from === "me" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: m.from === "me" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: m.from === "me" ? "var(--bnds-forest)" : "var(--surface)",
                      color: m.from === "me" ? "white" : "var(--ink)",
                      border: m.from === "me" ? "none" : "1px solid var(--line)",
                      fontSize: 14,
                      lineHeight: 1.45,
                    }}
                  >
                    {m.text}
                  </div>
                  <div className="t-xs" style={{ fontSize: 11 }}>
                    {m.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: 14, borderTop: "1px solid var(--line)", background: "var(--surface)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 10,
                padding: "10px 14px",
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 10,
              }}
            >
              <button className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                <I.Paperclip className="ic-sm" />
              </button>
              <textarea
                placeholder="Type a message…"
                rows={1}
                style={{
                  flex: 1,
                  border: 0,
                  outline: 0,
                  background: "transparent",
                  resize: "none",
                  fontSize: 14,
                  fontFamily: "inherit",
                  color: "var(--ink)",
                  padding: "4px 0",
                }}
              />
              <button className="btn btn-primary btn-sm">
                <I.Send className="ic-sm" /> Send
              </button>
            </div>
            <div className="t-xs" style={{ marginTop: 8, display: "flex", gap: 14 }}>
              <span>⌘+Enter to send</span>
              <span>Templates: Pickup ready · Refill due · Counseling</span>
            </div>
          </div>
        </div>

        {/* Patient context */}
        <div
          style={{
            borderLeft: "1px solid var(--line)",
            background: "var(--surface)",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              paddingBottom: 14,
              borderBottom: "1px solid var(--line)",
            }}
          >
            <Avatar name={sel.name} size={56} />
            <div style={{ fontWeight: 600, fontSize: 16 }}>{sel.name}</div>
            <div className="t-xs">P-1042 · DOB 03/14/1958</div>
          </div>
          <div>
            <div className="t-eyebrow">Pickup ready</div>
            <div
              className="card"
              style={{
                padding: 12,
                marginTop: 6,
                background: "var(--bnds-leaf-100)",
                borderColor: "rgba(90,168,69,0.3)",
              }}
            >
              <div style={{ fontWeight: 500, fontSize: 13 }}>2 items · bin A-01</div>
              <div className="t-xs" style={{ marginTop: 2 }}>
                Atorvastatin 20mg · Lisinopril 10mg
              </div>
              <div className="t-num" style={{ fontWeight: 500, marginTop: 6 }}>
                $14.20 due
              </div>
            </div>
          </div>
          <div>
            <div className="t-eyebrow">Active prescriptions</div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {["Atorvastatin 20mg", "Lisinopril 10mg", "Metformin 500mg"].map((d) => (
                <div
                  key={d}
                  className="t-small"
                  style={{ padding: "6px 10px", background: "var(--paper-2)", borderRadius: 6, fontSize: 13 }}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="t-eyebrow">Allergies</div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <StatusPill tone="danger" label="Sulfa" />
              <StatusPill tone="danger" label="PCN" />
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ justifyContent: "center" }}>
            Open full profile <I.ChevR className="ic-sm" />
          </button>
        </div>
      </div>
    </DesignPage>
  );
}
