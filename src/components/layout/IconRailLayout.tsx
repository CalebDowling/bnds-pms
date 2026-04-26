"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  Pill,
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
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Workflow",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Patients", href: "/patients", icon: Users },
      { label: "Prescriptions", href: "/prescriptions", icon: Pill },
      { label: "Pickup", href: "/pickup", icon: ClipboardList },
    ],
  },
  {
    label: "Dispensing",
    items: [
      { label: "Compounding", href: "/compounding", icon: FlaskConical },
      { label: "Batch Records", href: "/compounding/batches", icon: FileText },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Inventory", href: "/inventory", icon: Package },
      { label: "Reorder", href: "/inventory/reorder", icon: RefreshCw },
      { label: "Shipping", href: "/shipping", icon: Truck },
      { label: "POS", href: "/pos", icon: Monitor },
    ],
  },
  {
    label: "Financial",
    items: [
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Insurance", href: "/insurance", icon: ShieldCheck },
    ],
  },
  {
    label: "Insights",
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

export default function IconRailLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
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

  function isGroupActive(group: NavGroup): boolean {
    return group.items.some((item) => isActive(item.href));
  }

  // Find the first icon for each group to display in the rail
  const groupIcons: { label: string; icon: LucideIcon; active: boolean }[] = navGroups.map((g) => ({
    label: g.label,
    icon: g.items[0].icon,
    active: isGroupActive(g),
  }));

  return (
    <div className="min-h-screen flex">
      {/* Icon rail - always 60px */}
      <aside className="fixed left-0 top-0 h-screen w-[60px] z-40 bg-[#0F172A] flex flex-col items-center py-3 hidden md:flex">
        {/* Logo */}
        <Link href="/dashboard" className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm no-underline mb-4 hover:scale-105 transition-transform">
          B
        </Link>

        {/* Group icons */}
        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
          {groupIcons.map((g) => {
            const Icon = g.icon;
            return (
              <div
                key={g.label}
                className="relative w-full"
                onMouseEnter={() => setHoveredGroup(g.label)}
                onMouseLeave={() => setHoveredGroup(null)}
              >
                <button
                  className={`
                    w-full flex items-center justify-center py-2.5 rounded-lg transition-all
                    ${g.active ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}
                  `}
                  title={g.label}
                >
                  <Icon size={20} strokeWidth={g.active ? 2 : 1.5} />
                </button>

                {/* Flyout panel */}
                {hoveredGroup === g.label && (
                  <div
                    className="absolute left-full top-0 ml-1 w-48 bg-[#1E293B] rounded-lg shadow-2xl border border-slate-700 py-1.5 z-50"
                    onMouseEnter={() => setHoveredGroup(g.label)}
                    onMouseLeave={() => setHoveredGroup(null)}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      {g.label}
                    </div>
                    {navGroups.find((ng) => ng.label === g.label)?.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`
                            flex items-center gap-2.5 px-3 py-2 text-[13px] no-underline transition-colors
                            ${active ? "text-emerald-400 bg-emerald-500/10" : "text-slate-300 hover:bg-white/5 hover:text-white"}
                          `}
                        >
                          <ItemIcon size={15} strokeWidth={1.5} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom icons */}
        <div className="flex flex-col items-center gap-1 w-full px-2 border-t border-slate-800 pt-2">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center justify-center py-2 rounded-lg transition-all no-underline ${active ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
                title={item.label}
              >
                <Icon size={18} strokeWidth={1.5} />
              </Link>
            );
          })}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center py-2 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-colors"
            title="Sign out"
          >
            <LogOut size={18} strokeWidth={1.5} />
          </button>
        </div>
      </aside>

      {/* Content area */}
      <div className="md:ml-[60px] flex-1 min-h-screen">
        {children}
      </div>
    </div>
  );
}
