import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Supabase auth callback — handles recovery and invite links.
 *
 * Supabase redirects here after verifying a one-time token from an
 * emailed link. The `?code=` query param is exchanged for a session
 * cookie, and `?type=recovery|invite` sends the user to /set-password
 * to choose their own password.
 *
 * Lives at /auth/callback (NOT /callback) so that external callers —
 * invite email templates, Supabase redirectTo URLs, etc. — can use
 * the conventional path. See src/lib/supabase/middleware.ts — this
 * path MUST be in the public-routes allowlist or the middleware will
 * redirect unauthenticated requests to /login before this handler runs.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If this is a recovery or invite, send to set-password page
      if (type === "recovery" || type === "invite") {
        return NextResponse.redirect(`${origin}/set-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
