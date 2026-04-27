"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = "bnds-sidebar-collapsed";

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return ctx;
}

export default function SidebarProvider({ children }: { children: ReactNode }) {
  // IMPORTANT: this provider must always render its children — the `if
  // (!hydrated) return null` pattern that used to live here interacts
  // badly with Next 16 + React 19's router transitions. When a route
  // change is in flight, returning null aborts the commit silently,
  // leaving `router.push()` jammed (no URL change, no error). The
  // walkthrough symptom was "open any prescription, click a sidebar
  // tab, nothing happens." Render the chrome unconditionally; the
  // localStorage value syncs in via an effect on mount, with a tiny
  // (~1 frame) flash from expanded → collapsed if the user had it
  // collapsed. That's a much better trade than a frozen router.
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") {
        setCollapsedState(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      localStorage.setItem(STORAGE_KEY, String(v));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}
