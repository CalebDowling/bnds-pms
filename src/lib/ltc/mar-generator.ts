/**
 * MAR (Medication Administration Record) Generator
 *
 * Generates PDF MARs for LTC facilities. A MAR is a grid-based document
 * showing each resident's medications and the times they should be
 * administered across a date range (typically 1 month).
 *
 * Layout per page:
 *   Header:  Facility name, wing, date range, generated timestamp
 *   Patient: Name, DOB, room/bed, allergies, physician
 *   Grid:    Medication rows × date columns with admin time slots
 *   Footer:  Signature line, page number
 */

import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Brand + Colors
// ---------------------------------------------------------------------------
const PRIMARY_COLOR = "#40721D";   // Boudreaux's green
const HEADING_COLOR = "#000000";
const TEXT_COLOR = "#333333";
const GRID_COLOR = "#D1D5DB";
const LIGHT_BG = "#F3F4F6";
const ADMIN_TIMES_BG = "#EFF6FF";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MARRequest {
  facilityId: string;
  wingId?: string;        // Optional — generate for specific wing
  patientId?: string;     // Optional — generate for single patient
  startDate: Date;        // First day of the MAR period
  endDate: Date;          // Last day of the MAR period
  generatedBy: string;    // User ID
}

export interface MARMedication {
  rxNumber: string;
  drugName: string;
  strength?: string;
  sig: string;            // Directions
  prescriber: string;
  startDate: Date | null;
  endDate: Date | null;
  frequency: string;      // BID, TID, QD, PRN, etc.
  route?: string;         // PO, IM, SC, etc.
  quantity: number;
  refillsRemaining: number;
  isCompound: boolean;
}

export interface MARPatient {
  id: string;
  name: string;
  dob: string;
  mrn?: string;
  room?: string;
  bed?: string;
  allergies: string;
  physician?: string;
  medications: MARMedication[];
}

