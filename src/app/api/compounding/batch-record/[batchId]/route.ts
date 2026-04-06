import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildBatchRecord } from "@/lib/compounding/batch-record";
import { generateBatchRecordPDF } from "@/lib/compounding/batch-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { batchId } = await params;

    // Build batch record data
    const batchData = await buildBatchRecord(batchId);

    if (!batchData) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generateBatchRecordPDF(batchData);

    // Return as PDF
    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="batch-record-${batchData.batchNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating batch record:", error);
    return NextResponse.json(
      { error: "Failed to generate batch record" },
      { status: 500 }
    );
  }
}
