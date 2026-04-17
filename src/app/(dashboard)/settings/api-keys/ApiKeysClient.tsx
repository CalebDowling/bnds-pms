"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Key, Copy, Check, Trash2, ExternalLink, AlertCircle } from "lucide-react";
import { createApiKey, revokeApiKey, type ApiKeyListItem, type CreateApiKeyInput } from "./actions";
import PageShell from "@/components/layout/PageShell";
import StatsRow from "@/components/layout/StatsRow";

// ─────────────────────────────────────────────────────────────────────────────
// Scope catalog — what third parties can request access to
// ─────────────────────────────────────────────────────────────────────────────

const SCOPE_CATEGORIES: { label: string; scopes: { value: string; label: string }[] }[] = [
  {
    label: "Patients",
    scopes: [
      { value: "patients:read", label: "Read patient records" },
      { value: "patients:write", label: "Create/update patients" },
    ],
  },
  {
    label: "Prescriptions",
    scopes: [
      { value: "prescriptions:read", label: "Read prescriptions" },
      { value: "prescriptions:write", label: "Create prescriptions" },
    ],
  },
  {
    label: "Fills",
    scopes: [
      { value: "fills:read", label: "Read fills" },
      { value: "fills:write", label: "Create / update fills" },
    ],
  },
  {
    label: "Inventory",
    scopes: [
      { value: "inventory:read", label: "Read inventory" },
      { value: "inventory:write", label: "Update inventory" },
    ],
  },
  {
    label: "Claims & Billing",
    scopes: [
      { value: "claims:read", label: "Read claims" },
      { value: "billing:read", label: "Read billing" },
    ],
  },
  {
    label: "Shipping",
    scopes: [
      { value: "shipping:read", label: "Read shipments" },
      { value: "shipping:write", label: "Update shipments" },
    ],
  },
  {
    label: "Communications",
    scopes: [
      { value: "messaging:write", label: "Send SMS / email notifications" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main client component
// ─────────────────────────────────────────────────────────────────────────────

export default function ApiKeysClient({ initialKeys }: { initialKeys: ApiKeyListItem[] }) {
  const [keys, setKeys] = useState<ApiKeyListItem[]>(initialKeys);
  const [showCreate, setShowCreate] = useState(false);
  const [justCreated, setJustCreated] = useState<{ label: string; plainKey: string } | null>(null);

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);
  const liveCount = activeKeys.filter((k) => k.environment === "live").length;
  const testCount = activeKeys.filter((k) => k.environment === "test").length;
  const totalUsage = keys.reduce((sum, k) => sum + k.usageCount, 0);

  const handleCreate = async (input: CreateApiKeyInput) => {
    const result = await createApiKey(input);
    setJustCreated({ label: result.label, plainKey: result.plainKey });
    setShowCreate(false);
    // Optimistically add to list — the server action revalidates too
    setKeys((prev) => [
      {
        id: result.id,
        keyPrefix: result.keyPrefix,
        label: result.label,
        description: null,
        environment: result.environment,
        scopes: result.scopes,
        createdByName: "You",
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
        usageCount: 0,
        rateLimitPerMin: null,
      },
      ...prev,
    ]);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this API key? Integrations using it will stop working immediately.")) return;
    await revokeApiKey(id);
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k))
    );
  };

  return (
    <PageShell
      title="API Keys"
      subtitle="Manage keys for third-party integrations using the public BNDS API"
      actions={
        <>
          <Link
            href="/developers"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg no-underline transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--card-bg)" }}
          >
            <ExternalLink size={14} /> API Docs
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white transition-colors"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Plus size={14} /> New API Key
          </button>
        </>
      }
      stats={
        <StatsRow
          stats={[
            { label: "Active Keys", value: activeKeys.length, icon: <Key size={12} />, accent: activeKeys.length > 0 ? "var(--color-primary)" : undefined },
            { label: "Live", value: liveCount },
            { label: "Test", value: testCount },
            { label: "Requests (all-time)", value: totalUsage },
          ]}
        />
      }
    >
      {/* "Just created" banner with the one-time key value */}
      {justCreated && (
        <JustCreatedBanner label={justCreated.label} plainKey={justCreated.plainKey} onDismiss={() => setJustCreated(null)} />
      )}

      {/* Active keys */}
      <section>
        <h2 className="mb-3">Active Keys</h2>
        {activeKeys.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ backgroundColor: "var(--card-bg)", border: "1px dashed var(--border)" }}
          >
            <Key size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No API keys yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Create a key to let third-party services integrate with your pharmacy.
            </p>
          </div>
        ) : (
          <KeyList keys={activeKeys} onRevoke={handleRevoke} />
        )}
      </section>

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <section>
          <h2 className="mb-3" style={{ color: "var(--text-muted)" }}>Revoked</h2>
          <KeyList keys={revokedKeys} onRevoke={handleRevoke} revoked />
        </section>
      )}

      {/* Create modal */}
      {showCreate && <CreateKeyModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Just-created banner
// ─────────────────────────────────────────────────────────────────────────────

function JustCreatedBanner({
  label,
  plainKey,
  onDismiss,
}: {
  label: string;
  plainKey: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(plainKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: "#fef3c7", border: "1px solid #fcd34d" }}
    >
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: "#a16207" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: "#854d0e" }}>
            Save this API key now — you won&apos;t see it again.
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#92400e" }}>
            Key for <strong>{label}</strong>. Store it in a password manager or secrets vault.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code
              className="flex-1 px-3 py-2 text-xs font-mono rounded-md overflow-x-auto whitespace-nowrap"
              style={{ backgroundColor: "#fff", border: "1px solid #fcd34d", color: "#0f260b" }}
            >
              {plainKey}
            </code>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md text-white transition-colors"
              style={{ backgroundColor: "#a16207" }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-xs font-semibold underline flex-shrink-0"
          style={{ color: "#854d0e" }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Key list
// ─────────────────────────────────────────────────────────────────────────────

function KeyList({
  keys,
  onRevoke,
  revoked,
}: {
  keys: ApiKeyListItem[];
  onRevoke: (id: string) => void;
  revoked?: boolean;
}) {
  return (
    <div className="space-y-2">
      {keys.map((k) => (
        <div
          key={k.id}
          className="rounded-xl p-4"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border)",
            opacity: revoked ? 0.6 : 1,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {k.label}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: k.environment === "live" ? "var(--green-100)" : "#fef3c7",
                    color: k.environment === "live" ? "var(--green-700)" : "#92400e",
                  }}
                >
                  {k.environment}
                </span>
                {revoked && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#fef2f2", color: "#b91c1c" }}
                  >
                    Revoked
                  </span>
                )}
              </div>
              {k.description && (
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{k.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <code
                  className="text-xs font-mono px-2 py-1 rounded"
                  style={{ backgroundColor: "var(--green-50)", color: "var(--text-secondary)" }}
                >
                  {k.keyPrefix}...
                </code>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  created {formatDate(k.createdAt)} by {k.createdByName ?? "—"}
                </span>
              </div>
              {/* Scopes */}
              <div className="flex flex-wrap gap-1 mt-2">
                {k.scopes.length === 0 ? (
                  <span className="text-xs italic" style={{ color: "var(--text-muted)" }}>No scopes</span>
                ) : (
                  k.scopes.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: "var(--green-100)", color: "var(--green-700)" }}
                    >
                      {s}
                    </span>
                  ))
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                <span>{k.usageCount.toLocaleString()} requests</span>
                <span>Last used: {k.lastUsedAt ? formatDate(k.lastUsedAt) : "never"}</span>
                {k.rateLimitPerMin != null && <span>Limit: {k.rateLimitPerMin}/min</span>}
                {k.expiresAt && <span>Expires: {formatDate(k.expiresAt)}</span>}
              </div>
            </div>
            {!revoked && (
              <button
                onClick={() => onRevoke(k.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md flex-shrink-0 transition-colors"
                style={{ border: "1px solid #fecaca", color: "#b91c1c", backgroundColor: "#fef2f2" }}
              >
                <Trash2 size={12} />
                Revoke
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateKeyModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: CreateApiKeyInput) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("test");
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const [rateLimit, setRateLimit] = useState<number | "">("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!label.trim()) {
      setError("Label is required.");
      return;
    }
    if (selectedScopes.size === 0) {
      setError("Select at least one scope.");
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        label: label.trim(),
        description: description.trim() || undefined,
        environment,
        scopes: Array.from(selectedScopes),
        rateLimitPerMin: typeof rateLimit === "number" ? rateLimit : null,
        expiresAt: expiresAt || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="p-6 space-y-5">
          <div>
            <h2>Create API Key</h2>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Grant a third-party integration scoped access to your pharmacy data.
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm font-semibold rounded-lg" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              Label <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Zogo Telehealth Production"
              maxLength={120}
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--page-bg)", color: "var(--text-primary)" }}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about what this key is used for"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--page-bg)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Environment
              </label>
              <div className="flex gap-2">
                {(["test", "live"] as const).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setEnvironment(env)}
                    className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border capitalize"
                    style={{
                      backgroundColor: environment === env ? "var(--color-primary)" : "transparent",
                      color: environment === env ? "#fff" : "var(--text-secondary)",
                      borderColor: environment === env ? "var(--color-primary)" : "var(--border)",
                    }}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Rate Limit (req/min)
              </label>
              <input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value ? parseInt(e.target.value, 10) : "")}
                placeholder="60 (default)"
                min={1}
                max={10000}
                className="w-full px-3 py-2 text-sm rounded-lg"
                style={{ border: "1px solid var(--border)", backgroundColor: "var(--page-bg)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              Expires At
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--page-bg)", color: "var(--text-primary)" }}
            />
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
              Leave blank for no expiration.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              Scopes <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
              What can this key access? Pick the minimum needed.
            </p>
            <div className="space-y-3">
              {SCOPE_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {cat.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.scopes.map((s) => {
                      const checked = selectedScopes.has(s.value);
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => toggleScope(s.value)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors"
                          style={{
                            backgroundColor: checked ? "var(--color-primary)" : "transparent",
                            color: checked ? "#fff" : "var(--text-secondary)",
                            borderColor: checked ? "var(--color-primary)" : "var(--border)",
                          }}
                        >
                          {s.label} {checked && <Check size={10} className="inline ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--border-light)" }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold rounded-lg text-white disabled:opacity-40"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {submitting ? "Creating..." : "Create Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
