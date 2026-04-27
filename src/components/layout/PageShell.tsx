import type { ReactNode } from "react";

/**
 * PageShell — the unified outer wrapper for every landing page.
 *
 * BNDS PMS Redesign — page header pattern: eyebrow (sublabel) + Source Serif 4
 * h1 + ink-3 subtitle + actions. Stats and toolbar slots remain unchanged so
 * existing call sites stay compatible.
 *
 * Usage:
 *   <PageShell
 *     eyebrow="People"
 *     title="Patients"
 *     subtitle="1,284 active patients"
 *     actions={<Button>Add Patient</Button>}
 *     toolbar={<FilterBar search={...} filters={...} />}
 *   >
 *     <PatientsTable data={...} />
 *   </PageShell>
 *
 * Use `maxWidth="full"` for live dashboards (Phone) that need full-bleed.
 */
export interface PageShellProps {
  /** Optional uppercase eyebrow above the title (e.g. "People", "Pharmacy") */
  eyebrow?: string;
  /** Main page title — Source Serif 4 26px / 500 per BNDS PMS Redesign */
  title: string;
  /** Optional subtitle below the title — ink-3 13px */
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
  /** @deprecated Kept for backwards compat; not rendered in the BNDS redesign */
  icon?: ReactNode;
  /** @deprecated Kept for backwards compat */
  iconAccent?: string;
}

export default function PageShell({
  eyebrow,
  title,
  subtitle,
  actions,
  stats,
  toolbar,
  children,
  maxWidth = "7xl",
}: PageShellProps) {
  const widthClass = maxWidth === "full" ? "max-w-full" : "max-w-7xl mx-auto";

  return (
    <div className={`${widthClass} px-6 py-6 space-y-5`}>
      {/* Header row — BNDS PMS Redesign: eyebrow + serif h1 + subtitle | actions */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div
              className="text-[11px] font-semibold uppercase"
              style={{ color: "#7a8a78", letterSpacing: "0.12em" }}
            >
              {eyebrow}
            </div>
          )}
          <h1
            className="truncate"
            style={{
              fontFamily:
                "var(--font-serif), 'Source Serif 4', Georgia, serif",
              fontSize: 26,
              fontWeight: 500,
              color: "#0f2e1f",
              marginTop: eyebrow ? 4 : 0,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                color: "#5a6b58",
                fontSize: 13,
                marginTop: 4,
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </p>
          )}
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