export interface MARResult {
  buffer: Buffer;
  facilityName: string;
  wingName?: string;
  patientCount: number;
  medicationCount: number;
  pageCount: number;
  startDate: string;
  endDate: string;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchMARData(request: MARRequest): Promise<{
  facility: { name: string; phone: string | null; fax: string | null };
  wing?: { name: string };
  patients: MARPatient[];
}> {
  const facility = await prisma.facility.findUnique({
    where: { id: request.facilityId },
  });

  if (!facility) throw new Error("Facility not found");

  let wing: { name: string } | undefined;
  if (request.wingId) {
    const w = await prisma.facilityWing.findUnique({
      where: { id: request.wingId },
    });
    if (w) wing = { name: w.name };
  }

  // Build patient filter
  const patientWhere: any = {
    facilityId: request.facilityId,
    isActive: true,
  };
  if (request.wingId) patientWhere.wingId = request.wingId;
  if (request.patientId) patientWhere.id = request.patientId;

  // Fetch patients with their active prescriptions
  const patients = await prisma.patient.findMany({
    where: patientWhere,
    include: {
      room: true,
      allergies: true,
      prescriptions: {
        where: {
          isActive: true,
          // Only include prescriptions that overlap with the MAR date range
          OR: [
            { expirationDate: null },
            { expirationDate: { gte: request.startDate } },
          ],
        },
        include: {
          item: true,
          formula: true,
          prescriber: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [
      { room: { roomNumber: "asc" } },
      { lastName: "asc" },
      { firstName: "asc" },
    ],
  });

  const marPatients: MARPatient[] = patients.map((p) => ({
    id: p.id,
    name: `${p.lastName}, ${p.firstName}`,
    dob: p.dateOfBirth
      ? new Intl.DateTimeFormat("en-US").format(new Date(p.dateOfBirth))
      : "Unknown",
    mrn: p.mrn || undefined,
    room: p.room?.roomNumber || undefined,
    allergies: p.allergies.map((a) => a.allergen).join(", ") || "NKDA",
    physician: p.prescriptions[0]?.prescriber
      ? `${p.prescriptions[0].prescriber.lastName}, ${p.prescriptions[0].prescriber.firstName}`
      : undefined,
    medications: p.prescriptions.map((rx) => ({
      rxNumber: rx.rxNumber || "",
      drugName: rx.item?.name || rx.formula?.name || "Unknown",
      strength: rx.item?.strength || undefined,
      sig: rx.directions || "",
      prescriber: rx.prescriber
        ? `Dr. ${rx.prescriber.lastName}`
        : "Unknown",
      startDate: rx.dateWritten,
      endDate: rx.expirationDate,
      frequency: extractFrequency(rx.directions || ""),
      route: extractRoute(rx.directions || ""),
      quantity: Number(rx.quantityPrescribed) || 0,
      refillsRemaining: rx.refillsRemaining || 0,
      isCompound: !!rx.formulaId,
    })),
  }));

  return {
    facility: { name: facility.name, phone: facility.phone, fax: facility.fax },
    wing,
    patients: marPatients,
  };
}

// ---------------------------------------------------------------------------
// Frequency / Route extraction from SIG text
// ---------------------------------------------------------------------------

function extractFrequency(sig: string): string {
  const s = sig.toUpperCase();
  if (s.includes("QID") || s.includes("4 TIMES")) return "QID";
  if (s.includes("TID") || s.includes("3 TIMES") || s.includes("THREE TIMES")) return "TID";
  if (s.includes("BID") || s.includes("TWICE") || s.includes("2 TIMES")) return "BID";
  if (s.includes("QHS") || s.includes("AT BEDTIME") || s.includes("BEDTIME")) return "QHS";
  if (s.includes("QAM") || s.includes("EVERY MORNING") || s.includes("IN THE MORNING")) return "QAM";
  if (s.includes("Q12H") || s.includes("EVERY 12")) return "Q12H";
  if (s.includes("Q8H") || s.includes("EVERY 8")) return "Q8H";
  if (s.includes("Q6H") || s.includes("EVERY 6")) return "Q6H";
  if (s.includes("Q4H") || s.includes("EVERY 4")) return "Q4H";
  if (s.includes("PRN") || s.includes("AS NEEDED")) return "PRN";
  if (s.includes("DAILY") || s.includes("QD") || s.includes("ONCE A DAY")) return "QD";
  if (s.includes("WEEKLY") || s.includes("QW")) return "QW";
  return "QD"; // Default
}

function extractRoute(sig: string): string {
  const s = sig.toUpperCase();
  if (s.includes("BY MOUTH") || s.includes("ORAL") || s.includes("PO")) return "PO";
  if (s.includes("SUBLINGUAL") || s.includes("SL")) return "SL";
  if (s.includes("TOPICAL") || s.includes("APPLY")) return "TOP";
  if (s.includes("INTRAMUSCULAR") || s.includes("IM")) return "IM";
  if (s.includes("SUBCUTANEOUS") || s.includes("SC") || s.includes("SQ")) return "SC";
  if (s.includes("INTRAVENOUS") || s.includes("IV")) return "IV";
  if (s.includes("OPHTHALMIC") || s.includes("EYE")) return "OPH";
  if (s.includes("OTIC") || s.includes("EAR")) return "OTC";
  if (s.includes("NASAL") || s.includes("NOSE")) return "NAS";
  if (s.includes("RECTAL") || s.includes("PR")) return "PR";
  if (s.includes("INHAL") || s.includes("NEBUL")) return "INH";
  if (s.includes("PATCH") || s.includes("TRANSDERMAL")) return "TD";
  return "PO";
}

// ---------------------------------------------------------------------------
// Admin time slots based on frequency
// ---------------------------------------------------------------------------

function getAdminTimes(frequency: string): string[] {
  switch (frequency) {
    case "QD":   return ["0800"];
    case "QAM":  return ["0800"];
    case "QHS":  return ["2100"];
    case "BID":  return ["0800", "2000"];
    case "TID":  return ["0800", "1200", "1800"];
    case "QID":  return ["0800", "1200", "1800", "2100"];
    case "Q12H": return ["0800", "2000"];
    case "Q8H":  return ["0600", "1400", "2200"];
    case "Q6H":  return ["0600", "1200", "1800", "0000"];
    case "Q4H":  return ["0600", "1000", "1400", "1800", "2200", "0200"];
    case "QW":   return ["0800"];
    case "PRN":  return ["PRN"];
    default:     return ["0800"];
  }
}

// ---------------------------------------------------------------------------
// PDF Generation
// ---------------------------------------------------------------------------

export async function generateMAR(request: MARRequest): Promise<MARResult> {
  const { facility, wing, patients } = await fetchMARData(request);

  // Calculate days in range
  const msPerDay = 86400000;
  const days: Date[] = [];
  let d = new Date(request.startDate);
  while (d <= request.endDate) {
    days.push(new Date(d));
    d = new Date(d.getTime() + msPerDay);
  }

  // Limit to 31 days max for layout
  const displayDays = days.slice(0, 31);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape",
        margin: 30,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("error", reject);

      let pageCount = 0;
      let totalMedCount = 0;

      const PAGE_W = 792; // Letter landscape width
      const PAGE_H = 612; // Letter landscape height
      const MARGIN = 30;
      const CONTENT_W = PAGE_W - 2 * MARGIN;

      // Date column calculations
      const MED_COL_W = 220; // Medication info column width
      const DATE_AREA_W = CONTENT_W - MED_COL_W;
      const DATE_COL_W = Math.floor(DATE_AREA_W / displayDays.length);
      const ROW_H = 36; // Height per medication row (includes admin time sub-rows)
      const HEADER_H = 120; // Patient header area

      // Process each patient
      for (let pi = 0; pi < patients.length; pi++) {
        const patient = patients[pi];
        if (patient.medications.length === 0) continue;

        totalMedCount += patient.medications.length;

        // Calculate how many med rows fit per page
        const availableH = PAGE_H - MARGIN - HEADER_H - 60; // 60 for footer
        const medsPerPage = Math.floor(availableH / ROW_H);

        // Paginate medications
        for (let medStart = 0; medStart < patient.medications.length; medStart += medsPerPage) {
          if (pi > 0 || medStart > 0) doc.addPage();
          pageCount++;

          const pageMeds = patient.medications.slice(medStart, medStart + medsPerPage);
          let y = MARGIN;

          // ───── Facility Header ─────
          doc
            .fontSize(14)
            .font("Helvetica-Bold")
            .fillColor(PRIMARY_COLOR)
            .text("MEDICATION ADMINISTRATION RECORD", MARGIN, y, {
              align: "center",
              width: CONTENT_W,
            });
          y += 20;

          doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor(TEXT_COLOR)
            .text(facility.name, MARGIN, y)
            .text(
              `${formatDate(request.startDate)} — ${formatDate(request.endDate)}`,
              MARGIN,
              y,
              { align: "right", width: CONTENT_W }
            );
          y += 14;

          if (wing) {
            doc.text(`Wing: ${wing.name}`, MARGIN, y);
          }
          doc.text(
            `Generated: ${new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date())}`,
            MARGIN,
            y,
            { align: "right", width: CONTENT_W }
          );
          y += 18;

          // ───── Patient Info Box ─────
          doc
            .rect(MARGIN, y, CONTENT_W, 42)
            .fill(LIGHT_BG)
            .stroke(GRID_COLOR);

          doc.fillColor(HEADING_COLOR);
          const boxY = y + 6;

          doc.fontSize(11).font("Helvetica-Bold").text(patient.name, MARGIN + 8, boxY);

          doc.fontSize(8).font("Helvetica").fillColor(TEXT_COLOR);
          doc.text(`DOB: ${patient.dob}`, MARGIN + 8, boxY + 16);
          if (patient.mrn) doc.text(`MRN: ${patient.mrn}`, MARGIN + 140, boxY + 16);
          if (patient.room) doc.text(`Room: ${patient.room}`, MARGIN + 260, boxY + 16);
          if (patient.physician) doc.text(`Physician: ${patient.physician}`, MARGIN + 360, boxY + 16);

          // Allergies (highlighted if present)
          const allergyText = `Allergies: ${patient.allergies}`;
          if (patient.allergies !== "NKDA") {
            doc
              .fontSize(8)
              .font("Helvetica-Bold")
              .fillColor("#DC2626") // Red for allergy alert
              .text(allergyText, MARGIN + 8, boxY + 28);
          } else {
            doc.fontSize(8).font("Helvetica").fillColor(TEXT_COLOR).text(allergyText, MARGIN + 8, boxY + 28);
          }

          y += 50;

          // ───── Grid Header: Date columns ─────
          const gridTop = y;

          // Medication info header
          doc
            .rect(MARGIN, gridTop, MED_COL_W, 22)
            .fill(PRIMARY_COLOR);
          doc
            .fontSize(8)
            .font("Helvetica-Bold")
            .fillColor("#FFFFFF")
            .text("Medication / Sig / Rx#", MARGIN + 4, gridTop + 6, { width: MED_COL_W - 8 });

          // Date column headers
          for (let di = 0; di < displayDays.length; di++) {
            const dx = MARGIN + MED_COL_W + di * DATE_COL_W;
            doc
              .rect(dx, gridTop, DATE_COL_W, 22)
              .fill(di % 2 === 0 ? PRIMARY_COLOR : "#4A8524");

            const dayNum = displayDays[di].getDate().toString();
            doc
              .fontSize(7)
              .font("Helvetica-Bold")
              .fillColor("#FFFFFF")
              .text(dayNum, dx, gridTop + 3, { width: DATE_COL_W, align: "center" });

            // Day of week abbreviation
            const dow = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][displayDays[di].getDay()];
            doc
              .fontSize(5)
              .text(dow, dx, gridTop + 13, { width: DATE_COL_W, align: "center" });
          }

          y = gridTop + 22;

          // ───── Medication rows ─────
          for (let mi = 0; mi < pageMeds.length; mi++) {
            const med = pageMeds[mi];
            const adminTimes = getAdminTimes(med.frequency);
            const rowHeight = Math.max(ROW_H, adminTimes.length * 12 + 8);
            const rowBg = mi % 2 === 0 ? "#FFFFFF" : LIGHT_BG;

            // Medication info cell
            doc.rect(MARGIN, y, MED_COL_W, rowHeight).fill(rowBg).stroke(GRID_COLOR);

            doc.fillColor(HEADING_COLOR).fontSize(8).font("Helvetica-Bold");
            const drugLine = med.strength
              ? `${med.drugName} ${med.strength}`
              : med.drugName;
            doc.text(drugLine, MARGIN + 4, y + 3, { width: MED_COL_W - 8 });

            doc.fillColor(TEXT_COLOR).fontSize(6).font("Helvetica");
            doc.text(`SIG: ${truncate(med.sig, 60)}`, MARGIN + 4, y + 14, { width: MED_COL_W - 8 });
            doc.text(
              `Rx#: ${med.rxNumber}  |  ${med.route || "PO"}  |  ${med.frequency}  |  Dr. ${med.prescriber}`,
              MARGIN + 4,
              y + 22,
              { width: MED_COL_W - 8 }
            );

            // Admin time labels on left edge of grid
            for (let ti = 0; ti < adminTimes.length; ti++) {
              const timeY = y + 4 + ti * 12;
              const timeX = MARGIN + MED_COL_W - 30;
              doc.fontSize(6).font("Helvetica-Bold").fillColor("#6B7280");
              doc.text(adminTimes[ti], timeX, timeY, { width: 26, align: "right" });
            }

            // Date cells (empty grid for nurse initials)
            for (let di = 0; di < displayDays.length; di++) {
              const dx = MARGIN + MED_COL_W + di * DATE_COL_W;
              doc.rect(dx, y, DATE_COL_W, rowHeight).stroke(GRID_COLOR);

              // Draw light horizontal lines for each admin time slot
              for (let ti = 1; ti < adminTimes.length; ti++) {
                const lineY = y + ti * (rowHeight / adminTimes.length);
                doc
                  .moveTo(dx, lineY)
                  .lineTo(dx + DATE_COL_W, lineY)
                  .dash(2, { space: 2 })
                  .stroke("#E5E7EB")
                  .undash();
              }
            }

            y += rowHeight;
          }

          // ───── Footer ─────
          const footerY = PAGE_H - 50;
          doc.moveTo(MARGIN, footerY).lineTo(MARGIN + CONTENT_W, footerY).stroke(GRID_COLOR);

          doc.fontSize(7).font("Helvetica").fillColor(TEXT_COLOR);
          doc.text("Nurse Signature: ___________________________    Date: __________", MARGIN, footerY + 8);
          doc.text(
            `Page ${pageCount}   |   ${facility.name}   |   ${patient.name}`,
            MARGIN,
            footerY + 8,
            { align: "right", width: CONTENT_W }
          );

          // Legend
          doc.text(
            "Admin Times: 0600=6AM  0800=8AM  1200=Noon  1400=2PM  1800=6PM  2000=8PM  2100=9PM  2200=10PM  PRN=As Needed",
            MARGIN,
            footerY + 22,
            { width: CONTENT_W }
          );
        }
      }

      // Handle case where no patients have medications
      if (pageCount === 0) {
        pageCount = 1;
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor(PRIMARY_COLOR)
          .text("MEDICATION ADMINISTRATION RECORD", MARGIN, 40, {
            align: "center",
            width: CONTENT_W,
          });
        doc
          .fontSize(12)
          .font("Helvetica")
          .fillColor(TEXT_COLOR)
          .text(`\n\n${facility.name}`, { align: "center" });
        if (wing) doc.text(`Wing: ${wing.name}`, { align: "center" });
        doc.text(
          `\nPeriod: ${formatDate(request.startDate)} — ${formatDate(request.endDate)}`,
          { align: "center" }
        );
        doc
          .moveDown(2)
          .text("No active medications found for residents in this facility/wing.", {
            align: "center",
          });
      }

      doc.end();

      doc.on("end", () => {
        resolve({
          buffer: Buffer.concat(chunks),
          facilityName: facility.name,
          wingName: wing?.name,
          patientCount: patients.filter((p) => p.medications.length > 0).length,
          medicationCount: totalMedCount,
          pageCount,
          startDate: formatDate(request.startDate),
          endDate: formatDate(request.endDate),
        });
      });
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max - 1) + "…" : str;
}
