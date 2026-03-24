"use client";

import { useState } from "react";
import { Bell, Package, Clock, Pill, ShieldAlert, FlaskConical, FileText, AlertTriangle, Check } from "lucide-react";

interface NotificationPref {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  enabled: boolean;
}

const DEFAULT_PREFS: NotificationPref[] = [
  { id: "low_stock", label: "Low Stock Alerts", description: "When an item drops below its reorder point", icon: <Package size={18} />, color: "#f59e0b", enabled: true },
  { id: "expiring_lot", label: "Expiring Lots", description: "When a lot is expiring within 30 days", icon: <Clock size={18} />, color: "#ef4444", enabled: true },
  { id: "refill_due", label: "Refill Due", description: "When a patient's prescription is due for refill", icon: <Pill size={18} />, color: "#10b981", enabled: true },
  { id: "claim_rejected", label: "Claim Rejected", description: "When an insurance claim is rejected", icon: <ShieldAlert size={18} />, color: "#f43f5e", enabled: true },
  { id: "batch_expiring", label: "Batch Expiring", description: "When a compounding batch is nearing BUD", icon: <FlaskConical size={18} />, color: "#a855f7", enabled: true },
  { id: "new_erx", label: "New eRx Received", description: "When a new electronic prescription arrives", icon: <FileText size={18} />, color: "#3b82f6", enabled: true },
  { id: "erx_needs_review", label: "eRx Needs Review", description: "When an eRx requires pharmacist review", icon: <AlertTriangle size={18} />, color: "#f97316", enabled: true },
  { id: "new_portal_order", label: "Patient Portal Orders", description: "When a patient submits a refill request via the portal", icon: <Bell size={18} />, color: "#6366f1", enabled: false },
];

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  const togglePref = (id: string) => {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
    setSaved(false);
  };

  const handleSave = () => {
    // In production this would call an API to persist preferences
    localStorage.setItem("notification_prefs", JSON.stringify(
      Object.fromEntries(prefs.map((p) => [p.id, p.enabled]))
    ));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const enabledCount = prefs.filter((p) => p.enabled).length;

  return (
    <div className="px-6 py-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Notification Preferences</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Choose which alerts you receive. {enabledCount} of {prefs.length} enabled.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all press-scale"
          style={{
            background: saved
              ? "var(--color-success)"
              : "linear-gradient(135deg, #40721d, #5a9f2a)",
          }}
        >
          {saved ? <Check size={14} /> : <Bell size={14} />}
          {saved ? "Saved" : "Save Preferences"}
        </button>
      </div>

      <div className="space-y-2">
        {prefs.map((pref) => (
          <div
            key={pref.id}
            className="flex items-center gap-4 p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl transition-all hover:border-[var(--border)]"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: pref.color }}
            >
              {pref.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[var(--text-primary)]">{pref.label}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">{pref.description}</div>
            </div>
            <button
              onClick={() => togglePref(pref.id)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                pref.enabled ? "bg-[var(--color-primary)]" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={pref.enabled}
              aria-label={`Toggle ${pref.label}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  pref.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
