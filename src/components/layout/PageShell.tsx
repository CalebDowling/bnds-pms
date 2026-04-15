import type { ReactNode } from "react";

/**
 * PageShell — the unified outer wrapper for every landing page.
 *
 * Provides consistent outer padding, max-width, header row, and optional
 * stats/toolbar slots. The dashboard layout already renders breadcrumbs
 * above the main content, so PageShell does not render them itself.
 *
 * Usage:
 *   <PageShell
 *     title="Patients"
 *     subtitle="All patients on file"
 *     actions={<Button>Add Patient</Button>}
 *     stats={<StatsRow stats={...} />}
 *     toolbar={<FilterBar search={...} filters={...} />}
 *   >
 *     <PatientsTable data={...} />
 *   </PageShell>
 *
 * Use `maxWidth="full"` for live dashboards (Phone) that need full-bleed.
 */
export interface PageShellProps {
  /** Main page title — renders with .page-title class (22px / 800) */
  title: string;
  /** Optional subtitle below the title — renders with .page-subtitle class */
  subtitle?: string;
  /** Right-aligned action slot in the header row (buttons, dropdowns, etc.) */
  actions?: ReactNode;
  /** Optional StatsRow slot between the header and toolbar */
  stats?: ReactNode;
  /** Optional FilterBar / toolbar slot between stats and content */
  toolbar?: ReactNode;
  /** Main content — tables, lists, cards, etc. */
  children: ReactNode;
  /** "7xl" (default, max-w-7xl) or "full" for full-bleed dashboards */
  maxWidth?: "7xl" | "full";
  /** Optional icon displayed next to the title in a tinted badge */
  icon?: ReactNode;
  /** Optional accent color for the title icon badge */
  iconAccent?: string;
}

export default function PageShell({
  title,
  subtitle,
  actions,
  stats,
  toolbar,
  children,
  maxWidth = "7xl",
  icon,
  iconAccent,
}: PageShellProps) {
  const widthClass = maxWidth === "full" ? "max-w-full" : "max-w-7xl mx-auto";

  return (
    <div className={`${widthClass} px-6 py-6 space-y-6`}>
      {/* Header row: title + subtitle | actions */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
              style={{ backgroundColor: iconAccent ?? "var(--color-primary)" }}
              aria-hidden
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="page-title truncate">{title}</h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </header>

      {/* Optional stats row */}
      {stats}

      {/* Optional filter/toolbar */}
      {toolbar}

      {/* Main content */}
      <div>{children}</div>
    </div>
  );
}
