"use client";

import { type ReactNode } from "react";
import SidebarProvider, {
  useSidebar,
} from "@/components/providers/SidebarProvider";
import SidebarNew from "@/components/layout/SidebarNew";
import HeaderNew from "@/components/layout/HeaderNew";

/**
 * Client-side layout shell that provides the sidebar + header.
 * Wraps the main content area and adjusts margin based on sidebar state.
 */
export default function SidebarLayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <SidebarNew />
      <MainArea>{children}</MainArea>
    </SidebarProvider>
  );
}

function MainArea({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <>
      {/* Inline style for dynamic sidebar margin; CSS class zeroes it on mobile */}
      <style>{`
        .sidebar-main-area {
          margin-left: 0;
        }
        @media (min-width: 768px) {
          .sidebar-main-area {
            margin-left: ${collapsed ? 64 : 256}px;
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
