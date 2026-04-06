import { NextResponse } from "next/server";
import { generateCompoundLabelPDF, createSampleLabelData } from "@/lib/labels/drx-compound-label";

/**
 * GET /api/labels/compound/preview
 * Generates a compound label PDF with sample data for preview purposes.
 * No authentication required — uses hardcoded test data only.
 */
export async function GET() {
  const sampleData = createSampleLabelData();
  const pdf = await generateCompoundLabelPDF(sampleData);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=compound-label-preview.pdf",
      "Cache-Control": "no-store",
    },
  });
}
