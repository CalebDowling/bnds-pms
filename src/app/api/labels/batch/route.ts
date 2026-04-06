import { getCurrentUser } from "@/lib/auth";
import { buildLabelData } from "@/lib/labels/rx-label";
import { generateBatchLabels } from "@/lib/labels/pdf-generator";
import { NextRequest, NextResponse } from "next/server";

interface BatchLabelRequest {
  fillIds: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: BatchLabelRequest = await request.json();

    if (!Array.isArray(body.fillIds) || body.fillIds.length === 0) {
      return NextResponse.json(
        { error: "fillIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (body.fillIds.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 fills per batch" },
        { status: 400 }
      );
    }

    // Build label data for all fills
    const labelDataArray = await Promise.all(
      body.fillIds.map((fillId) => buildLabelData(fillId))
    );

    // Generate batch PDF
    const pdfBuffer = await generateBatchLabels(labelDataArray);

    // Return PDF
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="prescription-labels-batch-${Date.now()}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error generating batch labels:", error);

    if (
      error instanceof Error &&
      error.message.includes("not found")
    ) {
      return NextResponse.json(
        { error: "One or more fills not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate batch labels" },
      { status: 500 }
    );
  }
}
