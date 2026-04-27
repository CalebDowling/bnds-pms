"use client";

import { type ReactNode } from "react";
import SidebarProvider, {
  useSidebar,
} from "@/components/providers/SidebarProvider";
import SidebarNew from "@/components/layout/SidebarNew";
import HeaderNew from "@/components/layout/HeaderNew";

/**
 * App chrome wrapper. Renders the BNDS PMS Redesign sidebar (paper-green) and
 * topbar around all dashboard pages. Alternate layouts (dark sidebar, top nav,
 * icon rail) were removed during the redesign — there is one canonical chrome.
 *
 * NOTE: there used to be an `if (!hydrated) return null` gate here that
 * suppressed the chrome until the client mounted. That pattern caused a
 * silent navigation lockup on prescription detail pages under Next 16 +
 * React 19: clicking a sidebar tab from /prescriptions/[id] would call
 * router.push, fetch the new RSC, but never commit the transition — the
 * URL stayed put with no error. Removing the gate (here and in
 * SidebarProvider) restores commit. The redesign sidebar reads its
 * collapsed state from localStorage in an effect, which is fine to do
 * after first paint.
 */
export default function SidebarLayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <SidebarContent>{children}</SidebarContent>
    </SidebarProvider>
  );
}

function SidebarContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <>
      <SidebarNew />
      <style>{`
        .sidebar-main-area {
          margin-left: 0;
        }
        @media (min-width: 768px) {
          .sidebar-main-area {
            margin-left: ${collapsed ? 64 : 232}px;
          }
        }
      `}</style>
      <div className="sidebar-main-area min-h-screen transition-all duration-300 ease-in-out">
        <HeaderNew />
        {children}
      </div>
    </>
  );
}
