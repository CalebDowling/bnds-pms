"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "@/components/providers/SidebarProvider";
import ColorThemePicker from "@/components/ui/ColorThemePicker";
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
      className="fixed left-0 top-0 h-screen z-40 flex flex-col border-r transition-all duration-300 ease-in-out hidden md:flex"
      style={{
        width: collapsed ? 64 : 256,
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="h-14 flex items-center border-b flex-shrink-0 overflow-hidden px-3" style={{ borderColor: "var(--border)" }}>
        <Link href="/dashboard" className="flex items-center gap-2.5 no-underline min-w-0">
          <Image
            src="/logo.webp"
            alt="Boudreaux's New Drug Store"
            width={32}
            height={32}
            className="flex-shrink-0 rounded"
          />
          {!collapsed && (
            <div className="transition-opacity duration-300">
              <div className="text-sm font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
                Boudreaux&apos;s
              </div>
              <div className="text-[10px] -mt-0.5" style={{ color: "var(--text-muted)" }}>
                NEW DRUG STORE
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-5" : ""}>
            {group.label && !collapsed && (
              <div
                className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] transition-opacity duration-300"
                style={{ color: "var(--text-muted)" }}
              >
                {group.label}
              </div>
            )}
            {group.label && collapsed && (
              <div className="mx-auto my-2 w-6 border-t" style={{ borderColor: "var(--border)" }} />
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
                  `}
                  style={{
                    backgroundColor: active ? "var(--green-100)" : undefined,
                    color: active ? "var(--color-primary)" : "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "var(--green-50)";
                      (e.currentTarget as HTMLElement).style.color = "var(--color-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }
                  }}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={17} strokeWidth={active ? 2 : 1.5} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {active && !collapsed && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                      style={{ backgroundColor: "var(--color-primary)" }}
                    />
                  )}
                  {collapsed && (
                    <div
                      className="absolute left-full ml-2 top-1/2 -translate-y-1/2 text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 border"
                      style={{
                        backgroundColor: "var(--card-bg)",
                        color: "var(--text-primary)",
                        borderColor: "var(--border)",
                        boxShadow: "var(--shadow-md)",
                      }}
                    >
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
      <div className="flex-shrink-0 border-t" style={{ borderColor: "var(--border)" }}>
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
                `}
                style={{
                  backgroundColor: active ? "var(--green-100)" : undefined,
                  color: active ? "var(--color-primary)" : "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--green-50)";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  }
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={17} strokeWidth={active ? 2 : 1.5} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {collapsed && (
                  <div
                    className="absolute left-full ml-2 top-1/2 -translate-y-1/2 text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 border"
                    style={{
                      backgroundColor: "var(--card-bg)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border)",
                      boxShadow: "var(--shadow-md)",
                    }}
                  >
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Theme Color Picker */}
        {!collapsed && (
          <div className="px-3 py-2 border-t" style={{ borderColor: "var(--border)" }}>
            <ColorThemePicker />
          </div>
        )}

        {/* Sign out + toggle */}
        <div className="px-2 py-2 border-t flex items-center gap-1" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-3 rounded-md text-[13px] transition-colors cursor-pointer border-none bg-transparent ${collapsed ? "justify-center px-2 py-2 flex-1" : "px-3 py-2 flex-1"}`}
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--color-danger)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
            }}
            aria-label="Sign out"
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut size={16} strokeWidth={1.5} className="flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
          <button
            onClick={toggle}
            className="p-2 rounded-md transition-colors cursor-pointer border-none bg-transparent"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--color-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
