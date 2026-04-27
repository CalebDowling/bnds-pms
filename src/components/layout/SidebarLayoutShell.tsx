"use client";

import { type ReactNode, useState, useEffect } from "react";
import SidebarProvider, {
  useSidebar,
} from "@/components/providers/SidebarProvider";
import SidebarNew from "@/components/layout/SidebarNew";
import HeaderNew from "@/components/layout/HeaderNew";

/**
 * App chrome wrapper. Renders the BNDS PMS Redesign sidebar (paper-green) and
 * topbar around all dashboard pages. Alternate layouts (dark sidebar, top nav,
 * icon rail) were removed during the redesign — there is one canonical chrome.
 */
export default function SidebarLayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

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
