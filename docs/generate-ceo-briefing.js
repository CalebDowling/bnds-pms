const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat, ExternalHyperlink,
  TabStopType, TabStopPosition,
} = require("docx");

// ─── Color Palette ───────────────────────────────
const GREEN = "40721D";
const DARK_GREEN = "2D5114";
const LIGHT_GREEN = "E8F5E0";
const DARK_GRAY = "333333";
const MED_GRAY = "666666";
const LIGHT_GRAY = "F5F5F5";
const WHITE = "FFFFFF";
const BORDER_COLOR = "CCCCCC";

// ─── Helpers ─────────────────────────────────────
const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };
const TABLE_WIDTH = 9360;

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: GREEN, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, font: "Arial", size: 20 })] })],
  });
}

function cell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({
      children: [new TextRun({ text, font: "Arial", size: 20, bold: opts.bold, color: opts.color || DARK_GRAY })],
      alignment: opts.align,
    })],
  });
}

function sectionTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 32, color: GREEN })],
  });
}

function subTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 26, color: DARK_GREEN })],
  });
}

function bodyText(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: MED_GRAY, ...opts })],
  });
}

function bulletItem(text, reference = "bullets") {
  return new Paragraph({
    numbering: { reference, level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: DARK_GRAY })],
  });
}

function spacer(height = 200) {
  return new Paragraph({ spacing: { after: height }, children: [] });
}

function greenDivider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GREEN, space: 1 } },
    children: [],
  });
}

