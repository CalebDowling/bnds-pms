"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

/**
 * PageTransition — lightweight fade/slide-in on route change.
 *
 * Uses CSS keyframes instead of Framer Motion (saves ~20KB of JS and
 * ~250ms of JS execution on every navigation). The keyframes are defined
 * inline here so this component has zero runtime dependencies besides React.
 *
 * The `key={pathname}` on the wrapper forces React to remount the div on
 * every navigation, which restarts the CSS animation automatically.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <style
        // Keep keyframes in JSX so they ship in the page HTML
        // (tiny, no extra request) and respect user motion preferences.
        dangerouslySetInnerHTML={{
          __html: `
@keyframes bnds-page-enter {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .bnds-page-transition { animation: none !important; }
}
.bnds-page-transition {
  animation: bnds-page-enter 160ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
          `,
        }}
      />
      <div key={pathname} className="bnds-page-transition">
        {children}
      </div>
    </>
  );
}
