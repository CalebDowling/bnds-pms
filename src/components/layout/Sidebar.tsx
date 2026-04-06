"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Pill,
  Inbox,
  ClipboardList,
  FlaskConical,
  FileText,
  Package,
  RefreshCw,
  Truck,
  CreditCard,
  Monitor,
  BarChart3,
  ShieldCheck,
  MessageSquare,
  UserCog,
  Settings,
  LogOut,
} from "lucide-react";
import ColorThemePicker from "@/components/ui/ColorThemePicker";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Prescriptions", href: "/prescriptions", icon: Pill },
  { label: "eRx Intake", href: "/intake", icon: Inbox },
  { label: "Pickup", href: "/pickup", icon: ClipboardList },
  { label: "Compounding", href: "/compounding", icon: FlaskConical },
  { label: "Batch Records", href: "/compounding/batches", icon: FileText },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Reorder", href: "/inventory/reorder", icon: RefreshCw },
  { label: "Shipping", href: "/shipping", icon: Truck },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "POS", href: "/pos", icon: Monitor },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Insurance", href: "/insurance", icon: ShieldCheck },
  { label: "Messaging", href: "/messaging", icon: MessageSquare },
  { label: "Users", href: "/users", icon: UserCog },
  { label: "Settings", href: "/settings", icon: Settings },
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
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                isActive
                  ? "bg-[var(--theme-accent,#40721D)] text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme Picker */}
      <div className="px-3 py-2 border-t border-gray-200">
        <ColorThemePicker />
      </div>

      {/* Sign Out */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut size={18} strokeWidth={1.75} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
