import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit, extractClientIp, extractUserAgent } from "@/lib/audit";
import { sendEmail } from "@/lib/messaging/email";

/** Build the HTML invitation email sent to new staff members. */
function buildInviteEmailHtml(params: {
  firstName: string;
  lastName: string;
  inviterName: string;
  setPasswordLink: string;
}): { html: string; text: string } {
  const { firstName, inviterName, setPasswordLink } = params;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Welcome to BNDS PMS</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#cbddd1; color:#0f260b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px; background:#cbddd1;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#e2ede6; border:1px solid #b8cfc0; border-radius:12px; overflow:hidden;">
        <tr>
          <td style="background:#415c43; padding:24px 32px;">
            <div style="color:#ffffff; font-size:22px; font-weight:800; letter-spacing:-0.02em;">
              Boudreaux&rsquo;s New Drug Store
            </div>
            <div style="color:#cbddd1; font-size:13px; margin-top:4px;">
              Pharmacy Management System
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px 0; font-size:22px; font-weight:800; color:#0f260b;">
              Welcome to the team, ${escapeHtml(firstName)} 👋
            </h1>
            <p style="margin:0 0 16px 0; font-size:15px; line-height:1.5; color:#0f260b;">
              ${escapeHtml(inviterName)} has invited you to join the BNDS Pharmacy Management System.
              Click the button below to set your password and log in for the first time.
            </p>
            <div style="text-align:center; padding:16px 0;">
              <a href="${setPasswordLink}" style="display:inline-block; background:#415c43; color:#ffffff; font-weight:700; padding:12px 28px; border-radius:8px; text-decoration:none; font-size:14px;">
                Set Your Password
              </a>
            </div>
            <p style="margin:16px 0 0 0; font-size:13px; color:#5d7a64;">
              The link will expire in 24 hours. If it expires, ask ${escapeHtml(inviterName)}
              to re-send your invitation, or use the &ldquo;Forgot password?&rdquo; link on the login page.
            </p>
            <p style="margin:16px 0 0 0; font-size:12px; color:#5d7a64; word-break:break-all;">
              If the button doesn&rsquo;t work, copy and paste this link into your browser:<br />
              <a href="${setPasswordLink}" style="color:#415c43;">${setPasswordLink}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px; background:#d6e5da; border-top:1px solid #b8cfc0; font-size:11px; color:#5d7a64;">
            You&rsquo;re receiving this because you were invited as a staff member.
            If this was sent to you by mistake, please ignore it.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Welcome to BNDS Pharmacy Management System, ${firstName}.`,
    "",
    `${inviterName} has invited you to join. Set your password here:`,
    setPasswordLink,
    "",
    "This link expires in 24 hours. If it expires, ask your admin to re-send the invitation.",
  ].join("\n");

  return { html, text };
}

/** Escape user-supplied text for inclusion in HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if user has admin permission (can invite users)
    if (!currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can invite users" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      email,
      firstName,
      lastName,
      phone,
      department,
      isPharmacist,
      licenseNumber,
      roles: roleIds = [],
    } = body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: email, firstName, lastName are required",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const admin = createAdminClient();

    // Create temporary password for the auth user
    const tempPassword =
      "Bnds" +
      Math.random().toString(36).slice(2, 8) +
      Math.random().toString(36).slice(2, 4).toUpperCase() +
      "!";

    // Create user in Supabase Auth with temporary password (auto-confirmed)
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true, // Auto-confirm since admin is creating
        user_metadata: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      });

    if (authError) {
      return NextResponse.json(
        { error: `Failed to create auth user: ${authError.message}` },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Supabase did not return a user" },
        { status: 500 }
      );
    }

    // Create user in our database
    const user = await prisma.user.create({
      data: {
        supabaseId: authData.user.id,
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim() || null,
        department: department?.trim() || null,
        isPharmacist: !!isPharmacist,
        licenseNumber: licenseNumber?.trim() || null,
        roles:
          roleIds && roleIds.length > 0
            ? {
                create: roleIds.map((roleId: string) => ({
                  roleId,
                })),
              }
            : undefined,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Generate password recovery link so user can set their own password
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pms.bndsrx.com";
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        options: {
          redirectTo: `${appUrl}/auth/callback?type=recovery`,
        },
      });

    if (linkError) {
      console.error("Failed to generate recovery link:", linkError);
      // Don't fail the request if the recovery link generation fails
      // The user was created successfully
    }

    // ─── SEND THE INVITATION EMAIL ──────────────────────────────────
    // Previously the route generated a recovery link but never emailed
    // it to the invitee — this is why users reported not receiving any
    // invite. Now we actually send the email via nodemailer (SMTP env
    // vars required in production: SMTP_HOST, SMTP_PORT, SMTP_USER,
    // SMTP_PASS, SMTP_FROM).
    //
    // If SMTP isn't configured the sendEmail() helper falls back to
    // logging the message to the server console and returns success —
    // so this still succeeds locally, but no one gets a real email.
    let emailResult: { success: boolean; messageId?: string; error?: string } = {
      success: false,
      error: "No recovery link was generated",
    };
    const setPasswordLink = linkData?.properties?.action_link;
    if (setPasswordLink) {
      const { html, text } = buildInviteEmailHtml({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        inviterName: `${currentUser.firstName} ${currentUser.lastName}`.trim() || "An admin",
        setPasswordLink,
      });
      emailResult = await sendEmail({
        to: normalizedEmail,
        subject: "Welcome to BNDS PMS — set your password",
        html,
        text,
      });
      if (!emailResult.success) {
        console.error(
          `[User invite] Email to ${normalizedEmail} failed: ${emailResult.error}`
        );
      }
    }

    // Log the audit event
    const ipAddress = extractClientIp(request.headers);
    const userAgent = extractUserAgent(request.headers);

    await logAudit({
      userId: currentUser.id,
      action: "CREATE",
      resource: "users",
      resourceId: user.id,
      newValues: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isPharmacist: user.isPharmacist,
        department: user.department,
        roles: user.roles.map((r) => r.role.name),
      },
      ipAddress,
      userAgent,
    });

    // Revalidate the users list
    revalidatePath("/users");

    // Build a user-facing message that reflects whether the email
    // actually went out, so the admin UI can flag partial failures.
    let message: string;
    if (emailResult.success && emailResult.messageId !== "dev-mode") {
      message = `Invitation sent to ${email}. They'll receive an email to set their password.`;
    } else if (emailResult.success && emailResult.messageId === "dev-mode") {
      message = `User ${email} was created, but no email provider is configured on the server. The set-password link was logged to the server console only. Configure either the Microsoft Graph env vars (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, MAIL_SEND_FROM) OR the SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM) on Vercel to send real emails.`;
    } else {
      message = `User ${email} was created, but the invitation email failed to send (${emailResult.error ?? "unknown error"}). Share this link manually: ${setPasswordLink ?? "(no recovery link was generated)"}`;
    }

    return NextResponse.json(
      {
        success: true,
        emailSent: emailResult.success && emailResult.messageId !== "dev-mode",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isPharmacist: user.isPharmacist,
          department: user.department,
          roles: user.roles.map((r) => ({
            id: r.role.id,
            name: r.role.name,
            description: r.role.description,
          })),
        },
        // Only included when email fails — gives the admin a manual-share fallback.
        setPasswordLink:
          emailResult.success && emailResult.messageId !== "dev-mode"
            ? undefined
            : setPasswordLink,
        message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error inviting user:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
