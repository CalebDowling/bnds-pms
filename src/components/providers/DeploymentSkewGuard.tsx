"use client";

import { useEffect, useRef } from "react";

/**
 * DeploymentSkewGuard — hard-reloads the page when a Next.js RSC navigation
 * fails because the user's tab is running JavaScript from a stale deployment.
 *
 * THE BUG (04/27 walkthrough):
 *   A pharmacist opens /queue/process/[fillId] and works through a fill.
 *   Meanwhile we deploy a new build. The user's tab still has the OLD
 *   client bundle (chunks tagged `?dpl=dpl_OLD_…`). When they click a
 *   sidebar link (Compounding / Pickup / Dashboard), Next.js fires an RSC
 *   navigation request. The OLD client encodes the route state tree in
 *   the OLD format. Vercel routes the request to the CURRENT deployment
 *   (skew protection is off at the project level), and the current
 *   server rejects the header it cannot decode:
 *
 *     500 GET /compounding   "Error: The router state header was sent but
 *                              could not be decoded"
 *
 *   On the client, Next.js surfaces this as:
 *     "An unexpected response was received from the server."
 *
 *   The router never calls history.pushState, so the URL doesn't change
 *   and the user is stuck on the fill page — no nav clicks work.
 *
 * THE FIX:
 *   Listen for that exact error globally. When we see it, reload the page
 *   so the user picks up the fresh JS bundle. The reload is one-shot per
 *   session-storage flag so we can never end up in a loop if the error
 *   recurs immediately on the new page.
 *
 * BETTER FIX (operations):
 *   Enable Vercel Skew Protection at the project level. With skew
 *   protection ON, RSC requests carrying `x-deployment-id` get routed to
 *   the matching old deployment, which can decode its own format. This
 *   guard remains a safety net for deployments that have aged past the
 *   skew-protection retention window.
 */

const SKEW_RELOADED_KEY = "__bnds_skew_reloaded";
const SKEW_PATTERNS = [
  "An unexpected response was received from the server",
  "Failed to fetch RSC payload",
  "Loading chunk",
  "ChunkLoadError",
];

function looksLikeSkewError(message: string): boolean {
  if (!message) return false;
  return SKEW_PATTERNS.some((p) => message.includes(p));
}

export default function DeploymentSkewGuard() {
  // Throttle: never reload more than once per page load. If it happens
  // twice in a row the new bundle is also broken — stop and let the
  // error bubble so we surface a real error page instead of a loop.
  const reloaded = useRef(false);

  useEffect(() => {
    // Clear the session-storage flag once we mount cleanly. If we did
    // reload from skew, the previous session set the flag — landing
    // here without an error means recovery worked.
    try {
      if (sessionStorage.getItem(SKEW_RELOADED_KEY) === "1") {
        sessionStorage.removeItem(SKEW_RELOADED_KEY);
      }
    } catch {
      // sessionStorage can throw in private browsing / sandboxed iframes —
      // swallow and continue; the in-memory `reloaded` ref still gates us.
    }

    const triggerReload = (reason: string) => {
      if (reloaded.current) return;
      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem(SKEW_RELOADED_KEY) === "1";
      } catch {
        // ignore
      }
      if (alreadyReloaded) {
        // We already tried this once. Don't loop — let the error stand.
        console.error(
          "[DeploymentSkewGuard] Skew error after reload — not retrying:",
          reason
        );
        return;
      }
      reloaded.current = true;
      try {
        sessionStorage.setItem(SKEW_RELOADED_KEY, "1");
      } catch {
        // ignore
      }
      console.warn(
        "[DeploymentSkewGuard] Stale deployment detected, reloading:",
        reason
      );
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => {
      const msg = String(e?.message || e?.error || "");
      if (looksLikeSkewError(msg)) {
        triggerReload(msg);
      }
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e?.reason;
      const msg = String(
        (reason && (reason.message || reason)) || ""
      );
      if (looksLikeSkewError(msg)) {
        triggerReload(msg);
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
