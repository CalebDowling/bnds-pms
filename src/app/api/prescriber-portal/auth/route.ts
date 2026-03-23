import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePrescriberToken } from "@/lib/prescriber-auth";
import { getErrorMessage } from "@/lib/errors";
import { checkLoginRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check rate limit
    if (!checkLoginRateLimit(request)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { npi, lastName } = body;

    // Validate required fields
    if (!npi || !lastName) {
      return NextResponse.json(
        { error: "NPI and last name are required" },
        { status: 400 }
      );
    }

    // Find prescriber by NPI and last name
    const prescriber = await prisma.prescriber.findUnique({
      where: { npi },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        npi: true,
        isActive: true,
      },
    });

    // Verify prescriber exists, is active, and last name matches
    if (
      !prescriber ||
      !prescriber.isActive ||
      prescriber.lastName.toLowerCase() !== lastName.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Invalid NPI or last name" },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await generatePrescriberToken(
      prescriber.id,
      prescriber.npi,
      `${prescriber.firstName} ${prescriber.lastName}`
    );

    return NextResponse.json({
      success: true,
      token,
      prescriber: {
        id: prescriber.id,
        firstName: prescriber.firstName,
        lastName: prescriber.lastName,
        npi: prescriber.npi,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Prescriber auth error:", message);

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
