"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoles, createRole } from "../actions";
import PermissionGuard from "@/components/auth/PermissionGuard";

function NewUserPageContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  const [form, setForm] = useState({
    email: "", firstName: "", lastName: "", phone: "",
    department: "", isPharmacist: false, licenseNumber: "", pin: "",
  });

  useEffect(() => {
    getRoles().then(setRoles);
  }, []);

  function updateField(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleRole(roleId: string) {
    setSelectedRoles(prev => prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]);
  }

  async function handleAddRole() {
    if (!newRoleName.trim()) return;
    const role = await createRole(newRoleName.trim(), newRoleDesc.trim());
    setRoles(prev => [...prev, role]);
    setSelectedRoles(prev => [...prev, role.id]);
    setNewRoleName(""); setNewRoleDesc(""); setShowNewRole(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!form.email.trim()) throw new Error("Email is required");
      if (!form.firstName.trim()) throw new Error("First name is required");
      if (!form.lastName.trim()) throw new Error("Last name is required");

      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          roles: selectedRoles,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to invite user");
      }

      const data = await response.json();

      // Show success message
      setError(null);
      setSuccess(
        `Invitation sent to ${form.email}. They'll receive an email to set their password.`
      );
      setForm({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        department: "",
        isPharmacist: false,
        licenseNumber: "",
        pin: "",
      });
      setSelectedRoles([]);

      // Redirect after a short delay to show success
      setTimeout(() => {
        router.push(`/users/${data.user.id}`);
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to invite user");
      setLoading(false);
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Staff Member</h1>
        <p className="text-sm text-gray-500 mt-1">Create a new user account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200">
            ✓ {success}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" value={form.firstName} onChange={e => updateField("firstName", e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" value={form.lastName} onChange={e => updateField("lastName", e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => updateField("email", e.target.value)} required className={inputClass} />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN (for verification)</label>
              <input type="password" value={form.pin} onChange={e => updateField("pin", e.target.value)} maxLength={6} placeholder="4-6 digits" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pharmacy Credentials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPharmacist} onChange={e => updateField("isPharmacist", e.target.checked)}
                  className="w-4 h-4 text-[#40721D] border-gray-300 rounded" />
                <span className="text-sm text-gray-700">Licensed Pharmacist (RPh)</span>
              </label>
            </div>
            {form.isPharmacist && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input type="text" value={form.licenseNumber} onChange={e => updateField("licenseNumber", e.target.value)} placeholder="LA-XXXXX" className={inputClass} />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
            {!showNewRole && <button type="button" onClick={() => setShowNewRole(true)} className="text-sm text-[#40721D] font-medium hover:underline">+ New Role</button>}
          </div>
          {showNewRole && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4 flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Role Name</label>
                <input type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="e.g. Pharmacy Tech" className={inputClass} />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input type="text" value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} placeholder="Optional" className={inputClass} />
              </div>
              <button type="button" onClick={handleAddRole} className="px-3 py-2 bg-[#40721D] text-white text-sm rounded-lg hover:bg-[#2D5114]">Add</button>
              <button type="button" onClick={() => setShowNewRole(false)} className="text-sm text-gray-400">Cancel</button>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {roles.map((role: any) => (
              <label key={role.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedRoles.includes(role.id) ? "border-[#40721D] bg-blue-50" : "border-gray-200 hover:bg-gray-50"
              }`}>
                <input type="checkbox" checked={selectedRoles.includes(role.id)} onChange={() => toggleRole(role.id)}
                  className="w-4 h-4 text-[#40721D] border-gray-300 rounded" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{role.name}</p>
                  {role.description && <p className="text-xs text-gray-400">{role.description}</p>}
                </div>
              </label>
            ))}
            {roles.length === 0 && <p className="text-sm text-gray-400 col-span-3">No roles yet. Create one above.</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50">
            {loading ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
}
export default function NewUserPage() {
  return (
    <PermissionGuard resource="users" action="write">
      <NewUserPageContent />
    </PermissionGuard>
  );
}
