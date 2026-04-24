/**
 * Email service.
 *
 * Send-path selection (first match wins):
 *
 *   1. Microsoft Graph API (preferred for M365 tenants)
 *      Triggered when AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET
 *      are all set. Uses OAuth client-credentials — no SMTP AUTH needed,
 *      which is important because Microsoft has been deprecating basic
 *      SMTP AUTH for years. Sends as MAIL_SEND_FROM (default: noreply@bndsrx.com).
 *      See src/lib/messaging/graph-email.ts for setup instructions.
 *
 *   2. SMTP via nodemailer
 *      Triggered when SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS are set.
 *      Works with SendGrid, Resend, Mailgun, Gmail App Passwords, etc.
 *
 *   3. Dev-mode console log
 *      Triggered when neither of the above is configured. Prints the
 *      email to the server log and returns messageId: "dev-mode" so
 *      callers can detect that nothing actually sent.
 */

import { isGraphEmailConfigured, sendEmailViaGraph } from "./graph-email";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom =
  process.env.MAIL_SEND_FROM ||
  process.env.SMTP_FROM ||
  "noreply@bndsrx.com";

const graphConfigured = isGraphEmailConfigured();
const smtpConfigured = !!(smtpHost && smtpPort && smtpUser && smtpPass);

let transporter: any = null;
if (smtpConfigured && !graphConfigured) {
  // Only load nodemailer when SMTP is actually the active path.
  try {
    const nodemailer = require("nodemailer");
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  } catch (error) {
    console.warn(
      "Nodemailer not installed or SMTP config incomplete. Email will be logged to console."
    );
  }
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Returns which provider is currently configured for outbound email.
 * Handy for admin diagnostics.
 */
export function getEmailProvider(): "graph" | "smtp" | "dev" {
  if (graphConfigured) return "graph";
  if (smtpConfigured && transporter) return "smtp";
  return "dev";
}

/**
 * Send an email via the best configured provider.
 *
 * Callers can detect the dev-mode fallback by checking
 * `result.messageId === "dev-mode"` and surfacing a warning to the
 * admin ("SMTP / Graph not configured — link was logged to server console").
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = smtpFrom,
}: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // ── 1. Prefer Microsoft Graph when configured ────────────────────
  if (graphConfigured) {
    const result = await sendEmailViaGraph({ to, subject, html, text, from });
    if (result.success) return result;
    // Fall through to SMTP / dev if Graph errored, so a transient failure
    // doesn't block the whole message if SMTP is also available.
    console.warn(`[email] Graph send failed, falling back: ${result.error}`);
  }

  // ── 2. SMTP fallback ─────────────────────────────────────────────
  if (transporter) {
    try {
      const info = await transporter.sendMail({ from, to, subject, html, text });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[email] SMTP send failed to ${to}:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // ── 3. Dev mode — log only ───────────────────────────────────────
  console.log("📧 [DEV MODE] Email would be sent:");
  console.log(`  To: ${to}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  From: ${from}`);
  console.log(`  Body: ${text || html.slice(0, 200)}...`);
  return { success: true, messageId: "dev-mode" };
}

/**
 * Build a pharmacy-branded email HTML template
 */
export function buildEmailHtml(
  templateName: string,
  content: string,
  data?: Record<string, any>
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }
    .header {
      background-color: #40721d;
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .logo {
      font-size: 14px;
      opacity: 0.9;
      margin-top: 8px;
    }
    .content {
      padding: 30px 20px;
    }
    .content p {
      margin: 0 0 15px 0;
    }
    .highlight {
      background-color: #f0f5e6;
      padding: 15px;
      border-left: 4px solid #40721d;
      margin: 20px 0;
      border-radius: 2px;
    }
    .cta-button {
      display: inline-block;
      background-color: #40721d;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: 600;
    }
    .cta-button:hover {
      background-color: #2d5018;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .footer p {
      margin: 5px 0;
    }
    .template-name {
      color: #999;
      font-size: 11px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Boudreaux's Pharmacy</h1>
      <div class="logo">Professional Compounding Pharmacy</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>Boudreaux's New Drug Store</strong></p>
      <p>Serving your healthcare needs since 1947</p>
      <p>Questions? Contact us anytime</p>
      <p class="template-name">Template: ${templateName}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
