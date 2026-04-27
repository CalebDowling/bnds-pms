import Link from "next/link";
import { Plus } from "lucide-react";
import { getUsers, getRoles } from "./actions";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import { formatDate } from "@/lib/utils";
import { formatPatientName } from "@/lib/utils/formatters";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";

import type { UserRole, Role } from "@/types";

// BNDS PMS Redesign — heritage users palette (forest active, leaf badges, lake RPh, burgundy inactive)
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
      eyebrow="Administration"
      title="Users & Roles"
      subtitle={`${total.toLocaleString()} staff member${total !== 1 ? "s" : ""}`}
      actions={
        <Link
          href="/users/new"
          className="inline-flex items-center gap-1.5 rounded-md font-semibold no-underline transition-colors"
          style={{
            backgroundColor: "#1f5a3a",
            color: "#ffffff",
            border: "1px solid #1f5a3a",
            padding: "7px 13px",
            fontSize: 13,
          }}
        >
          <Plus size={14} strokeWidth={2} /> Add User
        </Link>
      }
      toolbar={
        <FilterBar
          search={<SearchBar placeholder="Search by name or email..." basePath="/users" />}
        />
      }
    >
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: "#f4ede0", borderBottom: "1px solid #e3ddd1" }}>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Name</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Email</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Department</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Roles</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Last Login</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "#7a8a78" }}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user, idx) => (
                <tr
                  key={user.id}
                  className="transition-colors"
                  style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/users/${user.id}`}
                      className="no-underline hover:underline"
                      style={{ color: "#1f5a3a", fontWeight: 600 }}
                    >
                      {formatPatientName({ firstName: user.firstName, lastName: user.lastName }, { format: "last-first" })}
                    </Link>
                    {user.isPharmacist && (
                      <span
                        className="ml-2"
                        style={{
                          backgroundColor: "rgba(56,109,140,0.12)",
                          color: "#2c5e7a",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 4,
                          letterSpacing: "0.04em",
                        }}
                      >
                        RPh
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#3a4a3c" }}>{user.email}</td>
                  <td className="px-4 py-3 capitalize" style={{ color: "#5a6b58" }}>{user.department || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.length > 0 ? (
                        user.roles.map((ur: UserRole) => (
                          <span
                            key={ur.id}
                            style={{
                              backgroundColor: "rgba(31,90,58,0.14)",
                              color: "#1f5a3a",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: 4,
                              letterSpacing: "0.04em",
                            }}
                          >
                            {ur.role.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs" style={{ color: "#7a8a78" }}>No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#5a6b58" }}>
                    {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center"
                      style={{
                        backgroundColor: user.isActive ? "rgba(31,90,58,0.14)" : "rgba(184,58,47,0.10)",
                        color: user.isActive ? "#1f5a3a" : "#9a2c1f",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
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
        className="mt-6 rounded-lg p-6"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
      >
        <h2 className="font-serif mb-4" style={{ fontSize: 18, color: "#0f2e1f", fontWeight: 600 }}>
          Roles <span style={{ color: "#7a8a78", fontWeight: 400 }}>({roles.length})</span>
        </h2>
        {roles.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {roles.map((role: Role) => (
              <div
                key={role.id}
                className="rounded-md p-3"
                style={{ border: "1px solid #e3ddd1", backgroundColor: "#faf8f4" }}
              >
                <p className="text-sm font-semibold" style={{ color: "#0f2e1f" }}>{role.name}</p>
                {role.description && (
                  <p className="text-xs mt-1" style={{ color: "#5a6b58" }}>{role.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "#7a8a78" }}>No roles defined. Add roles when creating users.</p>
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
