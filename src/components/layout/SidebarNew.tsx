"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "@/components/providers/SidebarProvider";
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
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

// ── Navigation structure ──

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string | null; // null = no header (top group)
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Patients", href: "/patients", icon: Users },
      { label: "Prescriptions", href: "/prescriptions", icon: Pill },
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

// ── Sidebar component ──

export default function SidebarNew() {
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
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    // Exact match or child route
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ease-in-out hidden md:flex"
      style={{
        width: collapsed ? 64 : 232,
        // Paper-green sidebar background per BNDS PMS Redesign — sits between
        // the warm paper page background and the white content cards, so the
        // sidebar reads as part of the chrome without feeling heavy.
        backgroundColor: "#eef3e9",
        borderRight: "1px solid #d9e2d1",
      }}
      aria-label="Main navigation"
    >
      {/* ── Logo ── */}
      <div className="h-14 flex items-center flex-shrink-0 overflow-hidden px-3" style={{ borderBottom: "1px solid #d9e2d1" }}>
        <Link href="/dashboard" className="flex items-center gap-2 no-underline min-w-0">
          {collapsed ? (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
              style={{
                backgroundColor: "#1f5a3a",
                fontFamily: "var(--font-serif), 'Source Serif 4', Georgia, serif",
              }}
            >
              B
            </div>
          ) : (
            <img
              src="/logo.webp"
              alt="Boudreaux's"
              className="h-9 transition-opacity duration-300"
            />
          )}
        </Link>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {/* Group header */}
            {group.label && !collapsed && (
              <div
                className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest transition-opacity duration-300"
                style={{ color: "#7a8a78", letterSpacing: "0.14em" }}
              >
                {group.label}
              </div>
            )}
            {group.label && collapsed && (
              <div className="mx-auto my-2 w-6 border-t" style={{ borderColor: "#d9e2d1" }} />
            )}

            {/* Items */}
            {group.items.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* ── Bottom section ── */}
      <div className="flex-shrink-0" style={{ borderTop: "1px solid #d9e2d1" }}>
        {/* Bottom nav items */}
        <div className="py-2 px-2 space-y-0.5">
          {bottomItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Sign out */}
        <div className="px-2 py-2" style={{ borderTop: "1px solid #d9e2d1" }}>
          <button
            onClick={handleSignOut}
            className={`
              w-full flex items-center gap-3 rounded-lg
              text-sm cursor-pointer border-none bg-transparent
              transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
              ${collapsed ? "justify-center px-2 py-2" : "px-3 py-2"}
            `}
            style={{ color: "#5a6b58" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-danger)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#5a6b58"; }}
            aria-label="Sign out"
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut size={18} strokeWidth={1.75} className="flex-shrink-0" />
            {!collapsed && (
              <span className="transition-opacity duration-300">Sign out</span>
            )}
          </button>
        </div>

        {/* Toggle button */}
        <div className="px-2 py-2" style={{ borderTop: "1px solid #d9e2d1" }}>
          <button
            onClick={toggle}
            className={`
              w-full flex items-center gap-3 rounded-lg
              text-sm cursor-pointer border-none bg-transparent
              transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
              ${collapsed ? "justify-center px-2 py-2" : "px-3 py-2"}
            `}
            style={{ color: "#5a6b58" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#1f5a3a"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#5a6b58"; }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={18} strokeWidth={1.75} />
            ) : (
              <>
                <ChevronLeft size={18} strokeWidth={1.75} className="flex-shrink-0" />
                <span className="transition-opacity duration-300">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Sidebar link with tooltip ──

function SidebarLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`
        group relative flex items-center gap-3 rounded-lg text-sm
        transition-colors duration-150 no-underline
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5a3a]
        ${collapsed ? "justify-center px-2 py-2" : "px-3 py-2"}
      `}
      style={{
        backgroundColor: active ? "#cfe0c0" : "transparent",
        color: active ? "#0f2e1f" : "#3a4a3c",
        border: active ? "1px solid #b6cba2" : "1px solid transparent",
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.backgroundColor = "#e3ecda";
          (e.currentTarget as HTMLElement).style.color = "#1f5a3a";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
          (e.currentTarget as HTMLElement).style.color = "#3a4a3c";
        }
      }}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        size={18}
        strokeWidth={active ? 2 : 1.75}
        className="flex-shrink-0"
      />
      {!collapsed && (
        <span className="truncate transition-opacity duration-300">
          {item.label}
        </span>
      )}

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div
          className="absolute left-full ml-2 top-1/2 -translate-y-1/2 text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50"
          style={{
            backgroundColor: "#0f2e1f",
            color: "#faf8f4",
            border: "1px solid #174530",
            boxShadow: "0 6px 16px rgba(15, 46, 31, 0.18)",
          }}
          role="tooltip"
        >
          {item.label}
        </div>
      )}
    </Link>
  );
}

