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
    const filename = `label-${fillId}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": download
          ? `attachment; filename="${filename}"`
          : "inline",
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
