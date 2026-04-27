import * as React from "react";

interface DesignPageProps {
  /** Optional eyebrow above the title, e.g. "Today" or "Administration". */
  sublabel?: string;
  /** Page title. Hidden in dense mode. */
  title?: string;
  /** Sub-copy under the title. Hidden in dense mode. */
  subtitle?: string;
  /** Right-side toolbar content next to the title. */
  actions?: React.ReactNode;
  /**
   * Dense mode: drops outer padding and the title block, lets the page
   * own its full layout (used for split views like Rx Queue, Settings).
   */
  dense?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps a page in the BNDS design typography + optional title row.
 * The sidebar and topbar are provided by the parent SidebarLayoutShell.
 */
export function DesignPage({
  sublabel,
  title,
  subtitle,
  actions,
  dense = false,
  children,
}: DesignPageProps) {
  if (dense) {
    return (
      <div className="bnds" style={{ minHeight: "calc(100vh - 56px)", background: "var(--paper)" }}>
        {children}
      </div>
    );
  }
  return (
    <div className="bnds" style={{ padding: 24, background: "var(--paper)", minHeight: "calc(100vh - 56px)" }}>
      {(title || actions) && (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, gap: 12, flexWrap: "wrap" }}>
          <div>
            {sublabel && <div className="t-eyebrow">{sublabel}</div>}
            {title && (
              <h1
                className="bnds-serif"
                style={{ fontSize: 28, fontWeight: 500, marginTop: 4, lineHeight: 1.1, color: "var(--ink)" }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="t-body" style={{ color: "var(--ink-3)", marginTop: 4 }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
