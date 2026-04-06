import { NextRequest, NextResponse } from "next/server";
import { processIncomingErx } from "@/lib/erx/processor";
import { getCurrentUser } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * POST /api/erx/intake
 * Receive and process incoming e-prescriptions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payload, source, format, apiKey } = body;

    // Validate required fields
    if (!payload) {
      return NextResponse.json(
        { error: "Missing payload" },
        { status: 400 }
      );
    }

    if (!source) {
      return NextResponse.json(
        { error: "Missing source" },
        { status: 400 }
      );
    }

    // Validate API key if provided
    if (apiKey) {
      const expectedKey = process.env.ERX_API_KEY;
      if (!expectedKey || apiKey !== expectedKey) {
        return NextResponse.json(
          { error: "Invalid API key" },
          { status: 401 }
        );
      }
    }

    // Process the incoming eRx
    const result = await processIncomingErx(
      payload,
      source,
      (format as "xml" | "json" | "auto") || "auto"
    );

    return NextResponse.json({
      success: true,
      intakeId: result.intakeId,
      status: result.status,
      matchConfidence: {
        patient: result.matchResult.patient.confidence,
        prescriber: result.matchResult.prescriber.confidence,
        drug: result.matchResult.drug.confidence,
      },
      requiresReview:
        result.matchResult.patient.confidence !== "exact" ||
        result.matchResult.prescriber.confidence !== "exact" ||
        result.matchResult.drug.confidence !== "exact",
    });
  } catch (error) {
    console.error("Error processing eRx intake:", error);
    const message = getErrorMessage(error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/erx/intake
 * Retrieve recent intake queue items (requires auth)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);

    if (page < 1) {
      return NextResponse.json(
        { error: "Page must be >= 1" },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.IntakeQueueItemWhereInput = {};

    if (status && status !== "all") {
      where.status = status;
    }

    // Fetch items and total count
    const [items, total] = await Promise.all([
      prisma.intakeQueueItem.findMany({
        where,
        include: {
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { receivedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.intakeQueueItem.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching intake queue:", error);
    const message = getErrorMessage(error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
