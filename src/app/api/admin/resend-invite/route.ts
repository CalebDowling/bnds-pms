import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/resend-invite?email=<user_email>
 * POST /api/admin/resend-invite  { "email": "<user_email>" }
 *
 * Regenerates a fresh Supabase password-recovery link for an existing
 * BNDS PMS user. Returns the link as JSON so an admin can share it
 * manually (via SMS, Slack, the MCP, etc.) when the automated invite
 * email failed to arrive.
 *
 * Admin session required. Does not email the user — this endpoint only
 * mints the link. See /api/users/invite for the full invite-with-email
 * flow.
 */

async function generate(email: string) {
  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pms.bndsrx.com";

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true, firstName: true, lastName: true, lastLogin: true },
  });
  if (!user) {
    return { ok: false as const, status: 404, error: `No user with email ${email}.` };
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: user.email,
    options: {
      redirectTo: `${appUrl}/auth/callback?type=recovery`,
    },
  });

  // Use properties.hashed_token (not action_link). See src/app/auth/callback/route.ts
  // and src/app/api/users/invite/route.ts for why — action_link uses an implicit
  // flow with a hash fragment that server route handlers can't read.
  const hashedToken = data?.properties?.hashed_token;
  if (error || !hashedToken) {
    return {
      ok: false as const,
      status: 500,
      error: error?.message ?? "Failed to generate recovery link.",
    };
  }

  const setPasswordLink = `${appUrl}/auth/callback?token_hash=${hashedToken}&type=recovery`;

  return {
    ok: true as const,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        hasLoggedIn: !!user.lastLogin,
      },
      setPasswordLink,
      expiresNoteHours: 24,
    },
  };
}

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(me as any).isAdmin)
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const email = new URL(req.url).searchParams.get("email");
  if (!email)
    return NextResponse.json({ error: "Missing ?email= param" }, { status: 400 });

  const result = await generate(email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(me as any).isAdmin)
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  if (!body.email)
    return NextResponse.json({ error: "Missing email in body" }, { status: 400 });

  const result = await generate(body.email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
