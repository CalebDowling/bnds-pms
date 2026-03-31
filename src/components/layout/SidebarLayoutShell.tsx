"use client";

import { type ReactNode, useState, useEffect } from "react";
import SidebarProvider, {
  useSidebar,
} from "@/components/providers/SidebarProvider";
import SidebarNew from "@/components/layout/SidebarNew";
import SidebarDark from "@/components/layout/SidebarDark";
import HeaderNew from "@/components/layout/HeaderNew";
import TopNavLayout from "@/components/layout/TopNavLayout";
import IconRailLayout from "@/components/layout/IconRailLayout";
import LayoutSwitcher, {
  useLayoutOption,
  type LayoutOption,
} from "@/components/layout/LayoutSwitcher";

export default function SidebarLayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  const [layout, setLayout] = useLayoutOption();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  return (
    <>
      {layout === "C" ? (
        <TopNavLayout>{children}</TopNavLayout>
      ) : layout === "D" ? (
        <IconRailLayout>{children}</IconRailLayout>
      ) : (
        <SidebarProvider>
          <SidebarContent layout={layout}>{children}</SidebarContent>
        </SidebarProvider>
      )}
      <LayoutSwitcher current={layout} onChange={setLayout} />
    </>
  );
}

function SidebarContent({
  layout,
  children,
}: {
  layout: LayoutOption;
  children: ReactNode;
}) {
  const { collapsed } = useSidebar();

  return (
    <>
      {layout === "B" ? <SidebarDark /> : <SidebarNew />}
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
