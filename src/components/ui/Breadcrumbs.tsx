"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Map path segments to human-readable labels
const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  patients: "Patients",
  prescriptions: "Prescriptions",
  inventory: "Inventory",
  compounding: "Compounding",
  billing: "Billing",
  reports: "Reports",
  settings: "Settings",
  phone: "Phone",
  queue: "Queue",
  pos: "Point of Sale",
  users: "Employees",
  notifications: "Notifications",
  new: "New",
  merge: "Merge",
  batches: "Batches",
  formulas: "Formulas",
  claims: "Claims",
  deliveries: "Deliveries",
  reorder: "Reorder",
  scan: "Scan",
  prescribers: "Prescribers",
  "sig-codes": "Sig Codes",
  "batch-refills": "Batch Refills",
};

function getLabel(segment: string): string {
  return LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

// ─── Per-segment label override context ────────────────────────────────
//
// Server-side detail pages know what UUID segments mean (a patient name,
// a fill descriptor, etc.) but Breadcrumbs is rendered up at the dashboard
// layout — it only sees the URL. A child page registers a friendly label
// for its segment via <BreadcrumbLabel segment={id} label={name} />, and
// Breadcrumbs renders that instead of `#abc12345...`.
//
// The override is unset on unmount so navigating away resets the map and
// the next page renders cleanly.
type LabelMap = Record<string, string>;
const BreadcrumbLabelContext = createContext<{
  overrides: LabelMap;
  setLabel: (segment: string, label: string | null) => void;
} | null>(null);

export function BreadcrumbLabelProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<LabelMap>({});
  const setLabel = useCallback((segment: string, label: string | null) => {
    setOverrides((prev) => {
      if (label == null) {
        if (!(segment in prev)) return prev;
        const next = { ...prev };
        delete next[segment];
        return next;
      }
      if (prev[segment] === label) return prev;
      return { ...prev, [segment]: label };
    });
  }, []);
  const value = useMemo(() => ({ overrides, setLabel }), [overrides, setLabel]);
  return (
    <BreadcrumbLabelContext.Provider value={value}>
      {children}
    </BreadcrumbLabelContext.Provider>
  );
}

/**
 * Register a friendly label for a path segment (typically a UUID) so the
 * breadcrumb shows e.g. "John Smith" instead of "#abc12345...".
 *
 * Renders nothing — purely a side-effect component.
 */
export function BreadcrumbLabel({ segment, label }: { segment: string; label: string }) {
  const ctx = useContext(BreadcrumbLabelContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setLabel(segment, label);
    return () => ctx.setLabel(segment, null);
  }, [ctx, segment, label]);
  return null;
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const ctx = useContext(BreadcrumbLabelContext);
  const overrides = ctx?.overrides ?? {};

  // Don't show on dashboard root
  if (pathname === "/dashboard" || pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items
  const items = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;
    // Skip UUID-like segments in label but keep in path
    const isId = /^[0-9a-f-]{8,}$/i.test(segment) || /^\d+$/.test(segment);
    // Prefer a context-supplied override (set by the detail page) over the
    // generic "#abc12345..." fallback.
    const override = overrides[segment];
    const label = override
      ? override
      : isId
      ? `#${segment.slice(0, 8)}...`
      : getLabel(segment);

    return { label, href, isLast };
  });

  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 px-6 py-2 text-xs">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors no-underline"
        aria-label="Home"
      >
        <Home size={13} />
      </Link>
      {items.map((item, i) => (
        <span key={item.href} className="flex items-center gap-1">
          <ChevronRight size={12} className="text-[var(--text-muted)]" />
          {item.isLast ? (
            <span className="font-medium text-[var(--text-primary)]" aria-current="page">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors no-underline"
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
