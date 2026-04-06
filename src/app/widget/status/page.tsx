"use client";

import { useState, FormEvent } from "react";

/**
 * Standalone Status Check Widget Page
 *
 * Embeddable via iframe. Shows Rx status with a colored badge.
 * Reads config from URL params: ?key=<apiKey>&pharmacy=<name>&color=<hex>
 */

interface StatusResult {
  status: string;
  statusColor: "green" | "blue" | "yellow" | "red" | "gray";
  estimatedReady: string | null;
  refillsRemaining: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  green: { bg: "#ecfdf5", text: "#065f46", border: "#6ee7b7" },
  blue: { bg: "#eff6ff", text: "#1e40af", border: "#93c5fd" },
  yellow: { bg: "#fffbeb", text: "#92400e", border: "#fcd34d" },
  red: { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" },
  gray: { bg: "#f9fafb", text: "#374151", border: "#d1d5db" },
};

export default function StatusWidgetPage() {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const apiKey = params.get("key") ?? "";
  const pharmacyName = params.get("pharmacy") ?? "Your Pharmacy";
  const accentColor = params.get("color") ?? "2563eb";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<StatusResult | null>(null);

  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [rxNumber, setRxNumber] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const qs = new URLSearchParams({
        rxNumber,
        lastName,
        dob,
      });

      const res = await fetch(`/api/widget/status?${qs.toString()}`, {
        headers: { "X-Widget-Key": apiKey },
      });

      const data = await res.json();

      if (data.success) {
        setResult({
          status: data.status,
          statusColor: data.statusColor,
          estimatedReady: data.estimatedReady,
          refillsRemaining: data.refillsRemaining,
        });
      } else {
        setError(data.error ?? "Unable to find prescription.");
      }
    } catch {
      setError("Unable to connect. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  const accent = `#${accentColor}`;

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: 420,
        margin: "0 auto",
        padding: "24px 16px",
        color: "#1f2937",
      }}
    >
      {/* Pharmacy branding */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: accent,
            margin: "0 auto 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          Rx
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
          {pharmacyName}
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
          Check Prescription Status
        </p>
      </div>

      {/* Status result */}
      {result && (
        <div
          style={{
            background: STATUS_COLORS[result.statusColor]?.bg ?? "#f9fafb",
            border: `1px solid ${STATUS_COLORS[result.statusColor]?.border ?? "#d1d5db"}`,
            borderRadius: 8,
            padding: 20,
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "6px 16px",
              borderRadius: 20,
              fontSize: 15,
              fontWeight: 600,
              color: STATUS_COLORS[result.statusColor]?.text ?? "#374151",
              background: STATUS_COLORS[result.statusColor]?.border ?? "#d1d5db",
            }}
          >
            {result.status}
          </div>

          {result.estimatedReady && (
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 12 }}>
              Estimated ready:{" "}
              {new Date(result.estimatedReady).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}

          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
            Refills remaining: {result.refillsRemaining}
          </p>

          <button
            onClick={() => setResult(null)}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              fontSize: 13,
              background: "transparent",
              border: `1px solid ${accent}`,
              color: accent,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Check Another
          </button>
        </div>
      )}

      {/* Form */}
      {!result && (
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 16,
                fontSize: 14,
                color: "#991b1b",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
                color: "#374151",
              }}
            >
              Last Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 15,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
                color: "#374151",
              }}
            >
              Date of Birth <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 15,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
                color: "#374151",
              }}
            >
              RX Number <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={rxNumber}
              onChange={(e) => setRxNumber(e.target.value)}
              placeholder="RX-12345"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 15,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: 15,
              fontWeight: 600,
              color: "#fff",
              background: loading ? "#9ca3af" : accent,
              border: "none",
              borderRadius: 8,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 150ms",
            }}
          >
            {loading ? "Checking..." : "Check Status"}
          </button>
        </form>
      )}
    </div>
  );
}
