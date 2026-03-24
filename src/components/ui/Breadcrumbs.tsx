"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

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

export default function Breadcrumbs() {
  const pathname = usePathname();

  // Don't show on dashboard root
  if (pathname === "/dashboard" || pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items
  const items = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;
    // Skip UUID-like segments in label but keep in path
    const isId = /^[0-9a-f-]{8,}$/i.test(segment) || /^\d+$/.test(segment);
    const label = isId ? `#${segment.slice(0, 8)}...` : getLabel(segment);

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
