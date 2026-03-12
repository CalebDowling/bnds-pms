import Link from "next/link";
import { getUsers, getRoles, createRole } from "./actions";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import { formatDate } from "@/lib/utils";

export default async function UsersPage({
  searchParams,
}: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);

  const { users, total, pages } = await getUsers({ search, page });
  const roles = await getRoles();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Roles</h1>
          <p className="text-sm text-gray-500 mt-1">{total} staff member{total !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/users/new" className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114]">
          + Add User
        </Link>
      </div>

      <div className="mb-4">
        <SearchBar placeholder="Search by name or email..." basePath="/users" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Roles</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Login</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No users found</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/users/${user.id}`} className="text-sm font-medium text-[#40721D] hover:underline">
                    {user.lastName}, {user.firstName}
                  </Link>
                  {user.isPharmacist && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">RPh</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3 text-sm text-gray-500 capitalize">{user.department || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.length > 0 ? user.roles.map((ur: any) => (
                      <span key={ur.id} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{ur.role.name}</span>
                    )) : <span className="text-xs text-gray-400">No roles</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                    user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}>{user.isActive ? "Active" : "Inactive"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="mt-4"><Pagination total={total} pages={pages} page={page} basePath="/users" /></div>}

      {/* Roles Section */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Roles ({roles.length})</h2>
        {roles.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {roles.map((role: any) => (
              <div key={role.id} className="border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">{role.name}</p>
                {role.description && <p className="text-xs text-gray-400 mt-1">{role.description}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No roles defined. Add roles when creating users.</p>
        )}
      </div>
    </div>
  );
}
