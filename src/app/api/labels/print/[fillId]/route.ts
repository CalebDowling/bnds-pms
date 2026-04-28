import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTemplateDataFromFill } from "@/lib/labels/fill-data-mapper";
import {
  generateTemplatePreviewPDF,
  type DRXTemplate,
} from "@/lib/labels/drx-template-renderer";

/**
 * GET /api/labels/print/{fillId}?templateId=94
 *
 * Generates a label PDF for a prescription fill using the assigned DRX template.
 * If templateId is not provided, uses the primary Rx label from store settings.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fillId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fillId } = await params;

    let storeId = (user as Record<string, unknown>)?.storeId as string | undefined;
    if (!storeId) {
      const store = await prisma.store.findFirst();
      storeId = store?.id;
    }
    if (!storeId) {
      return NextResponse.json({ error: "No store found" }, { status: 400 });
    }

    // Determine which template to use
    let templateId = request.nextUrl.searchParams.get("templateId");

    if (!templateId) {
      // Load from store assignments
      const assignmentSetting = await prisma.storeSetting.findUnique({
        where: {
          storeId_settingKey: {
            storeId,
            settingKey: "print_template_assignments",
          },
        },
      });

      if (assignmentSetting) {
        const assignments = JSON.parse(assignmentSetting.settingValue);
        templateId = String(assignments.primaryRxLabel || 94);
      } else {
        templateId = "94"; // Default to Boudreaux CMPD template
      }
    }

    // Load the DRX template
    const templateSetting = await prisma.storeSetting.findUnique({
      where: {
        storeId_settingKey: {
          storeId,
          settingKey: `print_template_${templateId}`,
        },
      },
    });

    if (!templateSetting) {
      return NextResponse.json(
        { error: `Template ${templateId} not found. Import it from DRX first.` },
        { status: 404 }
      );
    }

    const template: DRXTemplate = JSON.parse(templateSetting.settingValue);

    // Build data from fill record
    const data = await buildTemplateDataFromFill(fillId);

    // Generate PDF
    const buffer = await generateTemplatePreviewPDF(template, data);

    const download = request.nextUrl.searchParams.get("download") === "true";

    // Use the rxNumber for the filename so the browser tab title and
    // download name read like "label-Rx9990008.pdf" instead of the raw
    // fillId UUID. Fall back to fillId if the lookup fails.
    let filename = `label-${fillId}.pdf`;
    try {
      const fill = await prisma.prescriptionFill.findUnique({
        where: { id: fillId },
        select: { prescription: { select: { rxNumber: true } } },
      });
      const rxNumber = fill?.prescription?.rxNumber;
      if (rxNumber) {
        // Strip characters that aren't safe in a Content-Disposition
        // filename token (RFC 6266 + most browsers' tolerance window).
        const safeRx = rxNumber.replace(/[^A-Za-z0-9._-]/g, "");
        filename = `label-Rx${safeRx}.pdf`;
      }
    } catch {
      // Non-fatal — keep the fillId fallback.
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // Include the filename in BOTH download and inline dispositions.
        // Browsers use the Content-Disposition filename for inline PDFs
        // as the tab title and the default save-as name. Without it,
        // the URL path is used → which contains the fillId UUID.
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error generating label:", msg);

    if (msg.includes("not found") || msg.includes("No Prescription")) {
      return NextResponse.json({ error: "Fill not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: `Failed to generate label: ${msg}` },
      { status: 500 }
    );
  }
}
