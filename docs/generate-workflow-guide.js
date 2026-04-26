const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
  TableOfContents, TabStopType, TabStopPosition,
} = require("docx");

// ─── Colors ───
const GREEN = "415c43";
const DARK = "0f260b";
const SAGE = "cbddd1";
const LIGHT = "e2ede6";
const MID = "719776";
const BLUE_CALLOUT = "EBF5FB";
const GREEN_CALLOUT = "E8F5E9";
const AMBER_CALLOUT = "FFF8E1";
const GRAY = "666666";

// ─── Helpers ───
function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Arial", color: DARK })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Arial", color: GREEN })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, size: 22, font: "Arial", color: DARK })],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: opts.color || DARK, ...(opts.bold ? { bold: true } : {}), ...(opts.italics ? { italics: true } : {}) })],
  });
}

function richPara(runs) {
  return new Paragraph({
    spacing: { after: 160 },
    children: runs.map(r => new TextRun({ size: 22, font: "Arial", color: DARK, ...r })),
  });
}

function numberedItem(ref, level, text) {
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 100 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: DARK })],
  });
}

function bulletItem(ref, level, text) {
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: DARK })],
  });
}

function calloutBox(label, text, bgColor) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: bgColor, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 160, right: 160 },
            children: [
              new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: label, bold: true, size: 20, font: "Arial", color: GREEN })] }),
              new Paragraph({ children: [new TextRun({ text, size: 20, font: "Arial", color: DARK })] }),
            ],
          }),
        ],
      }),
    ],
  });
}

function staffRole(role, action) {
  return calloutBox(`Staff Role: ${role}`, action, GREEN_CALLOUT);
}

function systemAction(action) {
  return calloutBox("System Action (Automated)", action, BLUE_CALLOUT);
}

function spacer() {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

// ─── Numbering Config ───
const numberingConfig = {
  config: [
    {
      reference: "steps",
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ],
    },
    {
      reference: "steps2",
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ],
    },
    {
      reference: "steps3",
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ],
    },
    {
      reference: "steps4",
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ],
    },
    {
      reference: "steps5",
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ],
    },
    {
      reference: "steps6",
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ],
    },
    {
      reference: "steps7",
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ],
    },
    {
      reference: "steps8",
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ],
    },
    {
      reference: "steps9",
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ],
    },
    {
      reference: "bullets",
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ],
    },
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// DOCUMENT CONTENT
// ═════════════════════════════════════════════════════════════════════════════

const children = [];

