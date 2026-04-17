import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/smtp-status
 *
 * Reports whether SMTP env vars are configured on the running server.
 * Returns only booleans / lengths / first-and-last chars — never the
 * full secret value.
 *
 * Admin-only. Useful for diagnosing why invite/notification emails
 * aren't sending without needing Vercel dashboard access.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!(user as any).isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const vars = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
  };

  const mask = (v: string | undefined) => {
    if (!v) return null;
    if (v.length <= 4) return `${v.length} chars`;
    return `${v.slice(0, 2)}…${v.slice(-2)} (${v.length} chars)`;
  };

  const configured = Object.values(vars).every(Boolean);

  return NextResponse.json({
    configured,
    vars: {
      SMTP_HOST: { set: !!vars.SMTP_HOST, preview: mask(vars.SMTP_HOST) },
      SMTP_PORT: { set: !!vars.SMTP_PORT, preview: vars.SMTP_PORT ?? null },
      SMTP_USER: { set: !!vars.SMTP_USER, preview: mask(vars.SMTP_USER) },
      SMTP_PASS: { set: !!vars.SMTP_PASS, preview: mask(vars.SMTP_PASS) },
      SMTP_FROM: { set: !!vars.SMTP_FROM, preview: vars.SMTP_FROM ?? null },
    },
    message: configured
      ? "All SMTP vars are set. If emails still aren't arriving, check spam/quarantine or the SMTP provider's logs."
      : "SMTP is not fully configured. Set the missing env vars on Vercel → Project → Settings → Environment Variables.",
  });
}
