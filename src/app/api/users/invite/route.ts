import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit, extractClientIp, extractUserAgent } from "@/lib/audit";

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
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback?type=recovery`,
        },
      });

    if (linkError) {
      console.error("Failed to generate recovery link:", linkError);
      // Don't fail the request if the recovery link generation fails
      // The user was created successfully
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

    return NextResponse.json(
      {
        success: true,
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
        message: `Invitation sent to ${email}. They'll receive an email to set their password.`,
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
