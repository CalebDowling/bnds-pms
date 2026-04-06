import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/errors";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkRegisterRateLimit } from "@/lib/rate-limit";

interface RegisterRequestBody {
  firstName: string;
  lastName: string;
  npi: string;
  email: string;
  password: string;
  practiceName?: string;
  phone?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check rate limit
    if (!checkRegisterRateLimit(request)) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body: RegisterRequestBody = await request.json();
    const { firstName, lastName, npi, email, password, practiceName, phone } =
      body;

    // Validate required fields
    const requiredFields = ["firstName", "lastName", "npi", "email", "password"];
    for (const field of requiredFields) {
      if (!body[field as keyof RegisterRequestBody]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate NPI is 10 digits
    if (!/^\d{10}$/.test(npi)) {
      return NextResponse.json(
        { error: "NPI must be 10 digits" },
        { status: 400 }
      );
    }

    // Check if NPI is already registered
    const existingPrescriber = await prisma.prescriber.findUnique({
      where: { npi },
    });

    if (existingPrescriber) {
      return NextResponse.json(
        { error: "NPI is already registered" },
        { status: 409 }
      );
    }

    // Create Supabase Auth user with prescriber role
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          role: "prescriber",
          full_name: `${firstName} ${lastName}`,
          npi,
        },
      });

    if (authError || !authUser?.user?.id) {
      console.error("Auth user creation error:", authError);
      return NextResponse.json(
        { error: "Failed to create auth user" },
        { status: 500 }
      );
    }

    // Create Prescriber record in Prisma
    const prescriber = await prisma.prescriber.create({
      data: {
        npi,
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        metadata: {
          practiceName: practiceName || null,
          supabaseId: authUser.user.id,
        },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        npi: true,
        email: true,
      },
    });

    return NextResponse.json({
      success: true,
      prescriber,
      message: "Registration successful. Please log in with your credentials.",
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Prescriber registration error:", message);

    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
