import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateTemplatePreviewPDF,
  extractTemplateVariables,
  buildDefaultData,
  type DRXTemplate,
} from "@/lib/labels/drx-template-renderer";
import { getSpecializedRenderer } from "@/lib/labels/template-renderer-registry";

/**
 * GET /api/labels/template?id=<templateId>
 * Returns the template definition (variables, metadata) for the editor UI.
 *
 * GET /api/labels/template?id=<templateId>&pdf=true
 * Returns a sample PDF preview using example text values.
 *
 * POST /api/labels/template
 * Body: { templateId: number, data: Record<string, string> }
 * Returns a PDF with the provided variable values.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let storeId = (user as any)?.storeId;
  if (!storeId) {
    const store = await prisma.store.findFirst();
    storeId = store?.id;
  }
  if (!storeId) return NextResponse.json({ error: "No store assigned" }, { status: 400 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing template id" }, { status: 400 });

  const isPdf = request.nextUrl.searchParams.get("pdf") === "true";

  // Load template from DB
  const setting = await prisma.storeSetting.findUnique({
    where: { storeId_settingKey: { storeId, settingKey: `print_template_${id}` } },
  });

  if (!setting) {
    return NextResponse.json({ error: "Template not found. Import it from DRX first." }, { status: 404 });
  }

  let template: DRXTemplate;
  try {
    template = JSON.parse(setting.settingValue) as DRXTemplate;
  } catch {
    return NextResponse.json({ error: "Invalid template data" }, { status: 500 });
  }

  // Check for a specialized renderer (e.g. compound Rx labels)
  const specialized = getSpecializedRenderer(template.type, template.pageWidth, template.pageHeight);

  if (isPdf) {
    // Generate sample PDF
    if (specialized) {
      try {
        const buffer = await specialized.generatePDF(specialized.getDefaultData());
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${template.name}.pdf"`,
          },
        });
      } catch (err) {
        console.error("PDF generation error:", err);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
      }
    }

    const variables = extractTemplateVariables(template);
    const data = buildDefaultData(variables);

    try {
      const buffer = await generateTemplatePreviewPDF(template, data);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${template.name}.pdf"`,
        },
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
  }

  // If specialized renderer exists, return its field groups and default data
  if (specialized) {
    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        size: template.size,
        pageWidth: template.pageWidth,
        pageHeight: template.pageHeight,
        elementCount: template.elements.length,
      },
      fieldGroups: specialized.getFieldGroups(),
      defaultData: specialized.getDefaultData(),
      useSpecializedRenderer: true,
    });
  }

  // Return template metadata + variables for editor (generic path)
  const variables = extractTemplateVariables(template);
  const defaultData = buildDefaultData(variables);

  return NextResponse.json({
    template: {
      id: template.id,
      name: template.name,
      type: template.type,
      size: template.size,
      pageWidth: template.pageWidth,
      pageHeight: template.pageHeight,
      elementCount: template.elements.length,
    },
    variables,
    defaultData,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let storeId = (user as any)?.storeId;
  if (!storeId) {
    const store = await prisma.store.findFirst();
    storeId = store?.id;
  }
  if (!storeId) return NextResponse.json({ error: "No store assigned" }, { status: 400 });

  const body = await request.json();
  const { templateId, data } = body;

  if (!templateId) {
    return NextResponse.json({ error: "Missing templateId" }, { status: 400 });
  }

  // Load template
  const setting = await prisma.storeSetting.findUnique({
    where: { storeId_settingKey: { storeId, settingKey: `print_template_${templateId}` } },
  });

  if (!setting) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  let template: DRXTemplate;
  try {
    template = JSON.parse(setting.settingValue) as DRXTemplate;
  } catch {
    return NextResponse.json({ error: "Invalid template data" }, { status: 500 });
  }

  // Check for specialized renderer
  const specialized = getSpecializedRenderer(template.type, template.pageWidth, template.pageHeight);
  if (specialized) {
    try {
      const buffer = await specialized.generatePDF(data || {});
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${template.name}.pdf"`,
        },
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
  }

  try {
    const buffer = await generateTemplatePreviewPDF(template, data || {});
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${template.name}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
