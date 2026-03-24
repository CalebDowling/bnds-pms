import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import PDFDocument from "pdfkit";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tab = request.nextUrl.searchParams.get("tab") || "fills";
  const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const startDate = request.nextUrl.searchParams.get("startDate") || "";
  const endDate = request.nextUrl.searchParams.get("endDate") || "";

  const { prisma } = await import("@/lib/prisma");

  const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 40 });
  const chunks: Uint8Array[] = [];

  doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));

  // Header
  doc.fontSize(18).font("Helvetica-Bold").text("Boudreaux's New Drug Store", { align: "center" });
  doc.fontSize(10).font("Helvetica").text("Pharmacy Management System", { align: "center" });
  doc.moveDown(0.5);

  if (tab === "fills") {
    doc.fontSize(14).font("Helvetica-Bold").text(`Daily Fill Report — ${date}`);
    doc.moveDown(0.5);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const fills = await prisma.prescriptionFill.findMany({
      where: { createdAt: { gte: targetDate, lt: nextDay } },
      include: {
        prescription: {
          include: {
            patient: { select: { firstName: true, lastName: true } },
            item: { select: { name: true, strength: true } },
            formula: { select: { name: true } },
          },
        },
        itemLot: { select: { lotNumber: true } },
        batch: { select: { batchNumber: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Table header
    const cols = ["Time", "Rx#", "Patient", "Drug", "Qty", "Lot/Batch", "Fill#", "Status"];
    const colWidths = [60, 60, 120, 160, 40, 80, 50, 60];
    let y = doc.y;

    doc.fontSize(8).font("Helvetica-Bold");
    cols.forEach((col, i) => {
      const x = 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(col, x, y, { width: colWidths[i] });
    });

    doc.moveTo(40, y + 12).lineTo(720, y + 12).stroke("#ccc");
    y = y + 16;

    // Table rows
    doc.font("Helvetica").fontSize(8);
    for (const fill of fills) {
      if (y > 560) {
        doc.addPage();
        y = 40;
      }
      const row = [
        new Date(fill.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        fill.prescription.rxNumber || "",
        `${fill.prescription.patient.lastName}, ${fill.prescription.patient.firstName}`,
        fill.prescription.item?.name || fill.prescription.formula?.name || "—",
        String(Number(fill.quantity)),
        fill.itemLot?.lotNumber || fill.batch?.batchNumber || "—",
        `#${fill.fillNumber}`,
        fill.status,
      ];
      row.forEach((cell, i) => {
        const x = 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(cell, x, y, { width: colWidths[i] });
      });
      y += 14;
    }

    doc.moveDown(1);
    doc.fontSize(9).font("Helvetica").text(`Total fills: ${fills.length}`, 40);
  } else if (tab === "inventory") {
    doc.fontSize(14).font("Helvetica-Bold").text("Inventory Report");
    doc.moveDown(0.5);

    const items = await prisma.item.findMany({
      where: { isActive: true },
      select: {
        name: true,
        strength: true,
        ndc: true,
        reorderPoint: true,
        unitOfMeasure: true,
        _count: { select: { lots: true } },
      },
      orderBy: { name: "asc" },
      take: 100,
    });

    const cols = ["Item", "Strength", "NDC", "Reorder Pt", "Lots", "Unit"];
    const colWidths = [200, 80, 100, 70, 50, 60];
    let y = doc.y;

    doc.fontSize(8).font("Helvetica-Bold");
    cols.forEach((col, i) => {
      const x = 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(col, x, y, { width: colWidths[i] });
    });
    doc.moveTo(40, y + 12).lineTo(720, y + 12).stroke("#ccc");
    y = y + 16;

    doc.font("Helvetica").fontSize(8);
    for (const item of items) {
      if (y > 560) {
        doc.addPage();
        y = 40;
      }
      const row = [
        item.name,
        item.strength || "—",
        item.ndc || "—",
        item.reorderPoint != null ? String(item.reorderPoint) : "—",
        String(item._count.lots),
        item.unitOfMeasure || "—",
      ];
      row.forEach((cell, i) => {
        const x = 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(cell, x, y, { width: colWidths[i] });
      });
      y += 14;
    }
  }

  // Footer
  doc.fontSize(7).font("Helvetica").text(
    `Generated ${new Date().toLocaleString("en-US")} — BNDS PMS`,
    40,
    580,
    { align: "center", width: 680 }
  );

  doc.end();

  // Collect all chunks
  const pdf = await new Promise<Buffer>((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-${tab}-${date || startDate}.pdf"`,
    },
  });
}
