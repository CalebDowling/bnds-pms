import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Supabase auth callback — handles recovery, invite, and OAuth sign-in.
 *
 * Two flows land here:
 *
 *  1. **token_hash flow** (used by our invite + password-reset emails).
 *     The invite route mints a recovery/invite link server-side via
 *     `admin.auth.admin.generateLink()`, takes `properties.hashed_token`
 *     out of the response, and builds an email link pointing directly
 *     at us: `/auth/callback?token_hash=xxx&type=recovery`. We then
 *     call `supabase.auth.verifyOtp({ token_hash, type })` which
 *     verifies the token server-side and sets the session cookie.
 *
 *  2. **code flow** (PKCE — used by OAuth providers like Google/GitHub,
 *     if/when added). Arrives as `?code=xxx`. We exchange with
 *     `exchangeCodeForSession(code)`.
 *
 * For type=recovery or type=invite, the user lands on /set-password
 * to choose their own password. Otherwise they go to `?next=...` or
 * the dashboard.
 *
 * Lives at /auth/callback (NOT /callback — the (auth) route group
 * doesn't add a path segment). Must be in the middleware's public
 * allowlist — see src/lib/supabase/middleware.ts.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  // Flow 1: token_hash (our invite + admin-triggered password reset).
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      if (type === "recovery" || type === "invite") {
        return NextResponse.redirect(`${origin}/set-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] verifyOtp failed:", error.message);
  }

  // Flow 2: PKCE code exchange (OAuth providers).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === "recovery" || type === "invite") {
        return NextResponse.redirect(`${origin}/set-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
