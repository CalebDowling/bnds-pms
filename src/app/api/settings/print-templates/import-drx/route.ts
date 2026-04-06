import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/settings/print-templates/import-drx
 * Bulk-import DRX label templates into the PMS.
 * Expects the full DRX /api/v1/label_maker JSON body: { status, labels: [...] }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = (user as any)?.storeId;
  if (!storeId) return NextResponse.json({ error: "No store assigned" }, { status: 400 });

  const body = await request.json();
  const drxLabels = body.labels || [];

  if (drxLabels.length === 0) {
    return NextResponse.json({ error: "No labels found in payload" }, { status: 400 });
  }

  let imported = 0;
  let failed = 0;

  for (const drxLabel of drxLabels) {
    try {
      // Transform DRX format to PMS format
      const pmsTemplate = {
        id: drxLabel.id,
        drxId: drxLabel.id,
        name: drxLabel.name,
        type: mapLabelType(drxLabel.label_type),
        size: `${drxLabel.page_width}" x ${drxLabel.page_height}"`,
        pageWidth: drxLabel.page_width,
        pageHeight: drxLabel.page_height,
        pageUnits: drxLabel.page_units || "in",
        leftMargin: drxLabel.left_margin || 0,
        topMargin: drxLabel.top_margin || 0,
        downloadNoPreview: drxLabel.download_no_preview || false,
        chainTemplateId: drxLabel.chain_template_id,
        chainConditionData: drxLabel.chain_condition_data,
        createdAt: drxLabel.created_at,
        updatedAt: drxLabel.updated_at,
        source: "drx",
        elements: (drxLabel.elements || []).map((el: any) => ({
          id: el.id,
          elementData: el.element_data,
          exampleText: el.example_text,
          fontName: el.font_name,
          fontSize: el.font_size,
          fontStyle: el.font_style,
          textAlign: el.text_align,
          xPosition: el.x_position,
          yPosition: el.y_position,
          width: el.width,
          height: el.height,
          color: el.color,
          fillColor: el.fill_color,
          textColor: el.text_color,
          rotationAngle: el.rotation_angle,
          paragraphWidth: el.paragraph_width,
          maxTextLength: el.max_text_length,
          forceUpperCase: el.force_upper_case,
          forceLowerCase: el.force_lower_case,
          displayBarcodeCode128: el.display_barcode_code128,
          displayBarcodeQr: el.display_barcode_qr,
          displayBase64Jpeg: el.display_base64_jpeg,
          base64Image: el.base64_image,
          renderAsTable: el.render_as_table,
          columns: el.columns,
          maxPerColumn: el.max_per_column,
          maxPerPage: el.max_per_page,
          page: el.page,
          sliceStart: el.slice_start,
          sliceEnd: el.slice_end,
          repeatingElement: el.repeating_element,
          repeatingSpacer: el.repeating_spacer,
          horizontalRepeatingSpacer: el.horizontal_repeating_spacer,
          footer: el.footer,
          rightMargin: el.right_margin,
          joinMultipleWith: el.join_multiple_with,
          formatting: el.formatting,
          cellPadding: el.cell_padding,
          truthyOverride: el.truthy_override,
          falseyOverride: el.falsey_override,
          customFontDataBase64: el.custom_font_data_base64,
          template: el.template,
          ifElementData: el.if_element_data,
          ifXOffset: el.if_x_offset,
          ifYOffset: el.if_y_offset,
          ifDisplay: el.if_display,
          ifElementData2: el.if_element_data2,
          ifXOffset2: el.if_x_offset2,
          ifYOffset2: el.if_y_offset2,
          ifDisplay2: el.if_display2,
          subLabelTemplateId: el.sub_label_template_id,
          labelGroupId: el.label_group_id,
          labelGroup: el.label_group ? {
            id: el.label_group.id,
            name: el.label_group.name,
            xOffset: el.label_group.x_offset,
            yOffset: el.label_group.y_offset,
          } : null,
          subLabelTemplate: el.sub_label_template ? {
            id: el.sub_label_template.id,
            name: el.sub_label_template.name,
          } : null,
        })),
      };

      const key = `print_template_${drxLabel.id}`;

      await prisma.storeSetting.upsert({
        where: { storeId_settingKey: { storeId, settingKey: key } },
        create: {
          storeId,
          settingKey: key,
          settingValue: JSON.stringify(pmsTemplate),
          settingType: "json",
          updatedBy: user.id,
        },
        update: {
          settingValue: JSON.stringify(pmsTemplate),
          updatedBy: user.id,
          updatedAt: new Date(),
        },
      });

      imported++;
    } catch (err) {
      console.error(`Failed to import template ${drxLabel.id} (${drxLabel.name}):`, err);
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    imported,
    failed,
    total: drxLabels.length,
  });
}

function mapLabelType(drxType: string | null): string {
  if (!drxType) return "Other";
  const map: Record<string, string> = {
    "Rx Label": "Rx Label",
    "Package": "Package",
    "SUB TEMPLATE": "Sub Template",
    "MAR": "MAR",
    "Batch": "Batch",
    "Daily Summary": "Daily Summary",
    "Pull Cash": "Pull Cash",
    "Packing List": "Packing List",
    "Register Receipt": "Register Receipt",
  };
  return map[drxType] || drxType;
}
