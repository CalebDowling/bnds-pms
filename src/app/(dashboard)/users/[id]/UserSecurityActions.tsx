"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  KeyRound,
  UserX,
  Trash2,
  AlertTriangle,
  Copy,
  Check,
  X,
} from "lucide-react";
import {
  sendPasswordReset,
  adminSetPassword,
  toggleUserActive,
  deleteUser,
} from "../actions";
import { getErrorMessage } from "@/lib/errors";

interface Props {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
  /** The currently logged-in admin — used to gray out dangerous actions on self. */
  currentUserId: string;
}

export default function UserSecurityActions({ user, currentUserId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "reset" | "setPw" | "toggle" | "delete">(null);
  const [banner, setBanner] = useState<{
    kind: "success" | "error" | "warning";
    title: string;
    detail?: string;
    copyable?: string;
  } | null>(null);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isSelf = currentUserId === user.id;

  async function handleSendReset() {
    if (!confirm(`Send a password reset email to ${user.email}?`)) return;
    setBusy("reset");
    setBanner(null);
    try {
      const result = await sendPasswordReset(user.id);
      if (result.emailDelivered) {
        setBanner({
          kind: "success",
          title: "Reset email sent",
          detail: `${user.email} will receive instructions to set a new password.`,
        });
      } else if (result.setPasswordLink) {
        setBanner({
          kind: "warning",
          title: "Couldn't send email — share this link manually",
          detail:
            "SMTP isn't configured on the server, so the email didn't go out. Copy the link below and share it via text/Slack/call. The link expires in 24 hours.",
          copyable: result.setPasswordLink,
        });
      } else {
        setBanner({
          kind: "error",
          title: "Failed to generate reset link",
          detail: "Check the server logs and try again.",
        });
      }
    } catch (e) {
      setBanner({ kind: "error", title: "Password reset failed", detail: getErrorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleActive() {
    if (isSelf) return;
    const action = user.isActive ? "Deactivate" : "Reactivate";
    if (!confirm(`${action} ${user.firstName} ${user.lastName}?`)) return;
    setBusy("toggle");
    setBanner(null);
    try {
      await toggleUserActive(user.id);
      setBanner({
        kind: "success",
        title: `User ${user.isActive ? "deactivated" : "reactivated"}`,
        detail: user.isActive
          ? "They can no longer log in. You can reactivate them anytime."
          : "They can log in again with their existing password.",
      });
      router.refresh();
    } catch (e) {
      setBanner({ kind: "error", title: "Toggle failed", detail: getErrorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(typedEmail: string) {
    if (typedEmail !== user.email) {
      setBanner({
        kind: "error",
        title: "Confirmation email didn't match",
        detail: "Type the user's exact email to confirm deletion.",
      });
      return;
    }
    setBusy("delete");
    setBanner(null);
    try {
      await deleteUser(user.id);
      // Success — bounce back to /users, server action already revalidated the list
      router.push("/users");
    } catch (e) {
      setBanner({ kind: "error", title: "Delete failed", detail: getErrorMessage(e) });
    } finally {
      setBusy(null);
      setShowDeleteModal(false);
    }
  }

  return (
    <div className="space-y-6 mt-6">
      {banner && <Banner banner={banner} onClose={() => setBanner(null)} />}

      {/* ── Password management ──────────────────────── */}
      <section
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        <header
          className="px-5 py-3"
          style={{ borderBottom: "1px solid var(--border-light)" }}
        >
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Password Management
          </h2>
        </header>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActionCard
            icon={<Mail size={18} />}
            title="Send reset email"
            description="Email a password reset link to the user. They click it to set a new password themselves."
            buttonLabel={busy === "reset" ? "Sending…" : "Send reset email"}
            onClick={handleSendReset}
            disabled={busy !== null}
          />
          <ActionCard
            icon={<KeyRound size={18} />}
            title="Set a password manually"
            description="You type a new password and save it directly. Give it to the user verbally; they can change it later."
            buttonLabel="Set password…"
            onClick={() => setShowSetPasswordModal(true)}
            disabled={busy !== null}
          />
        </div>
      </section>

      {/* ── Account status ───────────────────────────── */}
      <section
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        <header
          className="px-5 py-3"
          style={{ borderBottom: "1px solid var(--border-light)" }}
        >
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Account Status
          </h2>
        </header>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActionCard
            icon={<UserX size={18} />}
            title={user.isActive ? "Deactivate user" : "Reactivate user"}
            description={
              user.isActive
                ? "Disables sign-in but preserves all their records, audit history, and role assignments. Reversible."
                : "Re-enables sign-in. They can log in again with their existing password."
            }
            buttonLabel={busy === "toggle" ? "Working…" : user.isActive ? "Deactivate" : "Reactivate"}
            onClick={handleToggleActive}
            disabled={busy !== null || isSelf}
            variant={user.isActive ? "warning" : "default"}
            disabledReason={isSelf ? "You can't deactivate yourself." : undefined}
          />

          {/* Danger zone — hard delete */}
          <div
            className="rounded-lg p-4"
            style={{
              border: "1px solid #fecaca",
              backgroundColor: "#fef2f2",
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#dc2626", color: "#fff" }}
              >
                <Trash2 size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold" style={{ color: "#991b1b" }}>
                  Permanently delete user
                </h3>
                <p className="text-xs mt-1" style={{ color: "#7f1d1d" }}>
                  Removes the account from both auth and the database. This cannot be undone.
                  Use <strong>Deactivate</strong> instead if you just want to prevent sign-in.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={busy !== null || isSelf}
              title={isSelf ? "You can't delete yourself." : undefined}
              className="w-full px-3 py-2 text-xs font-bold rounded-lg text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#dc2626" }}
            >
              Delete {user.firstName}…
            </button>
          </div>
        </div>
      </section>

      {/* Modals */}
      {showSetPasswordModal && (
        <SetPasswordModal
          user={user}
          onClose={() => setShowSetPasswordModal(false)}
          onSuccess={() => {
            setShowSetPasswordModal(false);
            setBanner({
              kind: "success",
              title: "Password updated",
              detail: `${user.firstName}'s password has been changed. Share the new password with them securely.`,
            });
          }}
          onError={(msg) =>
            setBanner({ kind: "error", title: "Couldn't update password", detail: msg })
          }
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          user={user}
          busy={busy === "delete"}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={(typedEmail) => handleDelete(typedEmail)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────

function ActionCard({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
  disabled,
  variant = "default",
  disabledReason,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "warning";
  disabledReason?: string;
}) {
  const accentBg = variant === "warning" ? "#fff7ed" : "var(--green-50)";
  const accentColor = variant === "warning" ? "#c2410c" : "var(--color-primary)";
  const accentBorder = variant === "warning" ? "#fdba74" : "var(--border)";
  const buttonBg = variant === "warning" ? "#ea580c" : "var(--color-primary)";

  return (
    <div
      className="rounded-lg p-4"
      style={{ border: `1px solid ${accentBorder}`, backgroundColor: accentBg }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-white"
          style={{ backgroundColor: accentColor }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{description}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        title={disabled && disabledReason ? disabledReason : undefined}
        className="w-full px-3 py-2 text-xs font-bold rounded-lg text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: buttonBg }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function Banner({
  banner,
  onClose,
}: {
  banner: { kind: "success" | "error" | "warning"; title: string; detail?: string; copyable?: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const palette = {
    success: { bg: "var(--green-100)", border: "var(--border)", color: "var(--green-700)" },
    warning: { bg: "#fef3c7", border: "#fcd34d", color: "#854d0e" },
    error: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
  }[banner.kind];

  const copy = async () => {
    if (!banner.copyable) return;
    await navigator.clipboard.writeText(banner.copyable);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="rounded-lg p-4 flex items-start gap-3"
      style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}`, color: palette.color }}
    >
      {banner.kind === "warning" || banner.kind === "error" ? (
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
      ) : (
        <Check size={16} className="flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{banner.title}</p>
        {banner.detail && <p className="text-xs mt-1">{banner.detail}</p>}
        {banner.copyable && (
          <div className="mt-3 flex items-center gap-2">
            <code
              className="flex-1 px-2 py-1.5 text-[11px] font-mono rounded-md overflow-x-auto whitespace-nowrap"
              style={{ backgroundColor: "#fff", border: `1px solid ${palette.border}`, color: "#0f260b" }}
            >
              {banner.copyable}
            </code>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-md text-white"
              style={{ backgroundColor: palette.color }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
      <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

function SetPasswordModal({
  user,
  onClose,
  onSuccess,
  onError,
}: {
  user: { id: string; firstName: string; email: string };
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await adminSetPassword(user.id, password);
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  }

  const suggest = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pw = "";
    for (let i = 0; i < 14; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    pw += "!";
    setPassword(pw);
    setConfirmPassword(pw);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <h2>Set password for {user.firstName}</h2>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              You&rsquo;ll need to share this password with them securely (in person, phone, or a password manager).
              They can change it themselves after first login.
            </p>
          </div>

          {localError && (
            <div
              className="p-3 text-sm font-semibold rounded-lg"
              style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}
            >
              {localError}
            </div>
          )}

          <div>
            <label
              className="block text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              New Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="off"
              className="w-full px-3 py-2 text-sm font-mono rounded-lg"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--page-bg)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              Confirm Password
            </label>
            <input
              type="text"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="off"
              className="w-full px-3 py-2 text-sm font-mono rounded-lg"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--page-bg)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={suggest}
              className="text-xs font-semibold underline"
              style={{ color: "var(--color-primary)" }}
            >
              Suggest a strong password
            </button>
          </div>

          <div
            className="flex items-center justify-end gap-2 pt-3"
            style={{ borderTop: "1px solid var(--border-light)" }}
          >
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
              {submitting ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  user,
  busy,
  onClose,
  onConfirm,
}: {
  user: { firstName: string; lastName: string; email: string };
  busy: boolean;
  onClose: () => void;
  onConfirm: (typedEmail: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const valid = typed === user.email;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl"
        style={{ backgroundColor: "#fff", border: "2px solid #dc2626" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#fef2f2" }}
            >
              <AlertTriangle size={20} style={{ color: "#dc2626" }} />
            </div>
            <h2 style={{ color: "#991b1b" }}>Delete user permanently?</h2>
          </div>

          <div className="text-sm space-y-2" style={{ color: "#0f260b" }}>
            <p>
              You&rsquo;re about to <strong>permanently delete</strong>{" "}
              <strong>
                {user.firstName} {user.lastName}
              </strong>{" "}
              ({user.email}) from both Supabase Auth and the BNDS database.
            </p>
            <p style={{ color: "#7f1d1d" }}>
              This cannot be undone. Audit log entries referencing them will have their user ID
              preserved for HIPAA compliance, but the user record itself will be gone.
            </p>
          </div>

          <div>
            <label
              className="block text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: "#7f1d1d" }}
            >
              Type the email to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={user.email}
              autoComplete="off"
              className="w-full px-3 py-2 text-sm font-mono rounded-lg"
              style={{
                border: `1px solid ${valid ? "#16a34a" : "#fecaca"}`,
                backgroundColor: "#fff",
                color: "#0f260b",
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold rounded-lg disabled:opacity-40"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(typed)}
              disabled={!valid || busy}
              className="px-4 py-2 text-xs font-bold rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#dc2626" }}
            >
              {busy ? "Deleting…" : "Yes, delete permanently"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
