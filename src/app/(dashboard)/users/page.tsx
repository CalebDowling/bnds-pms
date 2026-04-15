import Link from "next/link";
import { Plus } from "lucide-react";
import { getUsers, getRoles } from "./actions";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import { formatDate } from "@/lib/utils";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";

import type { UserRole, Role } from "@/types";

async function UsersPageContent({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);

  const { users, total, pages } = await getUsers({ search, page });
  const roles = await getRoles();

  return (
    <PageShell
      title="Users & Roles"
      subtitle={`${total.toLocaleString()} staff member${total !== 1 ? "s" : ""}`}
      actions={
        <Link
          href="/users/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white no-underline transition-colors"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <Plus size={14} /> Add User
        </Link>
      }
      toolbar={
        <FilterBar
          search={<SearchBar placeholder="Search by name or email..." basePath="/users" />}
        />
      }
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: "var(--green-50)", borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Department</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Roles</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Last Login</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user, idx) => (
                <tr
                  key={user.id}
                  className="transition-colors"
                  style={{ borderTop: idx > 0 ? "1px solid var(--border-light)" : undefined }}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/users/${user.id}`}
                      className="text-sm font-semibold no-underline hover:underline"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {user.lastName}, {user.firstName}
                    </Link>
                    {user.isPharmacist && (
                      <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                        RPh
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{user.email}</td>
                  <td className="px-4 py-3 text-sm capitalize" style={{ color: "var(--text-muted)" }}>{user.department || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.length > 0 ? (
                        user.roles.map((ur: UserRole) => (
                          <span
                            key={ur.id}
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: "var(--green-100)", color: "var(--green-700)" }}
                          >
                            {ur.role.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full"
                      style={{
                        backgroundColor: user.isActive ? "var(--green-100)" : "#fef2f2",
                        color: user.isActive ? "var(--green-700)" : "#b91c1c",
                      }}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-4">
          <Pagination total={total} pages={pages} page={page} basePath="/users" />
        </div>
      )}

      {/* Roles Section */}
      <div
        className="mt-6 rounded-xl p-6"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        <h2 className="mb-4">Roles ({roles.length})</h2>
        {roles.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {roles.map((role: Role) => (
              <div
                key={role.id}
                className="rounded-lg p-3"
                style={{ border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{role.name}</p>
                {role.description && (
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{role.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No roles defined. Add roles when creating users.</p>
        )}
      </div>
    </PageShell>
  );
}

export default function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  return (
    <PermissionGuard resource="users" action="read">
      <UsersPageContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
