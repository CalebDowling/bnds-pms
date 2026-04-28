"use client";

/**
 * /users — UsersClient
 * ─────────────────────────────────────────────────────────────────────────
 * Real-data client for the Users page. Replaces the design-reference
 * mock that hardcoded Marie Boudreaux / David Landry / Sara Comeaux /
 * etc. as the staff list, plus the static "Invite user" button that
 * had no onClick handler — clicking it did nothing, which is what the
 * operator hit when trying to onboard a real person.
 *
 * The actual invite flow lives at /users/new and POSTs to
 * /api/users/invite. The "Invite user" action button below is now a
 * Link to that route, so the button visibly works and the existing
 * end-to-end invite (Supabase Auth user + recovery email via
 * Microsoft Graph or SMTP) is reachable.
 *
 * Data source for each tab:
 *   - Staff           → real User rows (passed as `staff`)
 *   - Pending invites → users with lastLogin IS NULL (invited, never accepted)
 *   - Roles           → real Role rows + member counts
 *   - Audit log       → recent AuditLog entries with the actor user joined
 *
 * The "Active sessions" tab from the mock has been dropped — there's
 * no per-workstation session table in our schema, and surfacing fake
 * sessions in production is a security-signal-poisoning hazard
 * (operators would have no way to tell "force sign out" was a no-op).
 * If we ever wire real sessions, it can come back.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DesignPage, I, StatusPill, Toolbar } from "@/components/design";

export interface StaffRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string | null;
  isPharmacist: boolean;
  licenseNumber: string | null;
  isActive: boolean;
  lastLogin: string | null; // ISO string (serializable across the server→client boundary)
  roles: string[];
  isYou: boolean;
}

export interface PendingInviteRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  invitedAt: string; // ISO string
}

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

export interface AuditRow {
  id: string;
  who: string;
  action: string;
  resource: string;
  recordId: string;
  when: string; // ISO string
}

interface Props {
  staff: StaffRow[];
  pendingInvites: PendingInviteRow[];
  roles: RoleRow[];
  audit: AuditRow[];
  totalActiveStaff: number;
  totalInactiveStaff: number;
}

/** "2 min ago" / "1h ago" / "Yesterday" / "Mar 14" — used for last-active. */
function timeSince(iso: string | null): string {
  if (!iso) return "Never";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";
  const ms = Date.now() - then.getTime();
  if (ms < 60_000) return "Just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 172_800_000) return "Yesterday";
  if (ms < 7 * 86_400_000) return `${Math.floor(ms / 86_400_000)} days ago`;
  // Older than a week: render a date.
  const mm = String(then.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(then.getUTCDate()).padStart(2, "0");
  const yyyy = String(then.getUTCFullYear()).slice(2);
  return `${mm}/${dd}/${yyyy}`;
}

function StaffStatusPill({ active }: { active: boolean }) {
  if (active) return <StatusPill tone="ok" label="Active" />;
  return <StatusPill tone="mute" label="Inactive" dot={false} />;
}

function roleLabel(roles: string[]): string {
  if (roles.length === 0) return "No role";
  // Capitalize first letter for display (DB stores lowercase: "admin", "pharmacist").
  return roles
    .map((r) => r.charAt(0).toUpperCase() + r.slice(1))
    .join(" · ");
}

export default function UsersClient({
  staff,
  pendingInvites,
  roles,
  audit,
  totalActiveStaff,
  totalInactiveStaff,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = React.useState("staff");
  const [search, setSearch] = React.useState("");

  const filteredStaff = React.useMemo(() => {
    if (!search.trim()) return staff;
    const q = search.toLowerCase();
    return staff.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.roles.some((r) => r.toLowerCase().includes(q))
    );
  }, [staff, search]);

  const tabs = [
    { id: "staff", label: "Staff", count: staff.length },
    { id: "invites", label: "Pending invites", count: pendingInvites.length },
    { id: "roles", label: "Roles & permissions", count: roles.length },
    { id: "audit", label: "Audit log", count: audit.length },
  ];

  // Header subtitle reflects real counts. The old subtitle was
  // "11 staff across 3 locations · 6 sessions active right now" — both
  // numbers were fabricated.
  const subtitleParts: string[] = [];
  subtitleParts.push(
    `${totalActiveStaff} active ${totalActiveStaff === 1 ? "user" : "users"}`
  );
  if (totalInactiveStaff > 0) {
    subtitleParts.push(
      `${totalInactiveStaff} inactive`
    );
  }
  if (pendingInvites.length > 0) {
    subtitleParts.push(
      `${pendingInvites.length} pending invite${pendingInvites.length === 1 ? "" : "s"}`
    );
  }
  const subtitle = subtitleParts.join(" · ");

  return (
    <DesignPage
      sublabel="Administration"
      title="Users"
      subtitle={subtitle}
      actions={
        <>
          <Link href="/users/new" className="btn btn-primary btn-sm">
            <I.Plus /> Invite user
          </Link>
        </>
      }
    >
      <Toolbar
        tabs={tabs}
        active={tab}
        onChange={setTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, role…"
      />

      {tab === "staff" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Department</th>
                <th>License</th>
                <th>Status</th>
                <th>Last login</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--ink-3)" }}>
                    {search.trim()
                      ? "No users match your search."
                      : "No users yet. Click “Invite user” to add one."}
                  </td>
                </tr>
              )}
              {filteredStaff.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => router.push(`/users/${u.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 500 }}>
                        {u.firstName} {u.lastName}
                      </span>
                      {u.isYou && (
                        <span className="pill pill-leaf" style={{ padding: "1px 6px", fontSize: 10 }}>
                          You
                        </span>
                      )}
                      {u.isPharmacist && (
                        <span
                          className="pill"
                          style={{ padding: "1px 6px", fontSize: 10, background: "var(--paper-2)", color: "var(--ink-3)" }}
                        >
                          RPh
                        </span>
                      )}
                    </div>
                    <div className="t-xs bnds-mono" style={{ color: "var(--ink-4)" }}>
                      {u.id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="t-xs">{roleLabel(u.roles)}</td>
                  <td className="t-xs bnds-mono" style={{ fontSize: 11.5 }}>
                    {u.email}
                  </td>
                  <td className="t-xs" style={{ textTransform: "capitalize" }}>
                    {u.department ?? "—"}
                  </td>
                  <td className="t-xs">
                    {u.licenseNumber ? (
                      <span className="bnds-mono" style={{ fontSize: 11.5 }}>
                        {u.licenseNumber}
                      </span>
                    ) : (
                      <span style={{ color: "var(--ink-4)" }}>—</span>
                    )}
                  </td>
                  <td>
                    <StaffStatusPill active={u.isActive} />
                  </td>
                  <td
                    className="t-xs"
                    style={{
                      color: u.lastLogin ? "var(--ink-3)" : "var(--ink-4)",
                    }}
                  >
                    {timeSince(u.lastLogin)}
                  </td>
                  <td>
                    <I.ChevR style={{ color: "var(--ink-4)" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "invites" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Invited</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendingInvites.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--ink-3)" }}>
                    No pending invites. Everyone you&rsquo;ve invited has set their password and logged in.
                  </td>
                </tr>
              )}
              {pendingInvites.map((i) => (
                <tr key={i.id}>
                  <td className="bnds-mono" style={{ fontSize: 12, fontWeight: 500 }}>
                    {i.email}
                  </td>
                  <td>
                    {i.firstName} {i.lastName}
                  </td>
                  <td className="t-xs">{roleLabel(i.roles)}</td>
                  <td className="t-xs">{timeSince(i.invitedAt)}</td>
                  <td>
                    <StatusPill tone="info" label="Awaiting first login" />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Link
                        href={`/users/${i.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "roles" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Role</th>
                <th>Description</th>
                <th className="t-num" style={{ textAlign: "right" }}>
                  Members
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: 24, color: "var(--ink-3)" }}>
                    No roles defined.
                  </td>
                </tr>
              )}
              {roles.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500, textTransform: "capitalize" }}>{r.name}</td>
                  <td className="t-xs" style={{ color: "var(--ink-3)" }}>
                    {r.description ?? "—"}
                  </td>
                  <td className="t-num" style={{ textAlign: "right" }}>
                    {r.memberCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "audit" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--ink-3)" }}>
                    No audit events yet.
                  </td>
                </tr>
              )}
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="t-xs" style={{ whiteSpace: "nowrap" }}>
                    {timeSince(a.when)}
                  </td>
                  <td style={{ fontWeight: 500 }}>{a.who}</td>
                  <td>
                    <span className="pill pill-mute" style={{ padding: "1px 7px" }}>
                      {a.action}
                    </span>
                  </td>
                  <td className="t-xs" style={{ textTransform: "capitalize" }}>
                    {a.resource}
                  </td>
                  <td className="t-xs bnds-mono" style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                    {a.recordId.slice(0, 8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--line)",
              fontSize: 12,
              color: "var(--ink-3)",
            }}
          >
            Showing the most recent {audit.length} events. Full history at{" "}
            <Link href="/settings/audit-log" style={{ color: "var(--bnds-forest)" }}>
              Settings → Audit log
            </Link>
            .
          </div>
        </div>
      )}
    </DesignPage>
  );
}
