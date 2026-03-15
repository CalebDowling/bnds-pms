"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/components/providers/PermissionsProvider";

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

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : "User";
  const initials = user
    ? `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase()
    : "U";

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="bg-[#2D5114] text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-[56px]">
        {/* Left: Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 no-underline">
          <img src="/logo.webp" alt="Boudreaux's New Drug Store" className="h-[36px] brightness-0 invert" />
        </Link>

        {/* Center: Nav tabs */}
        <nav className="flex items-center gap-1">
          {navTabs.map((tab) => {
            // Check if tab has permission requirements
            if (tab.resource && !canAccess(tab.resource, tab.action)) {
              return null;
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-1.5 rounded-md text-[13px] font-semibold no-underline transition-all ${
                  isActive(tab.href)
                    ? "bg-white/20 text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-xs font-bold bg-[#4cb868] hover:bg-[#3da557] text-white no-underline transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors relative"
              aria-label="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && (
                <div className="absolute top-[3px] right-[3px] w-5 h-5 rounded-full bg-[#E74C3C] border-2 border-[#2D5114] flex items-center justify-center text-white text-[10px] font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotificationDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 overflow-hidden">
                {/* Header */}
                <div className="bg-[#2D5114] text-white px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-white/70 hover:text-white"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Notifications list */}
                <div className="max-h-96 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="px-4 py-8 text-center text-gray-500 text-sm">
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 text-sm">
                      No unread notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                          !notification.isRead ? "bg-blue-50" : ""
                        }`}
                        onClick={() => {
                          if (!notification.isRead) {
                            handleMarkAsRead([notification.id]);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon based on type */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{
                            backgroundColor: notification.type === "low_stock" ? "#FFA500" :
                                           notification.type === "expiring_lot" ? "#FF4444" :
                                           notification.type === "refill_due" ? "#4CAF50" :
                                           notification.type === "claim_rejected" ? "#FF6B6B" : "#666"
                          }}>
                            {notification.type === "low_stock" && "📦"}
                            {notification.type === "expiring_lot" && "⏰"}
                            {notification.type === "refill_due" && "💊"}
                            {notification.type === "claim_rejected" && "❌"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-gray-900 truncate">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
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
                  className="block px-4 py-3 text-center text-sm font-semibold text-[#2D5114] hover:bg-gray-50 transition-colors border-t"
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>

          {/* User */}
          <div className="flex items-center gap-2 text-[13px] cursor-pointer px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
            <div className="w-[32px] h-[32px] rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold border border-white/30">
              {initials}
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-medium text-white">{displayName}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
