"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "@/components/providers/SidebarProvider";
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
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Patients", href: "/patients", icon: Users },
      { label: "Prescriptions", href: "/prescriptions", icon: Pill },
      { label: "eRx Intake", href: "/intake", icon: Inbox },
      { label: "Pickup", href: "/pickup", icon: ClipboardList },
    ],
  },
  {
    label: "DISPENSING",
    items: [
      { label: "Compounding", href: "/compounding", icon: FlaskConical },
      { label: "Batch Records", href: "/compounding/batches", icon: FileText },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Inventory", href: "/inventory", icon: Package },
      { label: "Reorder", href: "/inventory/reorder", icon: RefreshCw },
      { label: "Shipping", href: "/shipping", icon: Truck },
      { label: "POS", href: "/pos", icon: Monitor },
    ],
  },
  {
    label: "FINANCIAL",
    items: [
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Insurance", href: "/insurance", icon: ShieldCheck },
    ],
  },
  {
    label: "INSIGHTS",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "Messaging", href: "/messaging", icon: MessageSquare },
    ],
  },
];

const bottomItems: NavItem[] = [
  { label: "Users", href: "/users", icon: UserCog },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function SidebarDark() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle } = useSidebar();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen z-40 flex flex-col bg-[#0B1120] border-r border-[#1E293B] transition-all duration-300 ease-in-out hidden md:flex"
      style={{ width: collapsed ? 64 : 256 }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="h-14 flex items-center border-b border-[#1E293B] flex-shrink-0 overflow-hidden px-3">
        <Link href="/dashboard" className="flex items-center gap-3 no-underline min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            B
          </div>
          {!collapsed && (
            <div className="transition-opacity duration-300">
              <div className="text-sm font-bold text-white tracking-tight">BNDS</div>
              <div className="text-[10px] text-slate-500 -mt-0.5">Pharmacy Management</div>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-5" : ""}>
            {group.label && !collapsed && (
              <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600 transition-opacity duration-300">
                {group.label}
              </div>
            )}
            {group.label && collapsed && (
              <div className="mx-auto my-2 w-6 border-t border-slate-800" />
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group relative flex items-center gap-3 rounded-md text-[13px] font-medium
                    transition-all duration-150 no-underline
                    ${collapsed ? "justify-center px-2 py-2" : "px-3 py-[7px]"}
                    ${
                      active
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }
                  `}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={17} strokeWidth={active ? 2 : 1.5} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {active && !collapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-400" />
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-800 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 border border-slate-700">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 border-t border-[#1E293B]">
        <div className="py-2 px-2 space-y-0.5">
          {bottomItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group relative flex items-center gap-3 rounded-md text-[13px] font-medium
                  transition-all duration-150 no-underline
                  ${collapsed ? "justify-center px-2 py-2" : "px-3 py-[7px]"}
                  ${active ? "bg-emerald-500/15 text-emerald-400" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={17} strokeWidth={active ? 2 : 1.5} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-800 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 border border-slate-700">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sign out + toggle */}
        <div className="px-2 py-2 border-t border-[#1E293B] flex items-center gap-1">
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-3 rounded-md text-[13px] text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors ${collapsed ? "justify-center px-2 py-2 flex-1" : "px-3 py-2 flex-1"}`}
            aria-label="Sign out"
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut size={16} strokeWidth={1.5} className="flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
          <button
            onClick={toggle}
            className="p-2 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
