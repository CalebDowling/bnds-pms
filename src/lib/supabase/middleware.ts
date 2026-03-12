import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh the session — this keeps the auth token alive
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If no user and trying to access a protected route, redirect to login
    const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
    const isSetPassword = request.nextUrl.pathname.startsWith("/set-password");
    const isPublicRoute =
      isAuthRoute ||
      isSetPassword ||
      request.nextUrl.pathname.startsWith("/api/") ||
      request.nextUrl.pathname === "/";

    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // If user is logged in and trying to access login page, redirect to dashboard
    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (e) {
    // If middleware crashes, allow the request through
    console.error("[middleware] Error:", e);
    return NextResponse.next({ request });
  }
}
