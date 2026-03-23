"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/* ── Navigation structure matching DRX portal layout ── */
interface NavChild {
  label: string;
  href: string;
  badge?: boolean;
}

interface NavSection {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavChild[];
  badge?: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    href: "/portal/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Patients",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    children: [
      { label: "Patient List", href: "/portal/patients" },
      { label: "Refill Requests", href: "/portal/refills", badge: true },
      { label: "New Order", href: "/portal/orders/new" },
      { label: "Order History", href: "/portal/orders" },
      { label: "Pending Orders", href: "/portal/orders?status=pending", badge: true },
    ],
  },
  {
    label: "Billing",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    children: [
      { label: "Accounts", href: "/portal/billing" },
      { label: "Payment Methods", href: "/portal/billing?tab=payment-methods" },
    ],
  },
  {
    label: "Messages",
    href: "/portal/messages",
    badge: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    label: "Training",
    href: "/portal/training",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    label: "Help",
    href: "/portal/settings",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

/* ── CSS Animations ── */
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-16px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(16px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(64, 114, 29, 0.15); }
    50% { box-shadow: 0 0 0 6px rgba(64, 114, 29, 0); }
  }
  .animate-fadeIn { animation: fadeIn 0.4s ease-out both; }
  .animate-fadeIn-delay-1 { animation: fadeIn 0.4s ease-out 0.05s both; }
  .animate-fadeIn-delay-2 { animation: fadeIn 0.4s ease-out 0.1s both; }
  .animate-fadeIn-delay-3 { animation: fadeIn 0.4s ease-out 0.15s both; }
  .animate-fadeIn-delay-4 { animation: fadeIn 0.4s ease-out 0.2s both; }
  .animate-slideInLeft { animation: slideInLeft 0.35s ease-out both; }
  .animate-slideInRight { animation: slideInRight 0.35s ease-out both; }
  .animate-scaleIn { animation: scaleIn 0.3s ease-out both; }
  .animate-pulseGlow { animation: pulseGlow 2s ease-in-out infinite; }

  /* Sidebar nav hover effect */
  .nav-item {
    position: relative;
    transition: all 0.2s ease;
  }
  .nav-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%) scaleY(0);
    width: 3px;
    height: 60%;
    background: #40721D;
    border-radius: 0 4px 4px 0;
    transition: transform 0.2s ease;
  }
  .nav-item:hover::before,
  .nav-item.active::before {
    transform: translateY(-50%) scaleY(1);
  }

  /* Card hover lift */
  .card-hover {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 10px -5px rgba(0, 0, 0, 0.04);
  }

  /* Page transition */
  .page-content {
    animation: fadeIn 0.3s ease-out both;
  }
