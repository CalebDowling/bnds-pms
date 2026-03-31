"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/components/providers/PermissionsProvider";
import { getQueueCounts } from "@/app/(dashboard)/dashboard/actions";
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
  ChevronDown,
  Search,
  Bell,
  Plus,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavDropdown {
  label: string;
  items: NavItem[];
}

const navDropdowns: NavDropdown[] = [
  {
    label: "Workflow",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Patients", href: "/patients", icon: Users },
      { label: "Prescriptions", href: "/prescriptions", icon: Pill },
      { label: "eRx Intake", href: "/intake", icon: Inbox },
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

interface QueueCount {
  label: string;
  status: string;
  count: number;
}

const defaultQueues: QueueCount[] = [
  { label: "Intake", status: "intake", count: 0 },
  { label: "Verify", status: "verify", count: 0 },
  { label: "Print", status: "print", count: 0 },
  { label: "Waiting", status: "waiting_bin", count: 0 },
];

export default function TopNavLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { canAccess } = usePermissions();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [user, setUser] = useState<{ firstName: string; lastName: string } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [queues, setQueues] = useState<QueueCount[]>(defaultQueues);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser?.user_metadata) {
        setUser({
          firstName: authUser.user_metadata.first_name || authUser.email?.split("@")[0] || "User",
          lastName: authUser.user_metadata.last_name || "",
        });
      }
    });
  }, []);

  useEffect(() => {
    setIsDarkMode(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  useEffect(() => {
    getQueueCounts().then((counts) => {
      setQueues((prev) => prev.map((q) => ({ ...q, count: counts[q.status as keyof typeof counts] ?? 0 })));
    });
    const interval = setInterval(() => {
      getQueueCounts().then((counts) => {
        setQueues((prev) => prev.map((q) => ({ ...q, count: counts[q.status as keyof typeof counts] ?? 0 })));
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/notifications/unread-count").then((r) => r.ok ? r.json() : null).then((d) => d && setUnreadCount(d.unreadCount || 0)).catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/notifications/unread-count").then((r) => r.ok ? r.json() : null).then((d) => d && setUnreadCount(d.unreadCount || 0)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("theme", newTheme);
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = user ? `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() : "U";

  function isActiveGroup(items: NavItem[]) {
    return items.some((item) => {
      if (item.href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
      return pathname === item.href || pathname.startsWith(item.href + "/");
    });
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#0F172A] border-b border-gray-200 dark:border-gray-800">
        {/* Primary nav */}
        <div className="flex items-center h-14 px-4 gap-2" ref={dropdownRef}>
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 no-underline mr-4 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#40721d] to-[#5a9f2a] flex items-center justify-center text-white font-bold text-sm">
              B
            </div>
            <span className="hidden xl:block text-sm font-bold text-gray-900 dark:text-white">BNDS Pharmacy</span>
          </Link>

          {/* Nav dropdowns */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navDropdowns.map((dd) => (
              <div key={dd.label} className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === dd.label ? null : dd.label)}
                  className={`
                    flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors
                    ${isActiveGroup(dd.items) ? "text-[#40721d] dark:text-emerald-400 bg-[#40721d]/8 dark:bg-emerald-400/10" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"}
                  `}
                >
                  {dd.label}
                  <ChevronDown size={12} className={`transition-transform ${openDropdown === dd.label ? "rotate-180" : ""}`} />
                </button>

                {openDropdown === dd.label && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                    {dd.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) || (item.href === "/dashboard" && (pathname === "/dashboard" || pathname === "/"));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenDropdown(null)}
                          className={`flex items-center gap-2.5 px-3 py-2 text-[13px] no-underline transition-colors ${active ? "bg-[#40721d]/8 text-[#40721d] dark:bg-emerald-400/10 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                        >
                          <Icon size={15} strokeWidth={1.5} className="flex-shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Queue pills */}
          <div className="hidden lg:flex items-center gap-1 mr-2">
            {queues.map((q) => (
              <Link
                key={q.status}
                href={`/queue?status=${q.status}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold no-underline ${q.count > 0 ? "bg-[#40721d]/10 text-[#40721d] dark:bg-emerald-400/10 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}
              >
                <span className="font-mono">{q.count}</span>
                {q.label}
              </Link>
            ))}
          </div>

          {/* Search */}
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          >
            <Search size={13} />
            <span className="hidden lg:inline text-xs">Search...</span>
            <kbd className="hidden lg:inline text-[9px] font-mono px-1 py-0.5 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-400">&#8984;K</kbd>
          </button>

          {/* New Rx */}
          {canAccess("prescriptions", "write") && (
            <Link href="/prescriptions/new" className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#40721d] hover:bg-[#365e17] text-white no-underline transition-colors">
              <Plus size={13} strokeWidth={2.5} />
              <span className="hidden xl:inline">New Rx</span>
            </Link>
          )}

          {/* Bell */}
          <button className="relative p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Notifications">
            <Bell size={16} />
            {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </button>

          {/* Theme */}
          <button onClick={toggleTheme} className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle theme">
            {isDarkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} />}
          </button>

          {/* User + Admin links */}
          <div className="flex items-center gap-1 pl-2 border-l border-gray-200 dark:border-gray-700">
            <Link href="/settings" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors no-underline" title="Settings">
              <Settings size={15} />
            </Link>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#40721d] to-[#5a9f2a] text-white flex items-center justify-center text-[10px] font-bold cursor-pointer" title={user ? `${user.firstName} ${user.lastName}` : "User"}>
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      {children}
    </div>
  );
}
