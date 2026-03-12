import { notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getRoles } from "../actions";
import { formatDate } from "@/lib/utils";
import UserEditForm from "./UserEditForm";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, roles] = await Promise.all([getUser(id), getRoles()]);
  if (!user) notFound();

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
            {user.isPharmacist && <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">RPh</span>}
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {user.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
        </div>
        <Link href="/users" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Back to Users</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Department</p>
          <p className="text-sm font-bold text-gray-900 mt-1 capitalize">{user.department || "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Phone</p>
          <p className="text-sm font-bold text-gray-900 mt-1">{user.phone || "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Last Login</p>
          <p className="text-sm font-bold text-gray-900 mt-1">{user.lastLogin ? formatDate(user.lastLogin) : "Never"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Roles</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {user.roles.length > 0 ? user.roles.map((ur: any) => (
              <span key={ur.id} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">{ur.role.name}</span>
            )) : <span className="text-sm text-gray-400">None</span>}
          </div>
        </div>
      </div>

      <UserEditForm user={user} roles={roles} />
    </div>
  );
}