`;

/* ── Expandable sidebar section ── */
function SidebarSection({
  section,
  pathname,
  closeSidebar,
}: {
  section: NavSection;
  pathname: string;
  closeSidebar: () => void;
}) {
  const hasChildren = section.children && section.children.length > 0;
  const isChildActive = hasChildren
    ? section.children!.some(
        (c) => pathname === c.href || pathname.startsWith(c.href.split("?")[0])
      )
    : false;
  const isDirectActive = section.href
    ? pathname === section.href || pathname.startsWith(section.href)
    : false;
  const isActive = isDirectActive || isChildActive;

  const [expanded, setExpanded] = useState(isChildActive);

  // Auto-expand when a child is active
  useEffect(() => {
    if (isChildActive) setExpanded(true);
  }, [isChildActive]);

  if (!hasChildren && section.href) {
    return (
      <Link
        href={section.href}
        onClick={closeSidebar}
        className={`nav-item flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13.5px] font-medium transition-all ${
          isActive
            ? "active bg-[#40721D]/8 text-[#40721D]"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <span className={isActive ? "text-[#40721D]" : "text-gray-400"}>{section.icon}</span>
        <span className="flex-1">{section.label}</span>
        {section.badge && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#40721D] text-[10px] font-bold text-white animate-pulseGlow">
            !
          </span>
        )}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13.5px] font-medium transition-all ${
          isActive
            ? "active bg-[#40721D]/8 text-[#40721D]"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <span className={isActive ? "text-[#40721D]" : "text-gray-400"}>{section.icon}</span>
        <span className="flex-1 text-left">{section.label}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Children with slide animation */}
      <div
        className="overflow-hidden transition-all duration-250 ease-in-out"
        style={{
          maxHeight: expanded ? `${section.children!.length * 40}px` : "0px",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="ml-8 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
          {section.children!.map((child) => {
            const childBase = child.href.split("?")[0];
            const childActive = pathname === child.href || pathname === childBase;

            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={closeSidebar}
                className={`flex items-center gap-2 px-3 py-[7px] rounded-md text-[13px] transition-all ${
                  childActive
                    ? "text-[#40721D] font-semibold bg-[#40721D]/5"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                <span className="flex-1">{child.label}</span>
                {child.badge && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
                    3
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Main Layout ── */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prescriberName, setPrescriberName] = useState("");

  const isLoginPage =
    pathname === "/portal" ||
    pathname === "/portal/login" ||
    pathname === "/portal/register";

  useEffect(() => {
    if (!isLoginPage) {
      const name = localStorage.getItem("prescriber_name") || "Prescriber";
      setPrescriberName(name);
    }
  }, [isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    localStorage.removeItem("prescriber_token");
    localStorage.removeItem("prescriber_name");
    try {
      const res = await fetch("/api/prescriber-portal/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/portal");
        return;
      }
    } catch {
      // Fall through
    }
    router.push("/portal");
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />

      <div className="min-h-screen flex bg-[#f8f9fb]">
        {/* ── Sidebar ── */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-[260px] bg-white border-r border-gray-200/80 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
            sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
        >
          {/* Brand */}
          <div className="h-[60px] flex items-center gap-3 px-5 border-b border-gray-100 shrink-0">
            <div className="w-9 h-9 bg-[#40721D] rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-gray-900 tracking-tight truncate leading-tight">
                Boudreaux&apos;s New Drug Store
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_SECTIONS.map((section) => (
              <SidebarSection
                key={section.label}
                section={section}
                pathname={pathname}
                closeSidebar={() => setSidebarOpen(false)}
              />
            ))}
          </nav>

          {/* User */}
          <div className="border-t border-gray-100 p-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#40721D] to-[#5a9e2e] rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-bold">
                  {prescriberName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate">
                  {prescriberName}
                </p>
                <button
                  onClick={handleLogout}
                  className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                >
                  Sign Out
                </button>
              </div>
              <Link
                href="/portal/settings"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-20 lg:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-[60px] bg-white border-b border-gray-200/80 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 shrink-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Center branding */}
            <div className="hidden lg:flex items-center gap-2 text-gray-400 text-[12.5px]">
              <span>Powered by</span>
              <span className="font-bold text-gray-700 text-[14px] tracking-tight">DRX</span>
              <span>Pharmacy Software</span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <Link
                href="/portal/orders/new"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-[#40721D] text-white text-[13px] font-medium rounded-lg hover:bg-[#355f1a] active:scale-[0.98] transition-all shadow-sm hover:shadow"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Order
              </Link>

              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User name (desktop) */}
              <div className="hidden md:flex items-center gap-2 pl-3 border-l border-gray-200">
                <span className="text-[13px] font-medium text-gray-700">{prescriberName}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </header>

          {/* Page content with fade animation */}
          <main className="flex-1 p-4 lg:p-6 page-content">{children}</main>

          {/* Footer */}
          <footer className="border-t border-gray-200/80 bg-white px-4 lg:px-6 py-3 shrink-0">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>Boudreaux&apos;s New Drug Store Pharmacy</span>
              <span className="hidden sm:inline">(337) 233-8468</span>
              <span className="hidden sm:inline">Prescriber Portal v1.0</span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
