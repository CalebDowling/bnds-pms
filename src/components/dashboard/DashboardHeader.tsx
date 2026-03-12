"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface UserInfo {
  firstName: string;
  lastName: string;
  isPharmacist: boolean;
}

export default function DashboardHeader() {
  const [user, setUser] = useState<UserInfo | null>(null);

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
  const roleLabel = user?.isPharmacist ? "Pharmacist" : "Staff";

  return (
    <>
      <header className="flex items-center justify-between bg-[var(--card-bg)] px-6 h-[60px]">
        <Link href="/dashboard" className="flex items-center">
          <img src="/logo.webp" alt="Boudreaux's New Drug Store" className="h-[38px]" />
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-[var(--green-50)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--green-100)] transition-colors" title="Help">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="relative w-9 h-9 rounded-full bg-[var(--green-50)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--green-100)] transition-colors" title="Notifications">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <div className="absolute top-[5px] right-[5px] w-2 h-2 rounded-full bg-[var(--red-600)] border-2 border-white" />
          </div>
          <div className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--text-secondary)] cursor-pointer px-2 py-1 rounded-lg hover:bg-[var(--green-50)] transition-colors">
            <div className="w-[34px] h-[34px] rounded-full bg-[var(--green-700)] text-white flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="leading-tight">
              <div>{displayName}</div>
              <div className="text-[11px] text-[var(--text-muted)] font-normal">{roleLabel}</div>
            </div>
          </div>
        </div>
      </header>
      <div className="h-[3px] bg-gradient-to-r from-[var(--green-700)] via-[var(--green-600)] to-[var(--green-700)]" />
    </>
  );
}
