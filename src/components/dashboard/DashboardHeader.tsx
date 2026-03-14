"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/components/providers/PermissionsProvider";

interface UserInfo {
  firstName: string;
  lastName: string;
  isPharmacist: boolean;
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
  const { canAccess } = usePermissions();

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
          <div className="relative w-8 h-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors" title="Notifications">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <div className="absolute top-[3px] right-[3px] w-2 h-2 rounded-full bg-[#E74C3C] border-2 border-[#2D5114]" />
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
