import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEmailProvider } from "@/lib/messaging/email";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/smtp-status
 *
 * Reports which email provider is active on the running server, and
 * which env vars are configured. Returns only booleans / obfuscated
 * previews (first-2-and-last-2 chars) — never full secret values.
 *
 * Admin-only. Useful for diagnosing email delivery failures without
 * needing direct Vercel dashboard access.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!(user as any).isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const activeProvider = getEmailProvider();

  const smtp = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
  };

  const graph = {
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
    MAIL_SEND_FROM: process.env.MAIL_SEND_FROM,
  };

  const mask = (v: string | undefined) => {
    if (!v) return null;
    if (v.length <= 4) return `${v.length} chars`;
    return `${v.slice(0, 2)}…${v.slice(-2)} (${v.length} chars)`;
  };

  const smtpConfigured = Object.values(smtp).slice(0, 4).every(Boolean); // HOST/PORT/USER/PASS
  const graphConfigured = !!(
    graph.AZURE_TENANT_ID &&
    graph.AZURE_CLIENT_ID &&
    graph.AZURE_CLIENT_SECRET
  );

  const message =
    activeProvider === "graph"
      ? "Microsoft Graph is the active email provider. Emails will be sent via Graph API."
      : activeProvider === "smtp"
      ? "SMTP is the active email provider. Emails will be sent via nodemailer + SMTP."
      : "No email provider is configured. Emails are logged to the server console only. Configure either the Microsoft Graph env vars (recommended) or SMTP env vars.";

  return NextResponse.json({
    activeProvider,
    message,
    graph: {
      configured: graphConfigured,
      vars: {
        AZURE_TENANT_ID: { set: !!graph.AZURE_TENANT_ID, preview: mask(graph.AZURE_TENANT_ID) },
        AZURE_CLIENT_ID: { set: !!graph.AZURE_CLIENT_ID, preview: mask(graph.AZURE_CLIENT_ID) },
        AZURE_CLIENT_SECRET: { set: !!graph.AZURE_CLIENT_SECRET, preview: mask(graph.AZURE_CLIENT_SECRET) },
        MAIL_SEND_FROM: { set: !!graph.MAIL_SEND_FROM, preview: graph.MAIL_SEND_FROM ?? null },
      },
    },
    smtp: {
      configured: smtpConfigured,
      vars: {
        SMTP_HOST: { set: !!smtp.SMTP_HOST, preview: mask(smtp.SMTP_HOST) },
        SMTP_PORT: { set: !!smtp.SMTP_PORT, preview: smtp.SMTP_PORT ?? null },
        SMTP_USER: { set: !!smtp.SMTP_USER, preview: mask(smtp.SMTP_USER) },
        SMTP_PASS: { set: !!smtp.SMTP_PASS, preview: mask(smtp.SMTP_PASS) },
        SMTP_FROM: { set: !!smtp.SMTP_FROM, preview: smtp.SMTP_FROM ?? null },
      },
    },
  });
}
