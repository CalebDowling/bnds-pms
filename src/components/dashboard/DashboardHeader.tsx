"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/components/providers/PermissionsProvider";
import { Sun, Moon, Bell, Plus, Package, Clock, Pill, XCircle } from "lucide-react";

interface UserInfo {
  firstName: string;
  lastName: string;
  isPharmacist: boolean;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const navTabs = [
  { label: "Workflow", href: "/dashboard" },
  { label: "Phone", href: "/phone" },
  { label: "Reports", href: "/reports", resource: "reports" as const, action: "read" as const },
  { label: "Settings", href: "/settings", resource: "settings" as const, action: "read" as const },
];

export default function DashboardHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { canAccess } = usePermissions();

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications/unread-count");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await fetch("/api/notifications?limit=10&unreadOnly=true");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Mark notifications as read
  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds }),
      });
      fetchUnreadCount();
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      fetchUnreadCount();
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initial load
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser?.user_metadata) {
        setUser({
          firstName: authUser.user_metadata.first_name || authUser.email?.split("@")[0] || "User",
          lastName: authUser.user_metadata.last_name || "",
          isPharmacist: true,
        });
      }
    });

    fetchUnreadCount();

    // Poll for unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Initialize theme and handle toggle
  useEffect(() => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const newTheme = isDarkMode ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("theme", newTheme);
  };

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : "User";
  const initials = user
    ? `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase()
    : "U";

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="navbar-glass border-b border-gray-200 dark:border-gray-700">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-[56px]">
        {/* Left: Logo */}
        <Link href="/dashboard" className="flex items-center no-underline">
          <img src="/logo.webp" alt="Boudreaux's New Drug Store" className="h-[40px] md:h-[40px] sm:h-[32px]" />
        </Link>

        {/* Center: Nav tabs - hidden on mobile */}
        <nav className="hidden sm:flex items-center gap-1">
          {navTabs.map((tab) => {
            // Check if tab has permission requirements
            if (tab.resource && !canAccess(tab.resource, tab.action)) {
              return null;
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 rounded-lg text-[13px] font-semibold no-underline transition-all ${
                  isActive(tab.href)
                    ? "text-[#40721d] dark:text-[#6bb240] font-semibold border-b-2 border-[#40721d] dark:border-[#6bb240]"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions + User */}
        <div className="flex items-center gap-3">
          {canAccess("prescriptions", "write") && (
            <Link
              href="/prescriptions/new"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-xs font-bold bg-gradient-to-r from-[#40721d] to-[#5a9f2a] hover:from-[#36631a] hover:to-[#4f8925] text-white no-underline transition-all shadow-md hover:shadow-lg hover:scale-105"
            >
              <Plus size={14} strokeWidth={2.5} />
              New Prescription
            </Link>
          )}

          {/* Notification bell */}
          <div
            ref={notificationRef}
            className="relative"
            title="Notifications"
          >
            <button
              onClick={() => {
                setShowNotificationDropdown(!showNotificationDropdown);
                if (!showNotificationDropdown) {
                  fetchNotifications();
                }
              }}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={16} className="text-gray-700 dark:text-gray-300" />
              {unreadCount > 0 && (
                <div className="absolute top-[3px] right-[3px] w-5 h-5 rounded-full bg-[#E74C3C] border-2 border-white dark:border-gray-700 flex items-center justify-center text-white text-[10px] font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotificationDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-600">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Notifications list */}
                <div className="max-h-96 overflow-y-auto dark:bg-gray-800">
                  {loadingNotifications ? (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No unread notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-gray-100 dark:border-gray-700 ${
                          !notification.isRead ? "bg-blue-50 dark:bg-blue-900/20" : ""
                        }`}
                        onClick={() => {
                          if (!notification.isRead) {
                            handleMarkAsRead([notification.id]);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon based on type */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white" style={{
                            backgroundColor: notification.type === "low_stock" ? "#FFA500" :
                                           notification.type === "expiring_lot" ? "#FF4444" :
                                           notification.type === "refill_due" ? "#4CAF50" :
                                           notification.type === "claim_rejected" ? "#FF6B6B" : "#666"
                          }}>
                            {notification.type === "low_stock" && <Package size={14} />}
                            {notification.type === "expiring_lot" && <Clock size={14} />}
                            {notification.type === "refill_due" && <Pill size={14} />}
                            {notification.type === "claim_rejected" && <XCircle size={14} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {new Date(notification.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          {!notification.isRead && (
                            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <Link
                  href="/notifications"
                  className="block px-4 py-3 text-center text-sm font-semibold text-[#40721d] dark:text-[#6bb240] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-700"
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>

          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle theme"
            title="Toggle dark mode"
          >
            {isDarkMode ? (
              <Sun size={16} className="text-yellow-400" />
            ) : (
              <Moon size={16} className="text-gray-700" />
            )}
          </button>

          {/* User */}
          <div className="flex items-center gap-2 text-[13px] cursor-pointer px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-[#40721d] to-[#5a9f2a] text-white flex items-center justify-center text-xs font-bold border border-[#40721d]/30">
              {initials}
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-medium text-gray-900 dark:text-white">{displayName}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
