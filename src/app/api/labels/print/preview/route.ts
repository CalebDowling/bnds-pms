import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateTemplatePreviewPDF,
  extractTemplateVariables,
  buildDefaultData,
  type DRXTemplate,
} from "@/lib/labels/drx-template-renderer";

/**
 * GET /api/labels/print/preview
 *
 * Generates a sample label PDF using the primary assigned template
 * and its example text values. No auth required for quick preview.
 */
export async function GET() {
  try {
    // Try auth but fall back to first store for preview
    let storeId: string | undefined;
    try {
      const user = await getCurrentUser();
      storeId = (user as Record<string, unknown>)?.storeId as string | undefined;
    } catch {
      // Auth failed, continue with fallback
    }
    if (!storeId) {
      const store = await prisma.store.findFirst();
      storeId = store?.id;
    }
    if (!storeId) {
      return NextResponse.json({ error: "No store found" }, { status: 400 });
    }

    // Load template assignment
    let templateId = "94"; // Default
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

    // Use example text from the template for preview
    const variables = extractTemplateVariables(template);
    const data = buildDefaultData(variables);

    const buffer = await generateTemplatePreviewPDF(template, data);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="label-preview.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error generating preview label:", msg);
    return NextResponse.json(
      { error: `Failed to generate preview: ${msg}` },
      { status: 500 }
    );
  }
}
