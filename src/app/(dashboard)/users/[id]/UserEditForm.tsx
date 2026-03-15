"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUser, toggleUserActive } from "../actions";
import { getErrorMessage } from "@/lib/errors";

import type { UserWithRoles, Role, UserRole } from "@/types";
export default function UserEditForm({ user, roles }: { user: UserWithRoles; roles: Role[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: user.email, firstName: user.firstName, lastName: user.lastName,
    phone: user.phone || "", department: user.department || "",
    isPharmacist: user.isPharmacist, licenseNumber: user.licenseNumber || "", pin: "",
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles.map((ur: UserRole) => ur.roleId));

  function updateField(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setLoading(true); setError(null);
    try {
      await updateUser(user.id, { ...form, roleIds: selectedRoles });
      setEditing(false);
      router.refresh();
    } catch (error: unknown) { setError(getErrorMessage(error)); }
    finally { setLoading(false); }
  }

  async function handleToggleActive() {
    if (!confirm(`${user.isActive ? "Deactivate" : "Activate"} this user?`)) return;
    await toggleUserActive(user.id);
    router.refresh();
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]";

  if (!editing) {
    return (
      <div className="flex gap-3">
        <button onClick={() => setEditing(true)} className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114]">Edit User</button>
        <button onClick={handleToggleActive} className={`px-4 py-2 text-sm font-medium rounded-lg border ${
          user.isActive ? "text-red-600 border-red-300 hover:bg-red-50" : "text-green-600 border-green-300 hover:bg-green-50"
        }`}>{user.isActive ? "Deactivate" : "Activate"}</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-[#40721D] p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit User</h2>
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input type="text" value={form.firstName} onChange={e => updateField("firstName", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input type="text" value={form.lastName} onChange={e => updateField("lastName", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => updateField("email", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="tel" value={form.phone} onChange={e => updateField("phone", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <select value={form.department} onChange={e => updateField("department", e.target.value)} className={inputClass}>
            <option value="">Select...</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="shipping">Shipping</option>
            <option value="billing">Billing</option>
            <option value="operations">Operations</option>
            <option value="hr">HR</option>
            <option value="it">IT</option>
            <option value="executive">Executive</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New PIN</label>
          <input type="password" value={form.pin} onChange={e => updateField("pin", e.target.value)} placeholder="Leave blank to keep" className={inputClass} />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPharmacist} onChange={e => updateField("isPharmacist", e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-gray-700">Pharmacist (RPh)</span>
          </label>
        </div>
        {form.isPharmacist && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License #</label>
            <input type="text" value={form.licenseNumber} onChange={e => updateField("licenseNumber", e.target.value)} className={inputClass} />
          </div>
        )}
      </div>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Roles</h3>
        <div className="flex flex-wrap gap-2">
          {roles.map((role: Role) => (
            <label key={role.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
              selectedRoles.includes(role.id) ? "border-[#40721D] bg-blue-50" : "border-gray-200"
            }`}>
              <input type="checkbox" checked={selectedRoles.includes(role.id)}
                onChange={() => setSelectedRoles(prev => prev.includes(role.id) ? prev.filter(r => r !== role.id) : [...prev, role.id])}
                className="w-3.5 h-3.5" />
              {role.name}
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
        <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg disabled:opacity-50">
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
