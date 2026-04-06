/**
 * Import DRX label templates into the PMS database.
 *
 * Usage: npx tsx scripts/import-drx-templates.ts
 *
 * Reads the exported DRX label data from data/drx-label-templates-export.json
 * and stores each template as a StoreSetting record.
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

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

async function main() {
  const dataPath = path.resolve(__dirname, "../data/drx-label-templates-export.json");

  if (!fs.existsSync(dataPath)) {
    console.error("DRX export file not found at:", dataPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw);
  const drxLabels = data.labels || [];

  console.log(`Found ${drxLabels.length} templates to import`);

  // Get the first store
  const store = await prisma.store.findFirst();
  if (!store) {
    console.error("No store found in database");
    process.exit(1);
  }

  // Get the first admin user
  const admin = await prisma.user.findFirst({ where: { isActive: true } });
  const userId = admin?.id || null;

  console.log(`Importing to store: ${store.name} (${store.id})`);

  let imported = 0;
  let failed = 0;

  for (const drxLabel of drxLabels) {
    try {
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
        elementCount: (drxLabel.elements || []).length,
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
          base64Image: el.base64_image ? "(base64 data)" : null,
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
          customFontDataBase64: el.custom_font_data_base64 ? "(font data)" : null,
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
        where: { storeId_settingKey: { storeId: store.id, settingKey: key } },
        create: {
          storeId: store.id,
          settingKey: key,
          settingValue: JSON.stringify(pmsTemplate),
          settingType: "json",
          updatedBy: userId,
        },
        update: {
          settingValue: JSON.stringify(pmsTemplate),
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });

      imported++;
      console.log(`  [${imported}/${drxLabels.length}] Imported: ${drxLabel.name} (ID ${drxLabel.id}, ${pmsTemplate.elementCount} elements)`);
    } catch (err) {
      failed++;
      console.error(`  FAILED: ${drxLabel.name} (ID ${drxLabel.id}):`, err);
    }
  }

  console.log(`\nDone! Imported: ${imported}, Failed: ${failed}, Total: ${drxLabels.length}`);
  await prisma.$disconnect();
}

main().catch(console.error);
