import { getCurrentUser } from "@/lib/auth";
import { buildLabelData } from "@/lib/labels/rx-label";
import { generateLabelPDF } from "@/lib/labels/pdf-generator";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fillId: string }> }
) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get fillId from params
    const { fillId } = await params;

    // Build label data
    const labelData = await buildLabelData(fillId);

    // Generate PDF
    const pdfBuffer = await generateLabelPDF(labelData);

    // Check if download is requested
    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "true";

    // Return PDF
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": download
          ? `attachment; filename="rx-${labelData.rxNumber}-fill-${labelData.fillNumber}.pdf"`
          : "inline",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error generating label:", error);

    if (
      error instanceof Error &&
      error.message.includes("not found")
    ) {
      return NextResponse.json(
        { error: "Fill not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate label" },
      { status: 500 }
    );
  }
}
