/**
 * /users — Users administration page (real data).
 *
 * Replaces the previous mock-data page that hardcoded fake staff
 * (Marie Boudreaux, David Landry, Sara Comeaux, Trevor Mouton, Aliyah
 * Hebert, Pierre Doucet, Camille Guidry, Jean Robichaux, Yvette
 * Fontenot, Marcus Thibodeaux, Jean Robichaux) and a static "Invite
 * user" button with no onClick handler.
 *
 * The new page server-fetches:
 *   - Real User rows for the Staff tab
 *   - Pending invites = users where lastLogin IS NULL
 *   - Real Role rows + member counts
 *   - Recent AuditLog entries
 *
 * The Invite user action is now a Link to /users/new, which is the
 * existing real form that POSTs to /api/users/invite (Supabase Auth
 * createUser + recovery-link generation + email via Microsoft Graph
 * or SMTP).
 */
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import UsersClient, {
  type StaffRow,
  type PendingInviteRow,
  type RoleRow,
  type AuditRow,
} from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [users, roles, audit, currentUser] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
      include: { roles: { include: { role: true } } },
    }),
    // Roles + member counts. We use _count on the join table so the
    // Roles tab shows accurate "X members" without a per-row query.
    prisma.role.findMany({
      orderBy: { name: "asc" },
      // Relation on Role is `userRoles` (the join model), not `users`.
      // `_count` lets us render an accurate "X members" without N+1.
      include: { _count: { select: { userRoles: true } } },
    }),
    // Recent audit entries. Join the actor User so we can render
    // "Caleb Dowling" instead of a UUID. Limit 25 to keep the page
    // light — the full log lives at /settings/audit-log.
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    getCurrentUser(),
  ]);

  // Hide the System Actor row (system@bndsrx.local) from the visible
  // user list. It exists so audit events have a non-null FK target
  // when the action was triggered by a server job rather than a real
  // person, but it's not a real staff member and shouldn't show up
  // in admin listings.
  const visibleUsers = users.filter(
    (u) => u.email !== "system@bndsrx.local"
  );

  const staff: StaffRow[] = visibleUsers
    .filter((u) => u.lastLogin !== null) // Logged-in users go on the Staff tab.
    .map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      department: u.department,
      isPharmacist: u.isPharmacist,
      licenseNumber: u.licenseNumber,
      isActive: u.isActive,
      lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
      roles: u.roles.map((ur) => ur.role.name),
      isYou: currentUser?.id === u.id,
    }));

  const pendingInvites: PendingInviteRow[] = visibleUsers
    .filter((u) => u.lastLogin === null && u.isActive)
    .map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      roles: u.roles.map((ur) => ur.role.name),
      invitedAt: u.createdAt.toISOString(),
    }));

  const roleRows: RoleRow[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    memberCount: r._count.userRoles,
  }));

  const auditRows: AuditRow[] = audit.map((a) => ({
    id: a.id,
    // AuditLog.user is a required relation, so no null-check needed.
    // Fall back to email if first/last name are blank.
    who: `${a.user.firstName} ${a.user.lastName}`.trim() || a.user.email,
    action: a.action,
    resource: a.tableName,
    recordId: a.recordId,
    when: a.createdAt.toISOString(),
  }));

  const totalActiveStaff = visibleUsers.filter((u) => u.isActive && u.lastLogin !== null).length;
  const totalInactiveStaff = visibleUsers.filter((u) => !u.isActive).length;

  return (
    <UsersClient
      staff={staff}
      pendingInvites={pendingInvites}
      roles={roleRows}
      audit={auditRows}
      totalActiveStaff={totalActiveStaff}
      totalInactiveStaff={totalInactiveStaff}
    />
  );
}
