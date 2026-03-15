import PDFDocument from "pdfkit";
import { BatchRecordData } from "./batch-record";

const PRIMARY_COLOR = "#40721D";
const HEADING_COLOR = "#000000";
const TEXT_COLOR = "#333333";
const BORDER_COLOR = "#D1D5DB";
const LIGHT_BG = "#F9FAFB";

function formatDateShort(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function drawSection(doc: InstanceType<typeof PDFDocument>, title: string, y: number): number {
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor(HEADING_COLOR)
    .text(title, 40, y);
  doc.moveTo(40, y + 18).lineTo(550, y + 18).stroke(BORDER_COLOR);
  return y + 28;
}

function drawFieldRow(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number = 230
): void {
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#666666")
    .text(label, x, y);
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(TEXT_COLOR)
    .text(value, x, y + 14);
}

function drawHorizontalLine(doc: InstanceType<typeof PDFDocument>, y: number): void {
  doc.moveTo(40, y).lineTo(550, y).stroke(BORDER_COLOR);
}

export async function generateBatchRecordPDF(
  batchData: BatchRecordData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margin: 40,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on("error", reject);

      // ═════════════════════════════════════════════════════════
      // HEADER
      // ═════════════════════════════════════════════════════════

      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .fillColor(PRIMARY_COLOR)
        .text("COMPOUNDING BATCH RECORD", 40, 40);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(TEXT_COLOR)
        .text("Boudreaux's Pharmacy", 40, 65);

      doc
        .fontSize(9)
        .fillColor("#666666")
        .text("A compounding pharmacy specializing in customized medications", 40, 80);

      let currentY = 105;

      // ═════════════════════════════════════════════════════════
      // BATCH IDENTIFICATION
      // ═════════════════════════════════════════════════════════

      currentY = drawSection(doc, "BATCH IDENTIFICATION", currentY);

      doc.fontSize(9).fillColor("#666666").font("Helvetica-Bold");
      doc.text("Batch Number:", 40, currentY);
      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor(HEADING_COLOR)
        .text(batchData.batchNumber, 130, currentY);

      doc
        .fontSize(9)
        .fillColor("#666666")
        .font("Helvetica-Bold")
        .text("Date Created:", 300, currentY);
      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor(HEADING_COLOR)
        .text(formatDateShort(batchData.createdAt), 380, currentY);

      currentY += 25;

      doc
        .fontSize(9)
        .fillColor("#666666")
        .font("Helvetica-Bold")
        .text("Status:", 40, currentY);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(TEXT_COLOR)
        .text(
          batchData.status.charAt(0).toUpperCase() + batchData.status.slice(1),
          130,
          currentY
        );

      doc
        .fontSize(9)
        .fillColor("#666666")
        .font("Helvetica-Bold")
        .text("Beyond-Use Date:", 300, currentY);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(TEXT_COLOR)
        .text(formatDateShort(batchData.budDate), 380, currentY);

      currentY += 30;

      // ═════════════════════════════════════════════════════════
      // FORMULA INFORMATION
      // ═════════════════════════════════════════════════════════

      currentY = drawSection(doc, "FORMULA INFORMATION", currentY);

      const colWidth = 260;

      drawFieldRow(doc, "Formula Name", batchData.formulaName, 40, currentY, colWidth);
      drawFieldRow(
        doc,
        "Formula Code",
        batchData.formulaCode,
        300,
        currentY,
        colWidth
      );

      currentY += 35;

      drawFieldRow(
        doc,
        "Dosage Form",
        batchData.dosageForm || "—",
        40,
        currentY,
        colWidth
      );
      drawFieldRow(
        doc,
        "Route of Administration",
        batchData.route || "—",
        300,
        currentY,
        colWidth
      );

      currentY += 35;

      drawFieldRow(
        doc,
        "Quantity Prepared",
        `${batchData.quantityPrepared} ${batchData.unit}`,
        40,
        currentY,
        colWidth
      );

      if (batchData.category) {
        drawFieldRow(doc, "Category", batchData.category, 300, currentY, colWidth);
      }

      currentY += 40;

      // ═════════════════════════════════════════════════════════
      // INGREDIENTS TABLE
      // ═════════════════════════════════════════════════════════

      currentY = drawSection(doc, "INGREDIENTS", currentY);

      // Table header
      const tableY = currentY;
      const colWidths = {
        ingredient: 120,
        required: 60,
        actual: 60,
        lot: 60,
        mfr: 80,
        expiry: 60,
      };

      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(HEADING_COLOR);

      let colX = 40;
      doc.text("Ingredient", colX, tableY);
      colX += colWidths.ingredient;
      doc.text("Required", colX, tableY);
      colX += colWidths.required;
      doc.text("Actual", colX, tableY);
      colX += colWidths.actual;
      doc.text("Lot #", colX, tableY);
      colX += colWidths.lot;
      doc.text("Manufacturer", colX, tableY);
      colX += colWidths.mfr;
      doc.text("Expiry", colX, tableY);

      drawHorizontalLine(doc, tableY + 12);

      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(TEXT_COLOR);

      let rowY = tableY + 18;
      let rowCount = 0;

      for (const ing of batchData.ingredients) {
        // Check if we need a new page
        if (rowY > 700) {
          doc.addPage();
          rowY = 40;
          rowCount = 0;
        }

        // Alternate row background
        if (rowCount % 2 === 0) {
          doc.rect(40, rowY - 2, 510, 14).fill(LIGHT_BG).stroke("none");
        }

        colX = 40;
        const ingName = ing.isActiveIngredient
          ? `${ing.itemName} (API)`
          : ing.itemName;
        doc.text(ingName, colX, rowY, { width: colWidths.ingredient - 5 });

        colX += colWidths.ingredient;
        doc.text(`${ing.quantityRequired} ${ing.unit}`, colX, rowY, {
          width: colWidths.required - 5,
          align: "right",
        });

        colX += colWidths.required;
        doc.text(ing.quantityUsed ? `${ing.quantityUsed}` : "—", colX, rowY, {
          width: colWidths.actual - 5,
          align: "right",
        });

        colX += colWidths.actual;
        doc.text(ing.lotNumber || "—", colX, rowY, {
          width: colWidths.lot - 5,
        });

        colX += colWidths.lot;
        doc.text(ing.manufacturer || "—", colX, rowY, {
          width: colWidths.mfr - 5,
        });

        colX += colWidths.mfr;
        doc.text(formatDateShort(ing.expiryDate), colX, rowY, {
          width: colWidths.expiry - 5,
        });

        rowY += 14;
        rowCount++;
      }

      currentY = rowY + 10;

      // ═════════════════════════════════════════════════════════
      // COMPOUNDING STEPS
      // ═════════════════════════════════════════════════════════

      if (currentY > 650) {
        doc.addPage();
        currentY = 40;
      }

      currentY = drawSection(doc, "COMPOUNDING PROCEDURE", currentY);

      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(TEXT_COLOR);

      for (const step of batchData.steps) {
        // Check if we need a new page
        if (currentY > 700) {
          doc.addPage();
          currentY = 40;
        }

        doc.fontSize(9).font("Helvetica-Bold").fillColor(HEADING_COLOR);
        doc.text(`Step ${step.stepNumber}:`, 40, currentY);

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(TEXT_COLOR)
          .text(step.instruction, 60, currentY + 12, {
            width: 490,
          });

        let stepInfoY = currentY + 12 + doc.heightOfString(step.instruction, {
          width: 490,
        });

        if (step.equipment || step.durationMinutes || step.requiresPharmacist) {
          doc.fontSize(7).fillColor("#666666");
          const infoParts = [];
          if (step.equipment) infoParts.push(`Equipment: ${step.equipment}`);
          if (step.durationMinutes)
            infoParts.push(`Duration: ${step.durationMinutes} min`);
          if (step.requiresPharmacist)
            infoParts.push("⚠ Requires Pharmacist Oversight");

          doc.text(infoParts.join(" | "), 60, stepInfoY);
          stepInfoY += 10;
        }

        currentY = stepInfoY + 10;
      }

      // ═════════════════════════════════════════════════════════
      // QUALITY ASSURANCE
      // ═════════════════════════════════════════════════════════

      if (currentY > 650) {
        doc.addPage();
        currentY = 40;
      }

      currentY = drawSection(doc, "QUALITY ASSURANCE CHECKS", currentY);

      if (batchData.qaChecks.length > 0) {
        // QA table
        const qaTableY = currentY;
        const qaColWidths = {
          check: 100,
          expected: 80,
          actual: 80,
          result: 60,
          by: 100,
          date: 70,
        };

        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor(HEADING_COLOR);

        let qaColX = 40;
        doc.text("Check Type", qaColX, qaTableY);
        qaColX += qaColWidths.check;
        doc.text("Expected", qaColX, qaTableY);
        qaColX += qaColWidths.expected;
        doc.text("Actual", qaColX, qaTableY);
        qaColX += qaColWidths.actual;
        doc.text("Result", qaColX, qaTableY);
        qaColX += qaColWidths.result;
        doc.text("Performed By", qaColX, qaTableY);
        qaColX += qaColWidths.by;
        doc.text("Date", qaColX, qaTableY);

        drawHorizontalLine(doc, qaTableY + 12);

        doc
          .fontSize(7)
          .font("Helvetica")
          .fillColor(TEXT_COLOR);

        let qaRowY = qaTableY + 18;
        let qaRowCount = 0;

        for (const qa of batchData.qaChecks) {
          if (qaRowY > 700) {
            doc.addPage();
            qaRowY = 40;
            qaRowCount = 0;
          }

          if (qaRowCount % 2 === 0) {
            doc
              .rect(40, qaRowY - 2, 510, 14)
              .fill(LIGHT_BG)
              .stroke("none");
          }

          qaColX = 40;
          doc.text(qa.checkType, qaColX, qaRowY, {
            width: qaColWidths.check - 5,
          });

          qaColX += qaColWidths.check;
          doc.text(qa.expectedValue || "—", qaColX, qaRowY, {
            width: qaColWidths.expected - 5,
          });

          qaColX += qaColWidths.expected;
          doc.text(qa.actualValue || "—", qaColX, qaRowY, {
            width: qaColWidths.actual - 5,
          });

          qaColX += qaColWidths.actual;
          const resultColor =
            qa.result === "pass"
              ? "#10b981"
              : qa.result === "fail"
                ? "#ef4444"
                : "#f59e0b";
          doc.fillColor(resultColor).text(qa.result.toUpperCase(), qaColX, qaRowY, {
            width: qaColWidths.result - 5,
            align: "center",
          });
          doc.fillColor(TEXT_COLOR);

          qaColX += qaColWidths.result;
          doc.text(
            `${qa.performedBy.firstName} ${qa.performedBy.lastName}`,
            qaColX,
            qaRowY,
            { width: qaColWidths.by - 5 }
          );

          qaColX += qaColWidths.by;
          doc.text(formatDateShort(qa.performedAt), qaColX, qaRowY, {
            width: qaColWidths.date - 5,
          });

          qaRowY += 14;
          qaRowCount++;
        }

        currentY = qaRowY + 10;
      } else {
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#999999")
          .text("No QA checks recorded yet.", 40, currentY);
        currentY += 20;
      }

      // ═════════════════════════════════════════════════════════
      // SIGN-OFF SECTION
      // ═════════════════════════════════════════════════════════

      if (currentY > 600) {
        doc.addPage();
        currentY = 40;
      }

      currentY = drawSection(doc, "SIGN-OFF", currentY);

      // Compounder signature line
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(HEADING_COLOR)
        .text("Compounded By (Technician):", 40, currentY);

      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(TEXT_COLOR)
        .text(
          `${batchData.compoundedBy.firstName} ${batchData.compoundedBy.lastName}`,
          40,
          currentY + 16
        );

      if (batchData.compoundedBy.licenseNumber) {
        doc
          .fontSize(7)
          .fillColor("#666666")
          .text(`License: ${batchData.compoundedBy.licenseNumber}`, 40, currentY + 28);
      }

      doc
        .moveTo(40, currentY + 42)
        .lineTo(150, currentY + 42)
        .stroke(BORDER_COLOR);
      doc
        .fontSize(7)
        .fillColor("#666666")
        .text("Signature", 40, currentY + 46);

      doc
        .fontSize(7)
        .fillColor("#666666")
        .text(formatDateShort(batchData.compoundedAt), 40, currentY + 58);
      doc.text("Date", 40, currentY + 64);

      // Verifier signature line
      if (batchData.verifiedBy) {
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor(HEADING_COLOR)
          .text("Verified By (Pharmacist):", 300, currentY);

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(TEXT_COLOR)
          .text(
            `${batchData.verifiedBy.firstName} ${batchData.verifiedBy.lastName}`,
            300,
            currentY + 16
          );

        if (batchData.verifiedBy.licenseNumber) {
          doc
            .fontSize(7)
            .fillColor("#666666")
            .text(
              `License: ${batchData.verifiedBy.licenseNumber}`,
              300,
              currentY + 28
            );
        }

        doc
          .moveTo(300, currentY + 42)
          .lineTo(410, currentY + 42)
          .stroke(BORDER_COLOR);
        doc
          .fontSize(7)
          .fillColor("#666666")
          .text("Signature", 300, currentY + 46);

        doc
          .fontSize(7)
          .fillColor("#666666")
          .text(formatDateShort(batchData.verifiedAt), 300, currentY + 58);
        doc.text("Date", 300, currentY + 64);
      } else {
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#999999")
          .text("(Pending pharmacist verification)", 300, currentY + 16);
      }

      // ═════════════════════════════════════════════════════════
      // STORAGE & NOTES
      // ═════════════════════════════════════════════════════════

      currentY += 80;

      if (currentY > 650) {
        doc.addPage();
        currentY = 40;
      }

      if (batchData.storageConditions) {
        currentY = drawSection(doc, "STORAGE CONDITIONS", currentY);
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(TEXT_COLOR)
          .text(batchData.storageConditions, 40, currentY, { width: 510 });
        currentY += doc.heightOfString(batchData.storageConditions, {
          width: 510,
        });
      }

      if (batchData.environmentConditions.temperature !== null ||
        batchData.environmentConditions.humidity !== null
      ) {
        currentY += 15;
        currentY = drawSection(doc, "ENVIRONMENT CONDITIONS", currentY);

        if (batchData.environmentConditions.temperature !== null) {
          doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor(TEXT_COLOR)
            .text(
              `Temperature: ${batchData.environmentConditions.temperature}°F`,
              40,
              currentY
            );
          currentY += 15;
        }

        if (batchData.environmentConditions.humidity !== null) {
          doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor(TEXT_COLOR)
            .text(
              `Humidity: ${batchData.environmentConditions.humidity}%`,
              40,
              currentY
            );
          currentY += 15;
        }
      }

      if (batchData.notes) {
        currentY += 15;
        currentY = drawSection(doc, "NOTES", currentY);
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(TEXT_COLOR)
          .text(batchData.notes, 40, currentY, { width: 510 });
      }

      // ═════════════════════════════════════════════════════════
      // FOOTER
      // ═════════════════════════════════════════════════════════

      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor("#999999")
        .text(
          `Generated: ${new Date().toLocaleString()} | Batch Record for ${batchData.batchNumber}`,
          40,
          750,
          { align: "center" }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