// ─── Document ────────────────────────────────────
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: GREEN },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: DARK_GREEN },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    // ─── COVER PAGE ──────────────────────────────
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        spacer(2000),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "BOUDREAUX'S NEW DRUG STORE", font: "Arial", size: 20, bold: true, color: MED_GRAY, allCaps: true, characterSpacing: 200 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 20 } },
          children: [new TextRun({ text: "Pharmacy Management System", font: "Arial", size: 56, bold: true, color: GREEN })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 300, after: 100 },
          children: [new TextRun({ text: "Executive Launch Briefing", font: "Arial", size: 32, color: DARK_GRAY })],
        }),
        spacer(400),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "Prepared for CEO Review", font: "Arial", size: 22, color: MED_GRAY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "March 2026", font: "Arial", size: 22, color: MED_GRAY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "CONFIDENTIAL", font: "Arial", size: 18, bold: true, color: "CC0000", allCaps: true })],
        }),
        spacer(1500),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "pms.bndsrx.com", font: "Arial", size: 22, color: GREEN, bold: true })],
        }),
      ],
    },

    // ─── MAIN CONTENT ────────────────────────────
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "BNDS PMS  |  Executive Launch Briefing", font: "Arial", size: 16, color: MED_GRAY }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: GREEN, space: 4 } },
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Confidential  |  Page ", font: "Arial", size: 16, color: MED_GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: MED_GRAY }),
            ],
          })],
        }),
      },
      children: [
        // ─── EXECUTIVE SUMMARY ───────────────────
        sectionTitle("1. Executive Summary"),
        bodyText("The BNDS Pharmacy Management System (PMS) is a custom-built, cloud-native platform designed to replace our current DRX pharmacy software. Built from the ground up specifically for Boudreaux's compounding pharmacy operations, it provides complete control over our prescription workflow, inventory, billing, patient engagement, and compliance."),
        spacer(100),
        bodyText("Key advantages over DRX:", { bold: true, color: DARK_GRAY }),
        bulletItem("Full customization and ownership of the codebase"),
        bulletItem("Compounding-first design with formula versioning and batch tracking"),
        bulletItem("Modern cloud architecture with 99.9% uptime SLA"),
        bulletItem("Integrated patient and prescriber portals"),
        bulletItem("Real-time queue management and operational dashboards"),
        bulletItem("HIPAA-compliant infrastructure with end-to-end encryption"),
        bulletItem("Estimated 40-60% reduction in per-station software licensing costs"),

        greenDivider(),

        // ─── WHAT IT DOES ────────────────────────
        sectionTitle("2. What the System Does"),
        bodyText("The PMS manages the complete lifecycle of pharmacy operations across 24 integrated modules:"),
        spacer(100),

        new Table({
          width: { size: TABLE_WIDTH, type: WidthType.DXA },
          columnWidths: [3120, 3120, 3120],
          rows: [
            new TableRow({ children: [headerCell("Clinical Operations", 3120), headerCell("Business Operations", 3120), headerCell("Patient Engagement", 3120)] }),
            new TableRow({ children: [
              cell("Prescription Management", 3120, { shading: LIGHT_GREEN }),
              cell("Point of Sale (POS)", 3120, { shading: LIGHT_GREEN }),
              cell("Patient Portal", 3120, { shading: LIGHT_GREEN }),
            ]}),
            new TableRow({ children: [cell("Intake Queue", 3120), cell("Insurance Claims", 3120), cell("Prescriber Portal", 3120)] }),
            new TableRow({ children: [
              cell("Compounding & Batches", 3120, { shading: LIGHT_GREEN }),
              cell("Billing & Payments", 3120, { shading: LIGHT_GREEN }),
              cell("SMS/Voice Notifications", 3120, { shading: LIGHT_GREEN }),
            ]}),
            new TableRow({ children: [cell("Inventory & Lots", 3120), cell("Reports & Analytics", 3120), cell("Refill Requests", 3120)] }),
            new TableRow({ children: [
              cell("Drug Verification", 3120, { shading: LIGHT_GREEN }),
              cell("Shipping & Delivery", 3120, { shading: LIGHT_GREEN }),
              cell("Messaging & Comms", 3120, { shading: LIGHT_GREEN }),
            ]}),
            new TableRow({ children: [cell("E-Prescribing (ERX)", 3120), cell("Staff & Access Mgmt", 3120), cell("Pickup Notifications", 3120)] }),
          ],
        }),

        spacer(200),
        bodyText("The system processes prescriptions from intake through fulfillment, manages real-time inventory with lot tracking and expiration alerts, handles insurance claim submission and adjudication, and provides comprehensive reporting for operational decision-making."),

        greenDivider(),

        // ─── TECHNOLOGY & SYSTEMS ────────────────
        sectionTitle("3. Technology Stack & Systems"),
        bodyText("The platform is built on modern, enterprise-grade cloud services:"),
        spacer(100),

        new Table({
          width: { size: TABLE_WIDTH, type: WidthType.DXA },
          columnWidths: [2400, 3000, 3960],
          rows: [
            new TableRow({ children: [headerCell("Component", 2400), headerCell("Provider", 3000), headerCell("Purpose", 3960)] }),
            new TableRow({ children: [cell("Web Application", 2400, { bold: true }), cell("Next.js 16 + React 19", 3000), cell("User interface and application logic", 3960)] }),
            new TableRow({ children: [cell("Database", 2400, { bold: true, shading: LIGHT_GRAY }), cell("Supabase (PostgreSQL)", 3000, { shading: LIGHT_GRAY }), cell("55-table relational database with real-time sync", 3960, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Hosting", 2400, { bold: true }), cell("Vercel", 3000), cell("Global CDN, auto-scaling, SSL certificates", 3960)] }),
            new TableRow({ children: [cell("Communications", 2400, { bold: true, shading: LIGHT_GRAY }), cell("Twilio", 3000, { shading: LIGHT_GRAY }), cell("SMS, voice calls, and fax for patient comms", 3960, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Payments", 2400, { bold: true }), cell("Stripe", 3000), cell("POS transactions, patient portal payments", 3960)] }),
            new TableRow({ children: [cell("Error Monitoring", 2400, { bold: true, shading: LIGHT_GRAY }), cell("Sentry", 3000, { shading: LIGHT_GRAY }), cell("Real-time error tracking and performance monitoring", 3960, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Shipping", 2400, { bold: true }), cell("USPS / UPS / FedEx", 3000), cell("Rate quotes, label printing, package tracking", 3960)] }),
            new TableRow({ children: [cell("E-Prescribing", 2400, { bold: true, shading: LIGHT_GRAY }), cell("SureScripts / NCPDP", 3000, { shading: LIGHT_GRAY }), cell("Electronic prescriptions and insurance claims", 3960, { shading: LIGHT_GRAY })] }),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ─── PRICING ─────────────────────────────
        sectionTitle("4. Monthly Cost Breakdown"),
        bodyText("All infrastructure costs are subscription-based with no long-term contracts:"),
        spacer(100),

        new Table({
          width: { size: TABLE_WIDTH, type: WidthType.DXA },
          columnWidths: [3000, 2400, 1800, 2160],
          rows: [
            new TableRow({ children: [headerCell("Service", 3000), headerCell("Plan", 2400), headerCell("Monthly Cost", 1800), headerCell("Notes", 2160)] }),
            new TableRow({ children: [cell("Vercel (Hosting)", 3000, { bold: true }), cell("Pro", 2400), cell("$20/mo", 1800, { bold: true }), cell("Per team member", 2160)] }),
            new TableRow({ children: [cell("Supabase (Database)", 3000, { bold: true, shading: LIGHT_GRAY }), cell("Pro", 2400, { shading: LIGHT_GRAY }), cell("$25/mo", 1800, { bold: true, shading: LIGHT_GRAY }), cell("8GB RAM, PITR backups", 2160, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Twilio (SMS/Voice)", 3000, { bold: true }), cell("Pay-as-you-go", 2400), cell("~$50-150/mo", 1800, { bold: true }), cell("Based on message volume", 2160)] }),
            new TableRow({ children: [cell("Stripe (Payments)", 3000, { bold: true, shading: LIGHT_GRAY }), cell("Standard", 2400, { shading: LIGHT_GRAY }), cell("2.9% + $0.30/tx", 1800, { bold: true, shading: LIGHT_GRAY }), cell("Per transaction", 2160, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Sentry (Monitoring)", 3000, { bold: true }), cell("Team", 2400), cell("$26/mo", 1800, { bold: true }), cell("50K events/mo", 2160)] }),
            new TableRow({ children: [cell("Domain (bndsrx.com)", 3000, { bold: true, shading: LIGHT_GRAY }), cell("Annual", 2400, { shading: LIGHT_GRAY }), cell("~$1/mo", 1800, { bold: true, shading: LIGHT_GRAY }), cell("Already owned", 2160, { shading: LIGHT_GRAY })] }),
          ],
        }),

        spacer(200),

        new Table({
          width: { size: TABLE_WIDTH, type: WidthType.DXA },
          columnWidths: [6000, 3360],
          rows: [
            new TableRow({ children: [
              new TableCell({ borders, width: { size: 6000, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: "ESTIMATED TOTAL MONTHLY COST", bold: true, color: WHITE, font: "Arial", size: 22 })] })] }),
              new TableCell({ borders, width: { size: 3360, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: cellMargins,
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "$125 - $225 / month", bold: true, color: WHITE, font: "Arial", size: 24 })] })] }),
            ] }),
          ],
        }),

        spacer(200),
        bodyText("Note: DRX licensing for comparable functionality runs $300-500+/month per station. This system supports unlimited concurrent users at the same fixed cost.", { italics: true }),

        greenDivider(),

        // ─── SECURITY & COMPLIANCE ───────────────
        sectionTitle("5. Security & HIPAA Compliance"),
        bodyText("The system has been designed with healthcare compliance as a foundational requirement:"),
        spacer(100),

        subTitle("Data Protection"),
        bulletItem("AES-256 encryption for sensitive fields (SSN, DOB, medical records)"),
        bulletItem("TLS/SSL encryption for all data in transit (auto-provisioned)"),
        bulletItem("Database encryption at rest via Supabase managed PostgreSQL"),
        bulletItem("Row-Level Security (RLS) policies on all database tables"),

        subTitle("Access Controls"),
        bulletItem("Role-based access control (Admin, Pharmacist, Technician, Billing)"),
        bulletItem("Session management with automatic timeout"),
        bulletItem("Leaked password protection via HaveIBeenPwned API"),
        bulletItem("Minimum 8-character passwords with complexity requirements"),
        bulletItem("Rate limiting and brute force protection"),

        subTitle("Audit & Compliance"),
        bulletItem("Complete audit trail logging all user actions with timestamps"),
        bulletItem("Content Security Policy (CSP) headers preventing XSS attacks"),
        bulletItem("Input validation and sanitization on all API endpoints"),
        bulletItem("HIPAA Business Associate Agreements (BAAs) requested with all vendors"),

        subTitle("BAA Status"),
        new Table({
          width: { size: TABLE_WIDTH, type: WidthType.DXA },
          columnWidths: [3000, 3000, 3360],
          rows: [
            new TableRow({ children: [headerCell("Vendor", 3000), headerCell("Handles PHI?", 3000), headerCell("BAA Status", 3360)] }),
            new TableRow({ children: [cell("Supabase", 3000, { bold: true }), cell("Yes (database)", 3000), cell("Requested - Pending", 3360, { color: "CC6600" })] }),
            new TableRow({ children: [cell("Vercel", 3000, { bold: true, shading: LIGHT_GRAY }), cell("Yes (hosting)", 3000, { shading: LIGHT_GRAY }), cell("Requested - Pending", 3360, { color: "CC6600", shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Twilio", 3000, { bold: true }), cell("Yes (SMS content)", 3000), cell("Requested - Pending", 3360, { color: "CC6600" })] }),
            new TableRow({ children: [cell("Sentry", 3000, { bold: true, shading: LIGHT_GRAY }), cell("Possible (error logs)", 3000, { shading: LIGHT_GRAY }), cell("Requested - Pending", 3360, { color: "CC6600", shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Stripe", 3000, { bold: true }), cell("No (tokenized)", 3000), cell("Not required", 3360, { color: GREEN })] }),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ─── DATA MODEL ──────────────────────────
        sectionTitle("6. Data Architecture"),
        bodyText("The system manages 55 interconnected database tables across 12 business domains:"),
        spacer(100),

        new Table({
          width: { size: TABLE_WIDTH, type: WidthType.DXA },
          columnWidths: [4000, 1800, 3560],
          rows: [
            new TableRow({ children: [headerCell("Domain", 4000), headerCell("Tables", 1800), headerCell("Key Data", 3560)] }),
            new TableRow({ children: [cell("Patient Management", 4000, { bold: true }), cell("9", 1800, { align: AlignmentType.CENTER }), cell("Demographics, insurance, allergies, meds", 3560)] }),
            new TableRow({ children: [cell("Prescriptions & Fills", 4000, { bold: true, shading: LIGHT_GRAY }), cell("5", 1800, { align: AlignmentType.CENTER, shading: LIGHT_GRAY }), cell("Full Rx lifecycle, fill events, status logs", 3560, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Compounding", 4000, { bold: true }), cell("6", 1800, { align: AlignmentType.CENTER }), cell("Formulas, versions, batches, QA records", 3560)] }),
            new TableRow({ children: [cell("Inventory & Supply Chain", 4000, { bold: true, shading: LIGHT_GRAY }), cell("4", 1800, { align: AlignmentType.CENTER, shading: LIGHT_GRAY }), cell("Items, lots, suppliers, transactions", 3560, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Billing & Insurance", 4000, { bold: true }), cell("6", 1800, { align: AlignmentType.CENTER }), cell("Claims, payments, charge accounts", 3560)] }),
            new TableRow({ children: [cell("Shipping & Delivery", 4000, { bold: true, shading: LIGHT_GRAY }), cell("5", 1800, { align: AlignmentType.CENTER, shading: LIGHT_GRAY }), cell("Packing lists, shipments, routes", 3560, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Point of Sale", 4000, { bold: true }), cell("3", 1800, { align: AlignmentType.CENTER }), cell("Sessions, transactions, line items", 3560)] }),
            new TableRow({ children: [cell("Users & Access Control", 4000, { bold: true, shading: LIGHT_GRAY }), cell("5", 1800, { align: AlignmentType.CENTER, shading: LIGHT_GRAY }), cell("Roles, permissions, stores", 3560, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Infrastructure", 4000, { bold: true }), cell("4", 1800, { align: AlignmentType.CENTER }), cell("Audit logs, notifications, webhooks", 3560)] }),
          ],
        }),

        greenDivider(),

        // ─── INTEGRATIONS ────────────────────────
        sectionTitle("7. Third-Party Integrations"),

        subTitle("Twilio (Patient Communications)"),
        bulletItem("Automated SMS pickup notifications when Rx is ready"),
        bulletItem("Bulk messaging for refill reminders and promotional outreach"),
        bulletItem("Voice call support with IVR (Interactive Voice Response)"),
        bulletItem("Fax transmission for prescriber communications"),

        subTitle("Stripe (Payment Processing)"),
        bulletItem("PCI-compliant card tokenization (card data never touches our servers)"),
        bulletItem("In-store POS transactions and patient portal payments"),
        bulletItem("Full and partial refund support"),
        bulletItem("Saved payment methods for returning patients"),

        subTitle("Shipping Carriers (USPS, UPS, FedEx)"),
        bulletItem("Real-time rate quotes from multiple carriers"),
        bulletItem("Automated shipping label generation"),
        bulletItem("Package tracking with carrier auto-detection"),
        bulletItem("Address validation and standardization"),

        subTitle("SureScripts & NCPDP"),
        bulletItem("Electronic prescription intake (e-prescribing)"),
        bulletItem("Insurance eligibility verification"),
        bulletItem("NCPDP-format claim submission and adjudication"),

        new Paragraph({ children: [new PageBreak()] }),

        // ─── LAUNCH ROADMAP ─────────────────────
        sectionTitle("8. Launch Roadmap"),
        bodyText("The system is code-complete and in the final stages of pre-launch preparation:"),
        spacer(100),

        new Table({
          width: { size: TABLE_WIDTH, type: WidthType.DXA },
          columnWidths: [1800, 4000, 1800, 1760],
          rows: [
            new TableRow({ children: [headerCell("Phase", 1800), headerCell("Task", 4000), headerCell("Status", 1800), headerCell("Target", 1760)] }),
            new TableRow({ children: [cell("Complete", 1800, { bold: true, color: GREEN }), cell("Core application development (24 modules)", 4000), cell("DONE", 1800, { bold: true, color: GREEN }), cell("Mar 2026", 1760)] }),
            new TableRow({ children: [cell("Complete", 1800, { bold: true, color: GREEN, shading: LIGHT_GRAY }), cell("Security hardening (encryption, CSP, validation)", 4000, { shading: LIGHT_GRAY }), cell("DONE", 1800, { bold: true, color: GREEN, shading: LIGHT_GRAY }), cell("Mar 2026", 1760, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Complete", 1800, { bold: true, color: GREEN }), cell("UI/UX polish and accessibility", 4000), cell("DONE", 1800, { bold: true, color: GREEN }), cell("Mar 2026", 1760)] }),
            new TableRow({ children: [cell("Complete", 1800, { bold: true, color: GREEN, shading: LIGHT_GRAY }), cell("ENCRYPTION_KEY and password protection configured", 4000, { shading: LIGHT_GRAY }), cell("DONE", 1800, { bold: true, color: GREEN, shading: LIGHT_GRAY }), cell("Mar 2026", 1760, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("In Progress", 1800, { bold: true, color: "CC6600" }), cell("BAA agreements with vendors", 4000), cell("PENDING", 1800, { bold: true, color: "CC6600" }), cell("Apr 2026", 1760)] }),
            new TableRow({ children: [cell("In Progress", 1800, { bold: true, color: "CC6600", shading: LIGHT_GRAY }), cell("Custom domain (pms.bndsrx.com) DNS configuration", 4000, { shading: LIGHT_GRAY }), cell("PENDING DNS", 1800, { bold: true, color: "CC6600", shading: LIGHT_GRAY }), cell("Mar 2026", 1760, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Upcoming", 1800, { bold: true, color: MED_GRAY }), cell("Staff training sessions", 4000), cell("SCHEDULED", 1800, { color: MED_GRAY }), cell("Apr 2026", 1760)] }),
            new TableRow({ children: [cell("Upcoming", 1800, { bold: true, color: MED_GRAY, shading: LIGHT_GRAY }), cell("DRX data migration dry run", 4000, { shading: LIGHT_GRAY }), cell("PLANNED", 1800, { color: MED_GRAY, shading: LIGHT_GRAY }), cell("Apr 2026", 1760, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("Upcoming", 1800, { bold: true, color: MED_GRAY }), cell("2-week parallel run (DRX + PMS side-by-side)", 4000), cell("PLANNED", 1800, { color: MED_GRAY }), cell("Apr 2026", 1760)] }),
            new TableRow({ children: [
              new TableCell({ borders, width: { size: 1800, type: WidthType.DXA }, shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR }, margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: "GO LIVE", bold: true, color: GREEN, font: "Arial", size: 20 })] })] }),
              new TableCell({ borders, width: { size: 4000, type: WidthType.DXA }, shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR }, margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: "Full production cutover from DRX", font: "Arial", size: 20, bold: true, color: GREEN })] })] }),
              new TableCell({ borders, width: { size: 1800, type: WidthType.DXA }, shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR }, margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: "TARGET", bold: true, color: GREEN, font: "Arial", size: 20 })] })] }),
              new TableCell({ borders, width: { size: 1760, type: WidthType.DXA }, shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR }, margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: "May 2026", bold: true, color: GREEN, font: "Arial", size: 20 })] })] }),
            ] }),
          ],
        }),

        greenDivider(),

        // ─── RISKS & MITIGATIONS ─────────────────
        sectionTitle("9. Risks & Mitigations"),

        new Table({
          width: { size: TABLE_WIDTH, type: WidthType.DXA },
          columnWidths: [3000, 3000, 3360],
          rows: [
            new TableRow({ children: [headerCell("Risk", 3000), headerCell("Impact", 3000), headerCell("Mitigation", 3360)] }),
            new TableRow({ children: [cell("BAA delays from vendors", 3000), cell("Cannot go live with PHI", 3000), cell("Follow up weekly; have backup vendors identified", 3360)] }),
            new TableRow({ children: [cell("Staff resistance to change", 3000, { shading: LIGHT_GRAY }), cell("Slow adoption, errors", 3000, { shading: LIGHT_GRAY }), cell("Hands-on training; 2-week parallel run period", 3360, { shading: LIGHT_GRAY })] }),
            new TableRow({ children: [cell("DRX data migration issues", 3000), cell("Incomplete patient records", 3000), cell("Dry run migration; reconciliation checks", 3360)] }),
            new TableRow({ children: [cell("System downtime", 3000, { shading: LIGHT_GRAY }), cell("Pharmacy operations halted", 3000, { shading: LIGHT_GRAY }), cell("99.9% SLA; PITR backups; DRX as fallback", 3360, { shading: LIGHT_GRAY })] }),
          ],
        }),

        greenDivider(),

        // ─── COMPETITIVE ADVANTAGES ──────────────
        sectionTitle("10. Why This Matters"),
        bodyText("This investment positions Boudreaux's ahead of competitors in several key ways:"),
        spacer(100),

        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 100 },
          children: [
            new TextRun({ text: "Ownership & Control: ", bold: true, font: "Arial", size: 22, color: GREEN }),
            new TextRun({ text: "We own the code. No vendor lock-in. We can add features, fix issues, and adapt to regulatory changes on our timeline.", font: "Arial", size: 22, color: DARK_GRAY }),
          ] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 100 },
          children: [
            new TextRun({ text: "Compounding-First: ", bold: true, font: "Arial", size: 22, color: GREEN }),
            new TextRun({ text: "Built specifically for compounding pharmacy workflows, not bolted onto a retail pharmacy system.", font: "Arial", size: 22, color: DARK_GRAY }),
          ] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 100 },
          children: [
            new TextRun({ text: "Cost Efficiency: ", bold: true, font: "Arial", size: 22, color: GREEN }),
            new TextRun({ text: "$125-225/month total vs. $300-500+/month per station with DRX, with unlimited users.", font: "Arial", size: 22, color: DARK_GRAY }),
          ] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 100 },
          children: [
            new TextRun({ text: "Patient Experience: ", bold: true, font: "Arial", size: 22, color: GREEN }),
            new TextRun({ text: "Dedicated patient and prescriber portals, SMS notifications, and modern UI set us apart.", font: "Arial", size: 22, color: DARK_GRAY }),
          ] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 100 },
          children: [
            new TextRun({ text: "Scalability: ", bold: true, font: "Arial", size: 22, color: GREEN }),
            new TextRun({ text: "Cloud-native architecture scales automatically. Adding new locations or services requires zero infrastructure changes.", font: "Arial", size: 22, color: DARK_GRAY }),
          ] }),

        greenDivider(),

        // ─── APPROVAL REQUEST ────────────────────
        sectionTitle("11. Approval Request"),
        bodyText("We are requesting executive approval to proceed with the following:"),
        spacer(100),
        bulletItem("Finalize BAA agreements with Supabase, Vercel, Twilio, and Sentry"),
        bulletItem("Complete DNS configuration for pms.bndsrx.com"),
        bulletItem("Schedule staff training sessions (2-3 hours per role)"),
        bulletItem("Begin DRX data migration dry run"),
        bulletItem("Conduct 2-week parallel run before full cutover"),
        bulletItem("Target go-live date: May 2026"),

        spacer(400),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: GREEN, space: 10 } },
          spacing: { before: 400 },
          children: [new TextRun({ text: "Prepared by Caleb Dowling  |  IT / Development  |  cdowling@bndsrx.com", font: "Arial", size: 18, color: MED_GRAY })],
        }),
      ],
    },
  ],
});

// ─── Generate ────────────────────────────────────
const OUTPUT = "C:\\Users\\cdowling\\OneDrive - Boudreaux's New Drug Store\\Cursor Projects\\bnds-pms\\docs\\BNDS-PMS-Launch-Briefing.docx";

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log("Created: " + OUTPUT);
  console.log("Size: " + (buffer.length / 1024).toFixed(1) + " KB");
});
