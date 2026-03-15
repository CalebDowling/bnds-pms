"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Patients", href: "/patients", icon: "👥" },
  { label: "Prescriptions", href: "/prescriptions", icon: "💊" },
  { label: "eRx Intake", href: "/intake", icon: "📥" },
  { label: "Pickup", href: "/pickup", icon: "📋" },
  { label: "Compounding", href: "/compounding", icon: "🧪" },
  { label: "Batch Records", href: "/compounding/batches", icon: "📄" },
  { label: "Inventory", href: "/inventory", icon: "📦" },
  { label: "Shipping", href: "/shipping", icon: "🚚" },
  { label: "Billing", href: "/billing", icon: "💳" },
  { label: "POS", href: "/pos", icon: "🖥️" },
  { label: "Reports", href: "/reports", icon: "📈" },
  { label: "Insurance", href: "/insurance", icon: "🏥" },
  { label: "Messaging", href: "/messaging", icon: "💬" },
  { label: "Users", href: "/users", icon: "🧑‍💼" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.webp" alt="Boudreaux's" className="h-10" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                isActive
                  ? "bg-[#40721D] text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <span className="text-base">🚪</span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
