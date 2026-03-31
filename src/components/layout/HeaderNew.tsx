"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/components/providers/PermissionsProvider";
import { getQueueCounts } from "@/app/(dashboard)/dashboard/actions";
import {
  Sun,
  Moon,
  Bell,
  Plus,
  Search,
  Package,
  Clock,
  Pill,
  XCircle,
} from "lucide-react";

interface UserInfo {
  firstName: string;
  lastName: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface QueueCount {
  label: string;
  status: string;
  count: number;
  href?: string;
}

const defaultQueues: QueueCount[] = [
  { label: "Intake", status: "intake", count: 0 },
  { label: "Verify", status: "verify", count: 0 },
  { label: "Print", status: "print", count: 0 },
  { label: "Reject", status: "reject", count: 0 },
  { label: "OOS", status: "oos", count: 0 },
  { label: "Waiting", status: "waiting_bin", count: 0 },
];

export default function HeaderNew() {
  const { canAccess } = usePermissions();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [queues, setQueues] = useState<QueueCount[]>(defaultQueues);
  const notifRef = useRef<HTMLDivElement>(null);

  // ── User info ──
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser?.user_metadata) {
        setUser({
          firstName:
            authUser.user_metadata.first_name ||
            authUser.email?.split("@")[0] ||
            "User",
          lastName: authUser.user_metadata.last_name || "",
        });
      }
    });
  }, []);

  // ── Theme ──
  useEffect(() => {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const newTheme = isDarkMode ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("theme", newTheme);
  };

  // ── Queue counts ──
  useEffect(() => {
    getQueueCounts().then((counts) => {
      setQueues((prev) =>
        prev.map((q) => ({
          ...q,
          count: counts[q.status as keyof typeof counts] ?? 0,
        }))
      );
    });

    const interval = setInterval(() => {
      getQueueCounts().then((counts) => {
        setQueues((prev) =>
          prev.map((q) => ({
            ...q,
            count: counts[q.status as keyof typeof counts] ?? 0,
          }))
        );
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Notifications ──
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications?limit=10&unreadOnly=true");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkAsRead = async (ids: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: ids }),
      });
      fetchUnreadCount();
      fetchNotifications();
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      fetchUnreadCount();
      fetchNotifications();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "User";
  const initials = user
    ? `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase()
    : "U";

  const notifIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return <Package size={12} />;
      case "expiring_lot":
        return <Clock size={12} />;
      case "refill_due":
        return <Pill size={12} />;
      case "claim_rejected":
        return <XCircle size={12} />;
      default:
        return <Bell size={12} />;
    }
  };

  const notifColor = (type: string) => {
    switch (type) {
      case "low_stock":
        return "#FFA500";
      case "expiring_lot":
        return "#FF4444";
      case "refill_due":
        return "#4CAF50";
      case "claim_rejected":
        return "#FF6B6B";
      default:
        return "#666";
    }
  };

  return (
    <header
      className="sticky top-0 z-30 h-14 flex items-center justify-between gap-4 px-4 transition-all duration-300 ease-in-out"
      style={{
        backgroundColor: "var(--card-bg)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* ── Left: spacer ── */}
      <div className="flex-1" />

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* New Rx */}
        {canAccess("prescriptions", "write") && (
          <Link
            href="/prescriptions/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#40721d] to-[#5a9f2a] hover:from-[#36631a] hover:to-[#4f8925] text-white no-underline transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="hidden lg:inline">New Rx</span>
          </Link>
        )}

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) fetchNotifications();
            }}
            className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2.5 flex items-center justify-between border-b border-gray-200 dark:border-gray-600">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {loadingNotifications ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    No unread notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-2.5 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-gray-100 dark:border-gray-700 ${
                        !n.isRead ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                      onClick={() => {
                        if (!n.isRead) handleMarkAsRead([n.id]);
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white mt-0.5"
                          style={{ backgroundColor: notifColor(n.type) }}
                        >
                          {notifIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                            {n.title}
                          </h4>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(n.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {!n.isRead && (
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link
                href="/notifications"
                className="block px-4 py-2.5 text-center text-xs font-semibold text-[var(--color-primary)] dark:text-[#6bb240] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-700"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={isDarkMode ? "Light mode" : "Dark mode"}
        >
          {isDarkMode ? (
            <Sun size={16} className="text-yellow-400" />
          ) : (
            <Moon size={16} />
          )}
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#40721d] to-[#5a9f2a] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {initials}
          </div>
          <span className="hidden lg:block text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
            {displayName}
          </span>
        </div>
      </div>
    </header>
  );
}
