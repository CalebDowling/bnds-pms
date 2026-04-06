"use client";

import { useState, useEffect, useCallback } from "react";
import type { FSACategory } from "@/lib/pos/fsa-hsa-compliance";

/**
 * FSA/HSA Configuration Settings Page
 *
 * - Eligible categories list (editable)
 * - Item override table
 * - MCC code configuration
 * - IIAS auto-substantiation toggle
 * - Transaction report summary
 */

interface EligibilityConfig {
  categories: FSACategory[];
  itemOverrides: Record<string, boolean>;
  mccCode: string;
  iiasEnabled: boolean;
}

interface TransactionReport {
  totalTransactions: number;
  qualifiedAmount: number;
  nonQualifiedAmount: number;
  byPaymentMethod: Record<string, number>;
}

export default function FSAHSASettingsPage() {
  const [config, setConfig] = useState<EligibilityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [report, setReport] = useState<TransactionReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Item override form
  const [newOverrideId, setNewOverrideId] = useState("");
  const [newOverrideEligible, setNewOverrideEligible] = useState(true);

  // New category form
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCat, setNewCat] = useState<Partial<FSACategory>>({
    name: "",
    description: "",
    alwaysEligible: false,
    requiresRx: false,
    caresActEligible: true,
  });

  const loadConfig = useCallback(async () => {
    try {
      const {
        getEligibilityConfig,
      } = await import("./actions");
      const data = await getEligibilityConfig();
      setConfig(data);
    } catch (err) {
      console.error("Failed to load FSA/HSA config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function handleSaveCategories() {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const { updateCategories } = await import("./actions");
      await updateCategories(config.categories);
      setMessage({ type: "success", text: "Categories saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save categories." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveIIAS() {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const { updateIIASConfig } = await import("./actions");
      await updateIIASConfig(config.mccCode, config.iiasEnabled);
      setMessage({ type: "success", text: "IIAS settings saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save IIAS settings." });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddOverride() {
    if (!newOverrideId.trim()) return;
    try {
      const { overrideItem } = await import("./actions");
      await overrideItem(newOverrideId.trim(), newOverrideEligible);
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              itemOverrides: { ...prev.itemOverrides, [newOverrideId.trim()]: newOverrideEligible },
            }
          : prev
      );
      setNewOverrideId("");
      setMessage({ type: "success", text: "Item override added." });
    } catch {
      setMessage({ type: "error", text: "Failed to add override." });
    }
  }

  async function handleRemoveOverride(itemId: string) {
    try {
      const { removeItemOverride } = await import("./actions");
      await removeItemOverride(itemId);
      setConfig((prev) => {
        if (!prev) return prev;
        const updated = { ...prev.itemOverrides };
        delete updated[itemId];
        return { ...prev, itemOverrides: updated };
      });
    } catch {
      setMessage({ type: "error", text: "Failed to remove override." });
    }
  }

  function handleRemoveCategory(id: string) {
    if (!config) return;
    setConfig({
      ...config,
      categories: config.categories.filter((c) => c.id !== id),
    });
  }

  function handleAddCategory() {
    if (!config || !newCat.name) return;
    const id = newCat.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");
    const category: FSACategory = {
      id,
      name: newCat.name!,
      description: newCat.description ?? "",
      alwaysEligible: newCat.alwaysEligible ?? false,
      requiresRx: newCat.requiresRx ?? false,
      caresActEligible: newCat.caresActEligible ?? true,
    };
    setConfig({ ...config, categories: [...config.categories, category] });
    setNewCat({ name: "", description: "", alwaysEligible: false, requiresRx: false, caresActEligible: true });
    setShowAddCategory(false);
  }

  async function loadReport() {
    setReportLoading(true);
    try {
      const { getTransactionReport } = await import("./actions");
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const data = await getTransactionReport({
        start: thirtyDaysAgo.toISOString(),
        end: now.toISOString(),
      });
      setReport(data);
    } catch {
      setMessage({ type: "error", text: "Failed to load report." });
    } finally {
      setReportLoading(false);
    }
  }

  // Styles
  const sectionStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
  };
  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    outline: "none",
    boxSizing: "border-box",
  };
  const btnPrimary: React.CSSProperties = {
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
    background: "#40721D",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  };
  const btnSecondary: React.CSSProperties = {
    padding: "6px 14px",
    fontSize: 13,
    background: "#f3f4f6",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer",
  };

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>FSA/HSA Compliance</h1>
        <p style={{ color: "#6b7280" }}>Loading configuration...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>FSA/HSA Compliance</h1>
        <p style={{ color: "#991b1b" }}>Failed to load configuration.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
        FSA/HSA Compliance
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
        Configure IIAS auto-substantiation and FSA/HSA eligible item categories.
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

      {/* ── IIAS Settings ──────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          IIAS Settings
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config.iiasEnabled}
              onChange={(e) => setConfig({ ...config, iiasEnabled: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: "#40721D" }}
            />
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              Enable IIAS Auto-Substantiation
            </span>
          </label>
        </div>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          When enabled, POS transactions using FSA/HSA cards will automatically
          split qualified and non-qualified items per IIAS rules.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
            MCC Code (Merchant Category Code)
          </label>
          <input
            type="text"
            value={config.mccCode}
            onChange={(e) => setConfig({ ...config, mccCode: e.target.value })}
            maxLength={4}
            style={{ ...inputStyle, width: 120 }}
          />
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            Default: 5912 (Drug Stores and Pharmacies). Required for FSA/HSA card
            acceptance.
          </p>
        </div>

        <button onClick={handleSaveIIAS} disabled={saving} style={btnPrimary}>
          {saving ? "Saving..." : "Save IIAS Settings"}
        </button>
      </div>

      {/* ── Eligible Categories ────────────────────────────────── */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            Eligible Categories
          </h2>
          <button onClick={() => setShowAddCategory(!showAddCategory)} style={btnSecondary}>
            {showAddCategory ? "Cancel" : "+ Add Category"}
          </button>
        </div>

        {showAddCategory && (
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 2 }}>
                  Name
                </label>
                <input
                  type="text"
                  value={newCat.name ?? ""}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  style={{ ...inputStyle, width: "100%" }}
                  placeholder="Category name"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 2 }}>
                  Description
                </label>
                <input
                  type="text"
                  value={newCat.description ?? ""}
                  onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                  style={{ ...inputStyle, width: "100%" }}
                  placeholder="Brief description"
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={newCat.alwaysEligible ?? false}
                  onChange={(e) => setNewCat({ ...newCat, alwaysEligible: e.target.checked })}
                />
                Always Eligible
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={newCat.requiresRx ?? false}
                  onChange={(e) => setNewCat({ ...newCat, requiresRx: e.target.checked })}
                />
                Requires Rx
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={newCat.caresActEligible ?? true}
                  onChange={(e) => setNewCat({ ...newCat, caresActEligible: e.target.checked })}
                />
                CARES Act Eligible
              </label>
            </div>
            <button onClick={handleAddCategory} style={btnPrimary}>
              Add Category
            </button>
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "8px 4px", fontWeight: 500, color: "#6b7280" }}>
                Category
              </th>
              <th style={{ textAlign: "left", padding: "8px 4px", fontWeight: 500, color: "#6b7280" }}>
                Description
              </th>
              <th style={{ textAlign: "center", padding: "8px 4px", fontWeight: 500, color: "#6b7280" }}>
                Always
              </th>
              <th style={{ textAlign: "center", padding: "8px 4px", fontWeight: 500, color: "#6b7280" }}>
                CARES Act
              </th>
              <th style={{ textAlign: "center", padding: "8px 4px", fontWeight: 500, color: "#6b7280" }}>
                Rx Req.
              </th>
              <th style={{ padding: "8px 4px" }} />
            </tr>
          </thead>
          <tbody>
            {config.categories.map((cat) => (
              <tr key={cat.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 4px", fontWeight: 500 }}>{cat.name}</td>
                <td style={{ padding: "8px 4px", color: "#6b7280" }}>{cat.description}</td>
                <td style={{ padding: "8px 4px", textAlign: "center" }}>
                  {cat.alwaysEligible ? "Yes" : "-"}
                </td>
                <td style={{ padding: "8px 4px", textAlign: "center" }}>
                  {cat.caresActEligible ? "Yes" : "-"}
                </td>
                <td style={{ padding: "8px 4px", textAlign: "center" }}>
                  {cat.requiresRx ? "Yes" : "-"}
                </td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>
                  <button
                    onClick={() => handleRemoveCategory(cat.id)}
                    style={{
                      padding: "4px 10px",
                      fontSize: 12,
                      color: "#991b1b",
                      background: "#fef2f2",
                      border: "1px solid #fca5a5",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          <button onClick={handleSaveCategories} disabled={saving} style={btnPrimary}>
            {saving ? "Saving..." : "Save Categories"}
          </button>
        </div>
      </div>

      {/* ── Item Overrides ─────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Item Overrides
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          Manually mark specific items (by barcode or item ID) as eligible or
          ineligible, overriding category-level rules.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 2 }}>
              Item ID / Barcode
            </label>
            <input
              type="text"
              value={newOverrideId}
              onChange={(e) => setNewOverrideId(e.target.value)}
              placeholder="Barcode or item ID"
              style={{ ...inputStyle, width: 200 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 2 }}>
              Eligibility
            </label>
            <select
              value={newOverrideEligible ? "eligible" : "ineligible"}
              onChange={(e) => setNewOverrideEligible(e.target.value === "eligible")}
              style={{ ...inputStyle, width: 140 }}
            >
              <option value="eligible">Eligible</option>
              <option value="ineligible">Ineligible</option>
            </select>
          </div>
          <button onClick={handleAddOverride} style={btnPrimary}>
            Add Override
          </button>
        </div>

        {Object.keys(config.itemOverrides).length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "8px 4px", fontWeight: 500, color: "#6b7280" }}>
                  Item ID / Barcode
                </th>
                <th style={{ textAlign: "left", padding: "8px 4px", fontWeight: 500, color: "#6b7280" }}>
                  Eligibility
                </th>
                <th style={{ padding: "8px 4px" }} />
              </tr>
            </thead>
            <tbody>
              {Object.entries(config.itemOverrides).map(([id, eligible]) => (
                <tr key={id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{id}</td>
                  <td style={{ padding: "8px 4px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 10px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500,
                        background: eligible ? "#ecfdf5" : "#fef2f2",
                        color: eligible ? "#065f46" : "#991b1b",
                      }}
                    >
                      {eligible ? "Eligible" : "Ineligible"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 4px", textAlign: "right" }}>
                    <button
                      onClick={() => handleRemoveOverride(id)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        color: "#991b1b",
                        background: "#fef2f2",
                        border: "1px solid #fca5a5",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>
            No item overrides configured.
          </p>
        )}
      </div>

      {/* ── Transaction Report ─────────────────────────────────── */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            Transaction Report (Last 30 Days)
          </h2>
          <button onClick={loadReport} disabled={reportLoading} style={btnSecondary}>
            {reportLoading ? "Loading..." : "Load Report"}
          </button>
        </div>

        {report ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div
              style={{
                background: "#f9fafb",
                borderRadius: 6,
                padding: 16,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: "#374151" }}>
                {report.totalTransactions}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                Total Transactions
              </div>
            </div>
            <div
              style={{
                background: "#ecfdf5",
                borderRadius: 6,
                padding: 16,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: "#065f46" }}>
                ${report.qualifiedAmount.toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: "#065f46", marginTop: 4 }}>
                FSA/HSA Qualified
              </div>
            </div>
            <div
              style={{
                background: "#fef2f2",
                borderRadius: 6,
                padding: 16,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: "#991b1b" }}>
                ${report.nonQualifiedAmount.toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: "#991b1b", marginTop: 4 }}>
                Non-Qualified
              </div>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>
            Click &quot;Load Report&quot; to view FSA/HSA transaction data.
          </p>
        )}
      </div>
    </div>
  );
}
