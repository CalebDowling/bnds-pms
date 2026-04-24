/**
 * Microsoft Graph email sender.
 *
 * Sends mail via the Microsoft Graph API using the OAuth 2.0 client-credentials
 * flow (app-only auth — no user interaction needed at runtime). This is
 * Microsoft's recommended path for server-to-server mail sending. SMTP AUTH
 * against Office 365 is being deprecated — Graph does not have this problem.
 *
 * ── Required env vars ────────────────────────────────────────────
 *   AZURE_TENANT_ID    GUID of your Microsoft 365 tenant
 *   AZURE_CLIENT_ID    Application (client) ID of the Entra app registration
 *   AZURE_CLIENT_SECRET Client secret value for that app
 *   MAIL_SEND_FROM     The mailbox address to send from
 *                      (defaults to noreply@bndsrx.com)
 *
 * ── One-time Entra app registration (admin task) ─────────────────
 *   1. Entra admin center → App registrations → New registration
 *      Name: "BNDS PMS Email Sender"
 *      Redirect URI: leave blank (daemon app)
 *   2. Copy the Application (client) ID and the Directory (tenant) ID
 *   3. Certificates & secrets → New client secret → copy the VALUE
 *      (shown only once)
 *   4. API permissions → Add permission → Microsoft Graph
 *      → Application permissions → "Mail.Send"
 *      → Grant admin consent for the tenant
 *   5. Add env vars on Vercel:
 *        AZURE_TENANT_ID    = <Directory (tenant) ID>
 *        AZURE_CLIENT_ID    = <Application (client) ID>
 *        AZURE_CLIENT_SECRET = <secret value>
 *        MAIL_SEND_FROM     = noreply@bndsrx.com (or info@, support@, cdowling@…)
 *   6. Redeploy
 *
 * ── Optional: restrict the app to specific mailboxes ─────────────
 * With Mail.Send (application), the app can send as ANY user in the
 * tenant. To restrict which mailboxes it can send from, create an
 * Exchange application access policy:
 *
 *   New-ApplicationAccessPolicy -AppId <client-id> \
 *     -PolicyScopeGroupId noreply@bndsrx.com \
 *     -AccessRight RestrictAccess \
 *     -Description "Limit BNDS PMS sender to noreply mailbox"
 */

export interface GraphEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Override the default MAIL_SEND_FROM mailbox for this message. */
  from?: string;
  /** CC recipients */
  cc?: string[];
  /** BCC recipients */
  bcc?: string[];
  /** If true, save a copy to the sender's Sent Items. Default false. */
  saveToSentItems?: boolean;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// ── Token cache ─────────────────────────────────────────────────────
// Tokens are ~60min. Keep them in-memory per lambda and reuse until 60s
// before expiry to avoid hitting the token endpoint on every email send.
let cachedToken: { value: string; expiresAt: number } | null = null;

/** Whether all Graph env vars are configured. */
export function isGraphEmailConfigured(): boolean {
  return !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET
  );
}

/** Acquire an app-only access token via client-credentials flow. */
async function getGraphToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.value;
  }

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Missing AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET for Graph email"
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(
      `Graph token request failed (${response.status}): ${errBody.slice(0, 300)}`
    );
  }

  const data = (await response.json()) as TokenResponse;
  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return data.access_token;
}

/**
 * Send an email via Microsoft Graph.
 * Returns `{ success, messageId?, error? }` to match the nodemailer interface.
 */
export async function sendEmailViaGraph(
  opts: GraphEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const fromAddress =
    opts.from ||
    process.env.MAIL_SEND_FROM ||
    process.env.SMTP_FROM ||
    "noreply@bndsrx.com";

  try {
    const token = await getGraphToken();

    const toRecipients = [
      { emailAddress: { address: opts.to } },
    ];
    const ccRecipients = (opts.cc ?? []).map((addr) => ({
      emailAddress: { address: addr },
    }));
    const bccRecipients = (opts.bcc ?? []).map((addr) => ({
      emailAddress: { address: addr },
    }));

    const message: Record<string, unknown> = {
      subject: opts.subject,
      body: {
        contentType: "HTML",
        content: opts.html,
      },
      toRecipients,
    };
    if (ccRecipients.length > 0) message.ccRecipients = ccRecipients;
    if (bccRecipients.length > 0) message.bccRecipients = bccRecipients;

    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
      fromAddress
    )}/sendMail`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        saveToSentItems: opts.saveToSentItems ?? false,
      }),
    });

    // Graph returns 202 Accepted with an empty body on success.
    if (response.status === 202 || response.ok) {
      return { success: true, messageId: `graph:${Date.now()}` };
    }

    // Error body is usually JSON like { error: { code, message } }
    const errText = await response.text();
    let errorMsg = `Graph sendMail failed (${response.status})`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson?.error?.message) errorMsg += `: ${errJson.error.message}`;
    } catch {
      if (errText) errorMsg += `: ${errText.slice(0, 300)}`;
    }
    return { success: false, error: errorMsg };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
