import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Root middleware — handles subdomain routing for prescriber portal
 * and session refresh for all authenticated routes.
 *
 * portal.bndsrxportal.com → prescriber portal routes
 * bndsrxportal.com        → staff PMS routes
 */
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // ── Prescriber Portal Subdomain ──────────────────────────
  // Detect portal subdomain (portal.bndsrxportal.com or portal.localhost:3000)
  const isPortalSubdomain =
    hostname.startsWith("portal.") ||
    hostname.startsWith("portal-");

  if (isPortalSubdomain) {
    // Rewrite all portal subdomain requests to /portal routes internally
    // e.g., portal.bndsrxportal.com/dashboard → /portal/dashboard
    // e.g., portal.bndsrxportal.com/           → /portal

    // Allow API routes for prescriber portal
    if (pathname.startsWith("/api/prescriber-portal")) {
      return updateSession(request);
    }

    // Block access to staff PMS routes from portal subdomain
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/patients") ||
      pathname.startsWith("/prescriptions") ||
      pathname.startsWith("/inventory") ||
      pathname.startsWith("/billing") ||
      pathname.startsWith("/compounding") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/users") ||
      pathname.startsWith("/compliance") ||
      pathname.startsWith("/analytics") ||
      pathname.startsWith("/reports") ||
      pathname.startsWith("/intake") ||
      pathname.startsWith("/pos") ||
      pathname.startsWith("/shipping")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/dashboard";
      return NextResponse.redirect(url);
    }

    // Rewrite portal subdomain root to /portal/dashboard
    // Login lives at portal.bndsrxportal.com/login → /portal (login page)
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/dashboard";
      return NextResponse.rewrite(url);
    }

    // Map /login to the /portal login page
    if (pathname === "/login" || pathname === "/register") {
      const url = request.nextUrl.clone();
      url.pathname = `/portal${pathname === "/login" ? "" : "/register"}`;
      return NextResponse.rewrite(url);
    }

    // Rewrite portal subdomain paths:
    // portal.bndsrxportal.com/dashboard → /portal/dashboard
    // portal.bndsrxportal.com/orders    → /portal/orders
    if (
      !pathname.startsWith("/portal") &&
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/_next") &&
      !pathname.startsWith("/favicon")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `/portal${pathname}`;
      return NextResponse.rewrite(url);
    }

    return updateSession(request);
  }

  // ── Staff PMS (main domain) ──────────────────────────────
  // Block staff domain from accessing prescriber portal routes directly
  // (prescribers should only use the portal subdomain)
  if (pathname.startsWith("/portal") && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Default: run Supabase session refresh middleware
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
