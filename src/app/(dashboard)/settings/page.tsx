import Link from "next/link";
import PermissionGuard from "@/components/auth/PermissionGuard";

function SettingsPageContent() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Pharmacy configuration, users, and system settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pharmacy Info */}
        {/* Audit Log */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Audit Log</h2>
          <p className="text-sm text-gray-500 mb-4">View system activity and user actions</p>
          <Link
            href="/settings/audit-log"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-[#40721D] text-white text-sm font-medium hover:bg-[#2D5114] transition-colors"
          >
            View Audit Log →
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pharmacy Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="text-sm text-gray-900 font-medium">Boudreaux&apos;s Compounding Pharmacy</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">NPI</dt>
              <dd className="text-sm text-gray-900 font-mono">1234567890</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">NCPDP</dt>
              <dd className="text-sm text-gray-900 font-mono">—</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">DEA</dt>
              <dd className="text-sm text-gray-900 font-mono">—</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">State License</dt>
              <dd className="text-sm text-gray-900">LA</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Phone</dt>
              <dd className="text-sm text-gray-900">(337) 000-0000</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Fax</dt>
              <dd className="text-sm text-gray-900">(337) 000-0001</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Address</dt>
              <dd className="text-sm text-gray-900 text-right">404 E Prien Lake Rd<br />Lake Charles, LA 70601</dd>
            </div>
          </dl>
        </div>

        {/* System Config */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Configuration</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">MRN Format</p>
                <p className="text-xs text-gray-400">Patient MRN prefix and numbering</p>
              </div>
              <span className="text-sm text-gray-600 font-mono">BNDS-XXXXXXX</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Rx Number Start</p>
                <p className="text-xs text-gray-400">Starting prescription number</p>
              </div>
              <span className="text-sm text-gray-600 font-mono">100001</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Batch Number Format</p>
                <p className="text-xs text-gray-400">Compounding batch numbering</p>
              </div>
              <span className="text-sm text-gray-600 font-mono">BYYYYMMDD-###</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Default BUD Days</p>
                <p className="text-xs text-gray-400">Non-sterile compounds</p>
              </div>
              <span className="text-sm text-gray-600">180 days</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">Time Zone</p>
                <p className="text-xs text-gray-400">System time zone</p>
              </div>
              <span className="text-sm text-gray-600">America/Chicago (CST)</span>
            </div>
          </div>
        </div>

        {/* Users & Roles */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Users & Roles</h2>
          <p className="text-sm text-gray-500 mb-4">Manage staff accounts, roles, and permissions.</p>
          <div className="space-y-3">
            {[
              { role: "Pharmacist (RPh)", desc: "Full system access, verification, clinical decisions", color: "bg-purple-50 text-purple-700" },
              { role: "Pharmacy Tech", desc: "Fill prescriptions, compound, manage inventory", color: "bg-blue-50 text-blue-700" },
              { role: "Shipping Clerk", desc: "Pack and ship orders, manage deliveries", color: "bg-cyan-50 text-cyan-700" },
              { role: "Billing Specialist", desc: "Claims processing, payments, insurance", color: "bg-green-50 text-green-700" },
              { role: "Cashier", desc: "POS transactions, patient pickup", color: "bg-orange-50 text-orange-700" },
              { role: "Admin", desc: "System configuration, user management", color: "bg-red-50 text-red-700" },
            ].map((r) => (
              <div key={r.role} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${r.color}`}>{r.role}</span>
                  <p className="text-xs text-gray-400 mt-1">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Integrations</h2>
          <p className="text-sm text-gray-500 mb-4">Manage external service connections</p>
          <Link
            href="/settings/integrations"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-[#40721D] text-white text-sm font-medium hover:bg-[#2D5114] transition-colors"
          >
            Manage Integrations →
          </Link>
        </div>
      </div>
    </div>
  );
}
export default function SettingsPage() {
  return (
    <PermissionGuard resource="settings" action="read">
      <SettingsPageContent />
    </PermissionGuard>
  );
}
