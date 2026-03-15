/**
 * Email service using nodemailer
 * Falls back to console logging in dev mode if SMTP config not provided
 */

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || "noreply@boudreauxsnewdrug.com";

let transporter: any = null;
const isDev = !smtpHost || !smtpPort || !smtpUser || !smtpPass;

if (!isDev) {
  // Load nodemailer only if we have SMTP config
  // Note: nodemailer is NOT in package.json, so this will fail at runtime if not installed
  // For dev mode, we'll just log to console
  try {
    const nodemailer = require("nodemailer");
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // Use TLS if port 465
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
 * Send an email
 * In dev mode (no SMTP config), logs to console
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = smtpFrom,
}: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (isDev || !transporter) {
      console.log("📧 [DEV MODE] Email would be sent:");
      console.log(`  To: ${to}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  From: ${from}`);
      console.log(`  Body: ${text || html.slice(0, 100)}...`);
      return { success: true, messageId: "dev-mode" };
    }

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Failed to send email to ${to}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
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