// ─── Title Page ───
children.push(
  new Paragraph({ spacing: { before: 3600 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "BNDS Pharmacy Management System", size: 52, bold: true, font: "Arial", color: GREEN })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: "Complete Workflow Guide", size: 36, font: "Arial", color: DARK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: "Internal Operations Manual", size: 24, font: "Arial", color: GRAY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: "Boudreaux\u2019s New Drug Store", size: 28, bold: true, font: "Arial", color: DARK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: "404 E Prien Lake Rd, Lake Charles, LA 70601", size: 22, font: "Arial", color: GRAY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: `Prepared: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, size: 22, font: "Arial", color: GRAY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: "CONFIDENTIAL \u2014 For Internal Use Only", size: 20, bold: true, font: "Arial", color: "CC0000" })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ─── Table of Contents ───
children.push(
  new Paragraph({
    spacing: { after: 300 },
    children: [new TextRun({ text: "Table of Contents", size: 36, bold: true, font: "Arial", color: GREEN })],
  }),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: PRESCRIPTION INTAKE & FILL PROCESS
// ═════════════════════════════════════════════════════════════════════════════
children.push(
  heading1("1. Prescription Intake & Fill Process"),
  para("This section covers the complete lifecycle of a prescription from the moment it enters the BNDS PMS through final dispensing to the patient. The system supports multiple intake channels and guides each prescription through a structured workflow to ensure accuracy, safety, and regulatory compliance."),

  heading2("1.1 Prescription Entry Channels"),
  para("Prescriptions enter the system through one of five channels. Each source is tracked for reporting and audit purposes."),
  bulletItem("bullets", 0, "eRx via SureScripts \u2014 Electronic prescriptions received directly from prescriber EMR systems"),
  bulletItem("bullets", 0, "Prescriber Portal \u2014 Prescriptions submitted by providers through the BNDS web portal"),
  bulletItem("bullets", 0, "Walk-in \u2014 Paper prescriptions presented at the counter and manually entered by staff"),
  bulletItem("bullets", 0, "Phone/Fax \u2014 Prescriptions called in or faxed by the prescriber\u2019s office"),
  bulletItem("bullets", 0, "Patient Portal \u2014 Refill requests submitted by patients online"),
  spacer(),
  systemAction("When an eRx or portal prescription arrives, the system automatically creates an Intake Queue entry, attempts patient matching by name/DOB/phone, and assigns a priority level (Normal, Urgent, or STAT)."),
  spacer(),

  heading2("1.2 Intake Queue Processing"),
  para("All incoming prescriptions land in the Intake Queue where they await review and processing by pharmacy staff."),
  numberedItem("steps", 0, "Staff opens the Intake Queue from the sidebar navigation."),
  numberedItem("steps", 0, "Each entry shows: patient name, prescriber, medication, source, priority badge, and current status."),
  numberedItem("steps", 0, "Staff reviews the prescription details for completeness and clinical appropriateness."),
  numberedItem("steps", 0, "If the patient is not already in the system, staff creates a new patient record with demographics, allergies, insurance, and phone numbers."),
  numberedItem("steps", 0, "Staff matches the prescription to an existing patient record using MRN, name, or phone lookup."),
  numberedItem("steps", 0, "Staff verifies insurance eligibility and selects the appropriate plan for billing."),
  numberedItem("steps", 0, "The prescription is moved from Intake to the appropriate workflow queue (typically Print)."),
  spacer(),
  staffRole("Pharmacy Technician", "Reviews intake entries, creates/matches patient records, verifies insurance, and advances prescriptions into the workflow queue."),
  spacer(),

  heading2("1.3 Adjudication & Claims Processing"),
  para("Before a prescription can be filled, the system submits a claim to the patient\u2019s insurance for adjudication."),
  numberedItem("steps2", 0, "The system builds an NCPDP claim transaction with drug NDC, quantity, days supply, prescriber NPI, and patient insurance details."),
  numberedItem("steps2", 0, "The claim is submitted electronically to the payer/PBM."),
  numberedItem("steps2", 0, "The system receives a response: Paid, Rejected, or Pending."),
  numberedItem("steps2", 0, "If Paid: the copay amount is stored on the fill record. The prescription advances to Print."),
  numberedItem("steps2", 0, "If Rejected: the prescription moves to the Reject queue with the rejection code and message. Staff reviews and resolves (e.g., prior auth, DAW change, plan override)."),
  numberedItem("steps2", 0, "If Pending: the prescription remains in an adjudicating state until a response is received."),
  spacer(),
  systemAction("Claims are submitted automatically when a prescription enters the adjudication stage. Rejection codes are parsed and displayed with human-readable descriptions. Claim history is logged for audit."),
  spacer(),

  heading2("1.4 Label Printing & Fill"),
  numberedItem("steps3", 0, "Staff selects a prescription from the Print queue."),
  numberedItem("steps3", 0, "The system generates a label with: patient name, medication name/strength, directions (SIG), quantity, refills remaining, prescriber, pharmacy info, lot number, expiration, and required warnings."),
  numberedItem("steps3", 0, "The label prints to the configured Zebra or Dymo label printer."),
  numberedItem("steps3", 0, "The technician selects the correct drug stock from inventory, verifies the NDC barcode against the prescription record, counts or measures the medication, and affixes the label."),
  numberedItem("steps3", 0, "The prescription advances to the Scan queue."),
  spacer(),
  staffRole("Pharmacy Technician", "Prints labels, selects drug stock, performs NDC verification scan, counts/measures medication, and affixes labels to containers."),
  spacer(),

  heading2("1.5 Scan & Pharmacist Verification"),
  numberedItem("steps4", 0, "Staff scans the filled prescription\u2019s barcode at the Scan station."),
  numberedItem("steps4", 0, "The system displays the prescription details alongside the scanned product for visual comparison."),
  numberedItem("steps4", 0, "The prescription moves to the Verify queue."),
  numberedItem("steps4", 0, "The pharmacist (RPh) reviews the filled prescription: correct drug, correct strength, correct quantity, correct patient, correct label, and no drug interactions or clinical concerns."),
  numberedItem("steps4", 0, "The pharmacist either approves (moves to Waiting Bin) or rejects (sends back to Print with notes)."),
  spacer(),
  staffRole("Pharmacist (RPh)", "Performs final verification: drug/dose/patient check, DUR review, clinical judgment. This step is legally required and cannot be performed by technicians."),
  spacer(),

  heading2("1.6 Waiting Bin & Patient Pickup"),
  numberedItem("steps5", 0, "Verified prescriptions are assigned a physical bin location (e.g., A1, B3, Z12) and placed in the waiting bin area."),
  numberedItem("steps5", 0, "The system tracks how long each prescription has been in the bin. Items over 14 days are flagged as overdue."),
  numberedItem("steps5", 0, "When the patient arrives, staff searches by name, Rx number, or MRN on the Pickup screen."),
  numberedItem("steps5", 0, "Staff collects the copay via the POS module (cash, credit card, or insurance-only)."),
  numberedItem("steps5", 0, "The patient signs for receipt (via signature pad if configured)."),
  numberedItem("steps5", 0, "The prescription status changes to Sold. The fill is complete."),
  spacer(),
  systemAction("The system sends an automated notification (email/SMS) to the patient when their prescription enters the waiting bin, informing them it is ready for pickup. Overdue items trigger return-to-stock (RTS) workflows after the configured threshold."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 2: COMPOUNDING & DRUG MANUFACTURING
  // ═════════════════════════════════════════════════════════════════════════════
  heading1("2. Compounding & Drug Manufacturing"),
  para("This section describes how custom-compounded medications are created within the PMS, from formula design through batch production and quality release. The compounding module maintains full traceability for every batch produced."),

  heading2("2.1 Formula Creation & Management"),
  numberedItem("steps6", 0, "Navigate to Compounding > Formulas > New Formula."),
  numberedItem("steps6", 0, "Enter the formula name, formula code, dosage form (cream, capsule, suspension, etc.), and route of administration."),
  numberedItem("steps6", 0, "Add each ingredient: select from the inventory catalog, specify the quantity and unit of measure, and mark whether it is an active or inactive ingredient."),
  numberedItem("steps6", 0, "Define compounding instructions as step-by-step text entries (e.g., \"Weigh Active A to 5.0g\", \"Levigate with base\", \"Mix 10 minutes at medium speed\")."),
  numberedItem("steps6", 0, "Set the default Beyond-Use Date (BUD) in days based on USP <795>/<797> stability data."),
  numberedItem("steps6", 0, "Save the formula. A version 1.0 is automatically created."),
  spacer(),
  staffRole("Pharmacist (RPh)", "Creates and approves all formulas. Only pharmacists can modify active formulas or create new versions."),
  spacer(),

  heading2("2.2 Batch Production"),
  numberedItem("steps7", 0, "Navigate to Compounding > Batches > New Batch."),
  numberedItem("steps7", 0, "Select the formula and version. Enter the desired batch quantity and unit."),
  numberedItem("steps7", 0, "The system generates a unique batch number in the format BYYYYMMDD-### (e.g., B20260416-001)."),
  numberedItem("steps7", 0, "The system calculates scaled ingredient quantities based on the batch size."),
  numberedItem("steps7", 0, "The compounder weighs/measures each ingredient. If a pharmacy scale is connected, the measured weight is captured automatically via the Web Serial API."),
  numberedItem("steps7", 0, "The compounder records the lot number and expiration date for each ingredient used (for full traceability)."),
  numberedItem("steps7", 0, "The compounder follows each compounding step, marking each as complete."),
  numberedItem("steps7", 0, "The batch status changes to Completed."),
  spacer(),
  staffRole("Pharmacy Technician (Compounder)", "Performs the physical compounding: weighing, mixing, encapsulating, or preparing the dosage form according to the formula instructions."),
  spacer(),

  heading2("2.3 Quality Assurance & Release"),
  numberedItem("steps8", 0, "The pharmacist opens the completed batch record for QA review."),
  numberedItem("steps8", 0, "The pharmacist verifies: correct formula version, correct ingredient quantities, lot numbers recorded, all steps completed, visual/physical inspection acceptable."),
  numberedItem("steps8", 0, "The pharmacist confirms (or adjusts) the auto-assigned Beyond-Use Date \u2014 the BUD is pre-populated from the formula default and the earliest non-excluded ingredient expiration."),
  numberedItem("steps8", 0, "If QA passes: the batch status changes to Verified, then Released. The batch is now available for dispensing."),
  numberedItem("steps8", 0, "If QA fails: the batch is marked as Failed with a reason. The batch is quarantined and cannot be dispensed."),
  numberedItem("steps8", 0, "Labels are printed for the batch containers with batch number, formula name, drug NDC, and BUD. (Storage conditions and lot info are tracked on the batch record but not printed on the container label per pharmacy preference.)"),
  spacer(),
  staffRole("Pharmacist (RPh)", "Performs QA verification, assigns BUD, and releases or rejects the batch. This is a legally required pharmacist-only function."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 3: HARDWARE INTEGRATION
  // ═════════════════════════════════════════════════════════════════════════════
  heading1("3. Hardware Integration"),
  para("The PMS supports direct integration with pharmacy hardware devices through the browser\u2019s Web Serial API and standard USB/network protocols. All hardware configuration is managed from Settings > Hardware."),

  heading2("3.1 Pharmacy Scales"),
  numberedItem("steps9", 0, "Connect the scale to the workstation via USB or RS-232 serial cable."),
  numberedItem("steps9", 0, "Navigate to Settings > Hardware > Scales."),
  numberedItem("steps9", 0, "Click \"Add Scale\" and select the serial port from the browser\u2019s device picker (Web Serial API)."),
  numberedItem("steps9", 0, "Configure the baud rate, data bits, and protocol to match the scale manufacturer (common: 9600 baud, 8N1)."),
  numberedItem("steps9", 0, "Test the connection by placing a known weight on the scale and verifying the reading appears in the PMS."),
  numberedItem("steps9", 0, "Once configured, weights are automatically captured during compounding batch production when the compounder clicks \"Read Scale\" at each ingredient step."),
  spacer(),

  heading2("3.2 Label Printers"),
  para("The PMS generates prescription labels in standard pharmacy label formats compatible with Zebra and Dymo thermal printers."),
  bulletItem("bullets", 0, "Zebra printers: Connect via USB or network. Configure in Settings > Hardware > Label Printers. Select the printer model, label width (standard 4\u2033), and print density."),
  bulletItem("bullets", 0, "Dymo printers: Connect via USB. The system auto-detects Dymo LabelWriter models."),
  bulletItem("bullets", 0, "Labels include: patient name, medication, SIG, quantity, refills, prescriber, warnings, barcode, and pharmacy information."),
  spacer(),

  heading2("3.3 Barcode Scanners"),
  para("Barcode scanners are used for NDC verification during the fill process and for patient lookup at pickup."),
  bulletItem("bullets", 0, "Any USB HID barcode scanner works out of the box (keyboard wedge mode)."),
  bulletItem("bullets", 0, "Scan an NDC barcode during the fill process to verify the correct drug product matches the prescription."),
  bulletItem("bullets", 0, "Scan a prescription barcode at the pickup counter to quickly locate the patient\u2019s order."),
  spacer(),

  heading2("3.4 Receipt Printers & Signature Pads"),
  bulletItem("bullets", 0, "Receipt printers: Configured in Settings > Hardware > Receipt Printers. Used at the POS for transaction receipts."),
  bulletItem("bullets", 0, "Signature pads: Connected via USB. Configured in Settings > Hardware > Signature Capture. Used at pickup to capture patient signature for receipt acknowledgment and controlled substance logs."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 4: REPORTS & ANALYTICS
  // ═════════════════════════════════════════════════════════════════════════════
  heading1("4. Reports & Analytics"),
  para("The Reports and Analytics modules provide pharmacy leadership with operational intelligence, performance metrics, and compliance data. Reports can be filtered by date range and exported to CSV or PDF."),

  heading2("4.1 Available Reports"),
  bulletItem("bullets", 0, "Daily Fill Report \u2014 All prescriptions filled on a given date, with patient, drug, quantity, copay, and fill technician."),
  bulletItem("bullets", 0, "Rx Volume Trends \u2014 Bar/line charts showing prescription volume over time (7 days, 30 days, 90 days, YTD)."),
  bulletItem("bullets", 0, "Revenue by Category \u2014 Breakdown of revenue by payment type (insurance, cash, copay) with dollar amounts and percentages."),
  bulletItem("bullets", 0, "Top Drugs Dispensed \u2014 Ranked list of the most-filled medications by fill count and revenue."),
  bulletItem("bullets", 0, "Turnaround Times \u2014 Average time prescriptions spend in each workflow stage (intake to sold)."),
  bulletItem("bullets", 0, "Claim Acceptance Rate \u2014 Percentage of claims accepted vs. rejected, with top rejection codes."),
  bulletItem("bullets", 0, "Technician Productivity \u2014 Fills per technician per day, ranked by volume."),
  bulletItem("bullets", 0, "Patient Metrics \u2014 New patients, active/inactive counts, active ratio, and top patients by Rx count."),
  bulletItem("bullets", 0, "Compounding Batch Log \u2014 All batches produced with formula, quantity, compounder, verifier, and QA status."),
  bulletItem("bullets", 0, "Inventory Report \u2014 Current stock levels, expiration alerts, low-stock items, and reorder status."),
  spacer(),

  heading2("4.2 Analytics Dashboard"),
  para("The Analytics Dashboard (accessible from the Analytics tab) provides a unified view of all KPIs:"),
  numberedItem("steps", 0, "Select a date range using the period selector (7d, 30d, 90d, YTD)."),
  numberedItem("steps", 0, "Review the KPI summary cards: Total Fills, Revenue, Average Fills/Day, Claim Acceptance Rate, Active Patients."),
  numberedItem("steps", 0, "Scroll through interactive sections: Dispensing Trends, Revenue Breakdown, Top 10 Drugs, Claims Performance, Payer Mix, Productivity, Patient Metrics, and Compounding."),
  numberedItem("steps", 0, "Export any report to CSV or PDF using the Export button on each section."),
  spacer(),
  staffRole("Pharmacist / Manager", "Reviews analytics dashboards and reports. Only users with the \"reports:read\" permission can access the Analytics and Reports modules."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 5: CUSTOMER SERVICE, BILLING & ACCOUNT MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════════
  heading1("5. Customer Service, Billing & Account Management"),
  para("This section covers insurance plan management, claims processing, copay collection, payment tracking, and patient account management."),

  heading2("5.1 Insurance Plan Setup"),
  numberedItem("steps2", 0, "Navigate to Insurance > Add Plan."),
  numberedItem("steps2", 0, "Enter plan details: Plan Name, BIN, PCN, Group, Plan Type (commercial, Medicaid, Medicare Part D, workers comp), and help desk phone number."),
  numberedItem("steps2", 0, "Save the plan. It is now available when adding insurance to patient records."),
  numberedItem("steps2", 0, "When adding insurance to a patient, select the plan and enter the patient\u2019s member ID, person code, and relationship code."),
  spacer(),

  heading2("5.2 Claims Lifecycle"),
  para("The claims lifecycle tracks each insurance claim from submission through final payment:"),
  bulletItem("bullets", 0, "Pending \u2014 Claim created, awaiting submission to the PBM."),
  bulletItem("bullets", 0, "Submitted \u2014 Claim sent electronically to the payer."),
  bulletItem("bullets", 0, "Accepted \u2014 Payer has accepted the claim and provided a reimbursement amount."),
  bulletItem("bullets", 0, "Paid \u2014 Payment received from the payer."),
  bulletItem("bullets", 0, "Rejected \u2014 Claim denied. Rejection code and reason displayed for staff to resolve."),
  bulletItem("bullets", 0, "Reversed \u2014 Previously paid claim reversed (e.g., patient returned medication)."),
  spacer(),

  heading2("5.3 Point of Sale (POS) & Copay Collection"),
  numberedItem("steps3", 0, "When a patient picks up their prescription, the cashier opens the POS module."),
  numberedItem("steps3", 0, "The system displays the patient\u2019s prescriptions ready for pickup with copay amounts."),
  numberedItem("steps3", 0, "The cashier scans each prescription barcode to add it to the transaction."),
  numberedItem("steps3", 0, "The patient pays via cash, credit card, debit, FSA/HSA card, or account charge."),
  numberedItem("steps3", 0, "A receipt is printed (or emailed). The prescriptions are marked as Sold."),
  spacer(),
  staffRole("Cashier / Pharmacy Technician", "Processes POS transactions, collects copays, handles returns, and manages register sessions (open/close with cash counts)."),
  spacer(),

  heading2("5.4 AR Aging & Account Management"),
  para("The Billing module tracks accounts receivable and provides aging reports:"),
  bulletItem("bullets", 0, "AR Aging Report \u2014 Outstanding balances grouped by 30/60/90/120+ day buckets."),
  bulletItem("bullets", 0, "DIR Fee Tracking \u2014 Direct and Indirect Remuneration fee estimates from PBMs."),
  bulletItem("bullets", 0, "Reconciliation \u2014 Match PBM remittance payments against submitted claims to identify discrepancies."),
  bulletItem("bullets", 0, "Patient Account Balances \u2014 View outstanding balances per patient, apply payments, and send billing notifications."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 6: WORKFLOW QUEUE SYSTEM
  // ═════════════════════════════════════════════════════════════════════════════
  heading1("6. The Workflow Queue System"),
  para("The Workflow Queue is the backbone of prescription processing in the PMS. It consists of 16 stages that a prescription may pass through during its lifecycle. The Queue Bar on the dashboard shows live counts for each stage, updated every 30 seconds."),

  heading2("6.1 Queue Stages"),
  para("Each stage represents a specific step in the fill process. Prescriptions move forward through stages as staff complete their tasks:"),
  spacer(),
);

// Queue stages table
const queueStages = [
  ["Intake", "New prescriptions awaiting initial review and patient matching.", "Technician"],
  ["Sync", "Prescriptions pending synchronization with the patient\u2019s fill schedule.", "System/Tech"],
  ["Reject", "Insurance claims that were rejected. Staff reviews the rejection code and resolves.", "Technician"],
  ["Print", "Ready for label printing and physical fill (counting/measuring).", "Technician"],
  ["Scan", "Filled prescriptions awaiting NDC barcode scan for product verification.", "Technician"],
  ["Verify", "Scanned prescriptions awaiting pharmacist final verification (RPh check).", "Pharmacist"],
  ["Rejected by RPh", "Rx the pharmacist rejected at verify \u2014 needs technician follow-up before re-fill.", "Technician"],
  ["Out of Stock", "Prescriptions that cannot be filled because the drug is not in stock.", "Technician"],
  ["Waiting Bin", "Verified prescriptions placed in the physical bin, ready for patient pickup.", "Clerk/Tech"],
  ["Renewals", "Prescriptions flagged for renewal requests to the prescriber.", "Technician"],
  ["Todo", "General task list items requiring staff follow-up.", "Any"],
  ["Price Check", "Prescriptions needing manual price verification before processing.", "Technician"],
  ["Prepay", "Prescriptions requiring patient prepayment before fill (most compounds land here).", "Cashier"],
  ["OK to Charge", "Prescriptions approved for patient account charging.", "Billing"],
  ["Decline", "Prescriptions where a payment attempt was declined.", "Billing"],
  ["OK to Charge Clinic", "Clinic-billed prescriptions approved for facility charging.", "Billing"],
  ["Compound QA", "Compound batches finalized by the technician, awaiting pharmacist QA/QC.", "Pharmacist"],
  ["Telehealth", "Prescriptions originating from a telehealth integration (Lumi, Mochi, etc.) \u2014 source-tagged on the row.", "Technician"],
];

const qBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const qBorders = { top: qBorder, bottom: qBorder, left: qBorder, right: qBorder };

children.push(
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 5760, 1800],
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders: qBorders, width: { size: 1800, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: "Stage", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })] }),
          new TableCell({ borders: qBorders, width: { size: 5760, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })] }),
          new TableCell({ borders: qBorders, width: { size: 1800, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: "Handled By", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })] }),
        ],
      }),
      ...queueStages.map((row, i) =>
        new TableRow({
          children: [
            new TableCell({ borders: qBorders, width: { size: 1800, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? "FFFFFF" : LIGHT, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: row[0], bold: true, size: 19, font: "Arial", color: DARK })] })] }),
            new TableCell({ borders: qBorders, width: { size: 5760, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? "FFFFFF" : LIGHT, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: row[1], size: 19, font: "Arial", color: DARK })] })] }),
            new TableCell({ borders: qBorders, width: { size: 1800, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? "FFFFFF" : LIGHT, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: row[2], size: 19, font: "Arial", color: GRAY })] })] }),
          ],
        })
      ),
    ],
  }),
  spacer(),

  heading2("6.2 Queue Navigation & Actions"),
  para("Staff interact with the queue through the Queue page:"),
  bulletItem("bullets", 0, "Click any queue stage pill at the top to filter the table to that stage."),
  bulletItem("bullets", 0, "Each pill shows a live count badge with the number of prescriptions in that stage."),
  bulletItem("bullets", 0, "The table shows Rx number, patient name, medication, prescriber, date, and status for each fill."),
  bulletItem("bullets", 0, "Clicking a row opens the fill detail where staff can take action (advance, reject, hold, cancel)."),
  bulletItem("bullets", 0, "The dashboard\u2019s Workflow Queue card also shows all 16 stage counts in a compact view."),
  spacer(),
  systemAction("Queue counts auto-refresh every 30 seconds on the dashboard and every page load on the Queue page. The queue bar on the dashboard pulls counts from the system\u2019s fill status records in real-time."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 7: COMPOUNDING PROCESSES (DETAILED)
  // ═════════════════════════════════════════════════════════════════════════════
  heading1("7. Compounding Processes (Detailed)"),
  para("This section provides a detailed reference for the compounding module\u2019s advanced features including formula versioning, lot tracking, batch numbering, and compliance documentation."),

  heading2("7.1 Formula Versioning"),
  para("Every formula change creates a new version. This maintains a complete audit trail:"),
  bulletItem("bullets", 0, "Version 1.0 is created when the formula is first saved."),
  bulletItem("bullets", 0, "Editing a formula (adding/removing ingredients, changing quantities, updating instructions) creates a new version (1.1, 1.2, etc.)."),
  bulletItem("bullets", 0, "Previous versions remain accessible for historical reference."),
  bulletItem("bullets", 0, "Batches are always linked to a specific formula version, so you can trace exactly what recipe was used."),
  spacer(),

  heading2("7.2 Ingredient Lot Tracking"),
  para("For every ingredient used in a batch, the system records:"),
  bulletItem("bullets", 0, "The ingredient item from the PMS inventory catalog."),
  bulletItem("bullets", 0, "The lot number of the physical stock used."),
  bulletItem("bullets", 0, "The expiration date of that lot."),
  bulletItem("bullets", 0, "The quantity used (and the actual measured weight if captured from a connected scale)."),
  para("This enables full forward and backward traceability: from a batch to its ingredients, or from an ingredient lot to all batches that used it."),
  spacer(),

  heading2("7.3 Batch Numbering"),
  para("Batches are automatically numbered using the format BYYYYMMDD-### where:"),
  bulletItem("bullets", 0, "B = fixed prefix indicating a compounding batch"),
  bulletItem("bullets", 0, "YYYYMMDD = the date the batch was created"),
  bulletItem("bullets", 0, "### = a sequential number that increments per day (001, 002, 003...)"),
  para("Example: B20260416-003 is the third batch created on April 16, 2026."),
  spacer(),

  heading2("7.4 Beyond-Use Dating (BUD)"),
  para("The BUD is the date after which a compounded preparation should not be used. The PMS enforces BUD assignment:"),
  bulletItem("bullets", 0, "The default BUD is set on the formula (e.g., 180 days for non-sterile, 14 days for sterile)."),
  bulletItem("bullets", 0, "The pharmacist may adjust the BUD at QA based on the earliest ingredient expiration or stability data."),
  bulletItem("bullets", 0, "The BUD prints on the batch label and is tracked in the system for expiration alerts."),
  spacer(),

  heading2("7.5 Compliance Documentation"),
  para("The compounding module generates all records required for USP <795> and <797> compliance:"),
  bulletItem("bullets", 0, "Master Formula Record (MFR) \u2014 The approved formula with all versions."),
  bulletItem("bullets", 0, "Compounding Record (CR) \u2014 The batch record with actual quantities, lot numbers, compounder, verifier, and QA results."),
  bulletItem("bullets", 0, "Batch container labels with batch number, formula name, NDC, and BUD. (Lot info and storage conditions are retained on the batch record for traceability but not printed on the container.)"),
  bulletItem("bullets", 0, "All records are retained in the system for the required retention period."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 8: SHIPPING PROCESSES
  // ═════════════════════════════════════════════════════════════════════════════
  heading1("8. Shipping Processes"),
  para("The Shipping module manages the preparation, dispatch, and tracking of prescription deliveries to patients who cannot pick up in-store."),

  heading2("8.1 Creating a Shipment"),
  numberedItem("steps6", 0, "Navigate to Shipping > New Shipment."),
  numberedItem("steps6", 0, "Select the patient and the prescriptions to include."),
  numberedItem("steps6", 0, "Confirm or update the shipping address from the patient\u2019s record."),
  numberedItem("steps6", 0, "Select the carrier: USPS, UPS, or FedEx."),
  numberedItem("steps6", 0, "Enable cold chain tracking if the shipment contains refrigerated medications."),
  numberedItem("steps6", 0, "Enable signature required if the shipment contains controlled substances or high-value items."),
  numberedItem("steps6", 0, "Save the shipment. Status is set to Pending."),
  spacer(),

  heading2("8.2 Shipment Status Lifecycle"),
  para("Each shipment progresses through these stages:"),
  bulletItem("bullets", 0, "Pending \u2014 Shipment created, awaiting packing."),
  bulletItem("bullets", 0, "Packed \u2014 Medications packed and ready for carrier pickup."),
  bulletItem("bullets", 0, "Shipped \u2014 Carrier has picked up the package. Tracking number entered."),
  bulletItem("bullets", 0, "In Transit \u2014 Package is in the carrier\u2019s delivery network."),
  bulletItem("bullets", 0, "Delivered \u2014 Package delivered to the patient. Confirmation recorded."),
  bulletItem("bullets", 0, "Returned \u2014 Package returned to pharmacy (undeliverable, refused, etc.)."),
  spacer(),
  staffRole("Shipping Clerk", "Packs shipments, enters tracking numbers, manages carrier pickups, and confirms deliveries."),
  spacer(),

  heading2("8.3 Shipping Routes"),
  para("The Shipping Routes page allows management of recurring delivery routes for local patients:"),
  bulletItem("bullets", 0, "Define routes with a name, driver, and list of delivery stops."),
  bulletItem("bullets", 0, "Assign shipments to routes for bulk local delivery."),
  bulletItem("bullets", 0, "Track delivery status per stop on the route."),
  spacer(),

  new Paragraph({ children: [new PageBreak()] }),

  // ═════════════════════════════════════════════════════════════════════════════
  // SECTION 9: PATIENT MESSAGING & COMMUNICATIONS
  // ═════════════════════════════════════════════════════════════════════════════
  heading1("9. Patient Messaging & Communications"),
  para("The Messaging module enables pharmacy staff to send notifications to patients via email and SMS, manage communication preferences, and maintain a complete audit log for HIPAA compliance."),

  heading2("9.1 Notification Templates"),
  para("The system includes five pre-built notification templates:"),
  bulletItem("bullets", 0, "Ready for Pickup \u2014 Sent when a prescription enters the waiting bin. Includes patient name, medication, and pharmacy address."),
  bulletItem("bullets", 0, "Refill Due \u2014 Sent when a patient\u2019s medication supply is running low based on days supply calculation."),
  bulletItem("bullets", 0, "Refill Processed \u2014 Sent when a refill request has been approved and filled."),
  bulletItem("bullets", 0, "Shipping Update \u2014 Sent when a shipment status changes (shipped, in transit, delivered)."),
  bulletItem("bullets", 0, "Prescription Expiring \u2014 Sent when a prescription is nearing its expiration date with no remaining refills."),
  spacer(),

  heading2("9.2 Sending Notifications"),
  numberedItem("steps7", 0, "Navigate to Messaging from the sidebar."),
  numberedItem("steps7", 0, "Enter the patient\u2019s ID or MRN."),
  numberedItem("steps7", 0, "Select the notification template."),
  numberedItem("steps7", 0, "Choose the delivery channels: Email, SMS, or both."),
  numberedItem("steps7", 0, "Click Send Notification."),
  numberedItem("steps7", 0, "The system sends the message through the configured email provider and/or Twilio SMS gateway."),
  spacer(),
  systemAction("Automated notifications (Ready for Pickup, Refill Due, Shipping Updates) are sent automatically by the system based on prescription status changes. Manual notifications can also be sent by staff from the Messaging page."),
  spacer(),

  heading2("9.3 Communication Log & Compliance"),
  para("Every notification sent is logged in the Communication Log with:"),
  bulletItem("bullets", 0, "Patient name and ID"),
  bulletItem("bullets", 0, "Message template used"),
  bulletItem("bullets", 0, "Channel (email/SMS)"),
  bulletItem("bullets", 0, "Timestamp of send"),
  bulletItem("bullets", 0, "Delivery status (sent, delivered, failed)"),
  bulletItem("bullets", 0, "Staff member who initiated (if manual)"),
  para("This log satisfies HIPAA requirements for tracking all patient communications."),
  spacer(),

  heading2("9.4 IVR Phone System Integration"),
  para("The PMS includes an integrated IVR (Interactive Voice Response) phone system powered by Twilio:"),
  bulletItem("bullets", 0, "Patients can call the pharmacy and navigate a phone menu to check prescription status, request refills, or reach a department."),
  bulletItem("bullets", 0, "Incoming calls are displayed on the Phone Dashboard with caller ID, patient match, and call reason."),
  bulletItem("bullets", 0, "Staff can place calls on hold, transfer between departments, and end calls directly from the PMS."),
  bulletItem("bullets", 0, "All calls are logged in the Communication Log with duration, outcome, and assigned staff."),
  spacer(),

  heading2("9.5 Campaign Management"),
  para("For bulk messaging (e.g., flu shot reminders, pharmacy closure notices):"),
  numberedItem("steps8", 0, "Navigate to Messaging > Campaigns."),
  numberedItem("steps8", 0, "Create a campaign with a name, target audience (all patients, active patients, patients on a specific drug class, etc.)."),
  numberedItem("steps8", 0, "Compose the message or select a template."),
  numberedItem("steps8", 0, "Choose channels and schedule the send time."),
  numberedItem("steps8", 0, "Review and confirm. Messages are sent in batches to avoid rate limits."),
  spacer(),
  staffRole("Pharmacist / Manager", "Creates and approves campaigns. Only users with \"communications:write\" permission can send bulk messages."),
  spacer(),
);

// ═════════════════════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: GREEN },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: numberingConfig,
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GREEN, space: 6 } },
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              children: [
                new TextRun({ text: "BNDS PMS \u2014 Complete Workflow Guide", size: 16, font: "Arial", color: GRAY }),
                new TextRun({ text: "\tConfidential", size: 16, font: "Arial", color: GRAY, italics: true }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: GREEN, space: 6 } },
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              children: [
                new TextRun({ text: "Boudreaux\u2019s New Drug Store", size: 16, font: "Arial", color: GRAY }),
                new TextRun({ text: "\tPage ", size: 16, font: "Arial", color: GRAY }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: GRAY }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

const OUTPUT = "C:\\Users\\cdowling\\OneDrive - Boudreaux's New Drug Store\\Cursor Projects\\bnds-pms\\docs\\BNDS_PMS_Complete_Workflow_Guide.docx";

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log(`Document saved to: ${OUTPUT}`);
  console.log(`Size: ${(buffer.length / 1024).toFixed(1)} KB`);
});
