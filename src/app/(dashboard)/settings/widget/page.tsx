"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Widget Configuration Settings Page
 *
 * - Generate & manage API key for widget authentication
 * - Customize pharmacy branding (name, phone, colors)
 * - Preview the refill & status widgets
 * - Copy-to-clipboard embed code (iframe snippet)
 */

interface WidgetConfig {
  apiKey: string;
  pharmacyName: string;
  pharmacyPhone: string;
  accentColor: string;
}

const DEFAULT_CONFIG: WidgetConfig = {
  apiKey: "",
  pharmacyName: "Boudreaux's Compounding Pharmacy",
  pharmacyPhone: "",
  accentColor: "40721D",
};

export default function WidgetSettingsPage() {
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<"refill" | "status" | null>(null);
  const [previewTab, setPreviewTab] = useState<"refill" | "status">("refill");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/widget/config");
      if (res.ok) {
        const data = await res.json();
        setConfig((prev) => ({ ...prev, ...data }));
      }
    } catch {
      // Use defaults if config endpoint doesn't exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function saveConfig() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/widget/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Widget settings saved." });
      } else {
        setMessage({ type: "error", text: "Failed to save settings." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  function generateApiKey() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const prefix = "wk_";
    let key = prefix;
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setConfig((prev) => ({ ...prev, apiKey: key }));
  }

  function buildEmbedUrl(widget: "refill" | "status"): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://your-pharmacy.com";
    const params = new URLSearchParams({
      key: config.apiKey,
      pharmacy: config.pharmacyName,
      ...(config.pharmacyPhone ? { phone: config.pharmacyPhone } : {}),
      color: config.accentColor,
    });
    return `${origin}/widget/${widget}?${params.toString()}`;
  }

  function buildIframeSnippet(widget: "refill" | "status"): string {
    const url = buildEmbedUrl(widget);
    const height = widget === "refill" ? 520 : 440;
    return `<iframe\n  src="${url}"\n  width="100%"\n  height="${height}"\n  frameborder="0"\n  style="border: 1px solid #e5e7eb; border-radius: 8px; max-width: 450px;"\n  title="${widget === "refill" ? "Prescription Refill" : "Prescription Status Check"}"\n></iframe>`;
  }

  function copyToClipboard(widget: "refill" | "status") {
    navigator.clipboard.writeText(buildIframeSnippet(widget));
    setCopied(widget);
    setTimeout(() => setCopied(null), 2000);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 4,
    color: "#374151",
  };

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
          Web Refill Widget
        </h1>
        <p style={{ color: "#6b7280" }}>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
        Web Refill Widget
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
        Embed a refill request and status check widget on your pharmacy website.
      </p>

      {message && (
        <div
          style={{
            padding: "10px 16px",
            marginBottom: 16,
            borderRadius: 6,
            fontSize: 14,
            background: message.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: message.type === "success" ? "#065f46" : "#991b1b",
            border: `1px solid ${message.type === "success" ? "#6ee7b7" : "#fca5a5"}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* ── Configuration ──────────────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Configuration
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Pharmacy Name</label>
            <input
              type="text"
              value={config.pharmacyName}
              onChange={(e) => setConfig((p) => ({ ...p, pharmacyName: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Pharmacy Phone</label>
            <input
              type="tel"
              value={config.pharmacyPhone}
              onChange={(e) => setConfig((p) => ({ ...p, pharmacyPhone: e.target.value }))}
              placeholder="(555) 123-4567"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Accent Color (hex without #)</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                value={config.accentColor}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    accentColor: e.target.value.replace("#", ""),
                  }))
                }
                placeholder="2563eb"
                maxLength={6}
                style={{ ...inputStyle, flex: 1 }}
              />
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: `#${config.accentColor}`,
                  border: "1px solid #d1d5db",
                  flexShrink: 0,
                }}
              />
            </div>
          </div>
        </div>

        {/* API Key */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Widget API Key</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              readOnly
              value={config.apiKey}
              placeholder="No API key generated"
              style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 13 }}
            />
            <button
              onClick={generateApiKey}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {config.apiKey ? "Regenerate" : "Generate Key"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            This key authenticates widget requests. Keep it confidential but note
            it will be visible in your website&apos;s HTML source.
          </p>
        </div>

        <button
          onClick={saveConfig}
          disabled={saving}
          style={{
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            background: saving ? "#9ca3af" : "#40721D",
            border: "none",
            borderRadius: 6,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* ── Embed Codes ────────────────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Embed Code
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {(["refill", "status"] as const).map((widget) => (
            <div key={widget}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 8,
                  textTransform: "capitalize",
                }}
              >
                {widget === "refill" ? "Refill Request Widget" : "Status Check Widget"}
              </h3>
              <pre
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  padding: 12,
                  fontSize: 12,
                  fontFamily: "monospace",
                  overflow: "auto",
                  maxHeight: 140,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {buildIframeSnippet(widget)}
              </pre>
              <button
                onClick={() => copyToClipboard(widget)}
                style={{
                  marginTop: 8,
                  padding: "6px 14px",
                  fontSize: 13,
                  background: copied === widget ? "#ecfdf5" : "#f3f4f6",
                  color: copied === widget ? "#065f46" : "#374151",
                  border: `1px solid ${copied === widget ? "#6ee7b7" : "#d1d5db"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {copied === widget ? "Copied!" : "Copy to Clipboard"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Preview ────────────────────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Preview
        </h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["refill", "status"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setPreviewTab(tab)}
              style={{
                padding: "6px 16px",
                fontSize: 13,
                fontWeight: previewTab === tab ? 600 : 400,
                background: previewTab === tab ? `#${config.accentColor}` : "#f3f4f6",
                color: previewTab === tab ? "#fff" : "#374151",
                border: "1px solid",
                borderColor: previewTab === tab ? `#${config.accentColor}` : "#d1d5db",
                borderRadius: 6,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {tab === "refill" ? "Refill Widget" : "Status Widget"}
            </button>
          ))}
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
            maxWidth: 450,
            background: "#fff",
          }}
        >
          {config.apiKey ? (
            <iframe
              src={buildEmbedUrl(previewTab)}
              width="100%"
              height={previewTab === "refill" ? 520 : 440}
              style={{ border: "none", display: "block" }}
              title={`${previewTab} widget preview`}
            />
          ) : (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 14,
              }}
            >
              Generate an API key above to see the widget preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
