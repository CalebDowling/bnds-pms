"""
Generate BNDS PMS Complete Workflow Guide PDF
Boudreaux's branded, professional layout with cover page and TOC.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, HRFlowable, ListFlowable, ListItem,
)
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate, Frame
from reportlab.lib.pagesizes import letter
import os

# ─── Colors ────────────────────────────────────────────────────────
BRAND_GREEN = HexColor("#40721D")
BRAND_GREEN_LIGHT = HexColor("#E8F0E0")
BRAND_GREEN_DARK = HexColor("#2D5114")
DARK_TEXT = HexColor("#1a1a1a")
MEDIUM_TEXT = HexColor("#4a4a4a")
LIGHT_TEXT = HexColor("#6b6b6b")
BORDER_COLOR = HexColor("#d0d0d0")
BG_LIGHT = HexColor("#f8f8f5")
RED_ALERT = HexColor("#dc2626")
BLUE_INFO = HexColor("#2563eb")

WIDTH, HEIGHT = letter

# ─── Output path ───────────────────────────────────────────────────
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "BNDS-PMS-Workflow-Guide.pdf")

# ─── Styles ────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name="CoverTitle",
    fontName="Helvetica-Bold",
    fontSize=28,
    leading=34,
    textColor=BRAND_GREEN,
    alignment=TA_CENTER,
    spaceAfter=12,
))

styles.add(ParagraphStyle(
    name="CoverSubtitle",
    fontName="Helvetica",
    fontSize=14,
    leading=18,
    textColor=MEDIUM_TEXT,
    alignment=TA_CENTER,
    spaceAfter=6,
))

styles.add(ParagraphStyle(
    name="SectionTitle",
    fontName="Helvetica-Bold",
    fontSize=18,
    leading=22,
    textColor=BRAND_GREEN,
    spaceBefore=24,
    spaceAfter=10,
    borderWidth=0,
    borderColor=BRAND_GREEN,
    borderPadding=0,
))

styles.add(ParagraphStyle(
    name="SubSection",
    fontName="Helvetica-Bold",
    fontSize=13,
    leading=16,
    textColor=BRAND_GREEN_DARK,
    spaceBefore=16,
    spaceAfter=6,
))

styles.add(ParagraphStyle(
    name="SubSubSection",
    fontName="Helvetica-Bold",
    fontSize=11,
    leading=14,
    textColor=DARK_TEXT,
    spaceBefore=12,
    spaceAfter=4,
))

styles.add(ParagraphStyle(
    name="BodyText2",
    fontName="Helvetica",
    fontSize=10,
    leading=14,
    textColor=DARK_TEXT,
    alignment=TA_JUSTIFY,
    spaceAfter=6,
))

styles.add(ParagraphStyle(
    name="BulletItem",
    fontName="Helvetica",
    fontSize=10,
    leading=14,
    textColor=DARK_TEXT,
    leftIndent=20,
    spaceAfter=3,
    bulletIndent=8,
    bulletFontName="Helvetica",
))

styles.add(ParagraphStyle(
    name="NumberItem",
    fontName="Helvetica",
    fontSize=10,
    leading=14,
    textColor=DARK_TEXT,
    leftIndent=20,
    spaceAfter=3,
))

styles.add(ParagraphStyle(
    name="BoldLabel",
    fontName="Helvetica-Bold",
    fontSize=10,
    leading=14,
    textColor=DARK_TEXT,
    spaceAfter=2,
))

styles.add(ParagraphStyle(
    name="QueueFlow",
    fontName="Courier-Bold",
    fontSize=10,
    leading=14,
    textColor=BRAND_GREEN,
    alignment=TA_CENTER,
    spaceBefore=8,
    spaceAfter=8,
    backColor=BRAND_GREEN_LIGHT,
    borderWidth=1,
    borderColor=BRAND_GREEN,
    borderPadding=8,
))

styles.add(ParagraphStyle(
    name="AlertText",
    fontName="Helvetica-Bold",
    fontSize=10,
    leading=13,
    textColor=RED_ALERT,
    leftIndent=10,
))

styles.add(ParagraphStyle(
    name="TOCEntry",
    fontName="Helvetica",
    fontSize=11,
    leading=18,
    textColor=DARK_TEXT,
    leftIndent=10,
))

styles.add(ParagraphStyle(
    name="TOCTitle",
    fontName="Helvetica-Bold",
    fontSize=16,
    leading=20,
    textColor=BRAND_GREEN,
    spaceBefore=20,
    spaceAfter=12,
))

styles.add(ParagraphStyle(
    name="Footer",
    fontName="Helvetica",
    fontSize=8,
    textColor=LIGHT_TEXT,
    alignment=TA_CENTER,
))

styles.add(ParagraphStyle(
    name="TableCell",
    fontName="Helvetica",
    fontSize=9,
    leading=12,
    textColor=DARK_TEXT,
))

styles.add(ParagraphStyle(
    name="TableHeader",
    fontName="Helvetica-Bold",
    fontSize=9,
    leading=12,
    textColor=white,
))

# ─── Helper functions ──────────────────────────────────────────────

def hr():
    return HRFlowable(width="100%", thickness=1, color=BRAND_GREEN, spaceBefore=4, spaceAfter=8)

def section(title):
    return Paragraph(title, styles["SectionTitle"])

def subsection(title):
    return Paragraph(title, styles["SubSection"])

def subsubsection(title):
    return Paragraph(title, styles["SubSubSection"])

def body(text):
    return Paragraph(text, styles["BodyText2"])

def bold_body(text):
    return Paragraph(f"<b>{text}</b>", styles["BodyText2"])

def bullet(text):
    return Paragraph(f"\u2022  {text}", styles["BulletItem"])

def numbered(num, text):
    return Paragraph(f"<b>{num}.</b>  {text}", styles["NumberItem"])

def make_table(headers, rows, col_widths=None):
    """Create a styled table with green header."""
    header_cells = [Paragraph(h, styles["TableHeader"]) for h in headers]
    data = [header_cells]
    for row in rows:
        data.append([Paragraph(str(c), styles["TableCell"]) for c in row])

    if col_widths is None:
        col_widths = [None] * len(headers)

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BACKGROUND", (0, 1), (-1, -1), white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, BG_LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
    ]))
    return t


# ─── Build Document ────────────────────────────────────────────────

def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=letter,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch,
        title="BNDS PMS Complete Workflow Guide",
        author="Boudreaux's New Drug Store",
    )

    story = []

    # ═══════════════════════════════════════════════════════════════
    # COVER PAGE
    # ═══════════════════════════════════════════════════════════════
    story.append(Spacer(1, 2*inch))

    # Green line
    story.append(HRFlowable(width="60%", thickness=3, color=BRAND_GREEN, spaceBefore=0, spaceAfter=20))

    story.append(Paragraph("BNDS Pharmacy<br/>Management System", styles["CoverTitle"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Complete Workflow Guide", ParagraphStyle(
        "CoverSub2", parent=styles["CoverSubtitle"], fontSize=16, textColor=BRAND_GREEN_DARK,
    )))
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="60%", thickness=3, color=BRAND_GREEN, spaceBefore=0, spaceAfter=20))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Operational Procedures for Pharmacy Staff", styles["CoverSubtitle"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Boudreaux's New Drug Store  |  Boudreaux's Compounding Pharmacy", ParagraphStyle(
        "CoverOrg", parent=styles["CoverSubtitle"], fontSize=10, textColor=LIGHT_TEXT,
    )))
    story.append(Spacer(1, 1.5*inch))
    story.append(Paragraph("CONFIDENTIAL - INTERNAL USE ONLY", ParagraphStyle(
        "Conf", parent=styles["CoverSubtitle"], fontSize=9, textColor=LIGHT_TEXT,
    )))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # TABLE OF CONTENTS
    # ═══════════════════════════════════════════════════════════════
    story.append(Paragraph("Table of Contents", styles["TOCTitle"]))
    story.append(hr())

    toc_items = [
        "1. Prescription Intake - How Prescriptions Enter the System",
        "2. The Queue Workflow - Processing a Prescription",
        "3. Compounding Workflow - Making Custom Medications",
        "4. Billing Workflow - How We Charge",
        "5. Shipping Workflow - Getting Prescriptions to Patients",
        "6. Daily Operations Summary",
        "7. Roles and Responsibilities",
    ]
    for item in toc_items:
        story.append(Paragraph(item, styles["TOCEntry"]))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SECTION 1: PRESCRIPTION INTAKE
    # ═══════════════════════════════════════════════════════════════
    story.append(section("1. Prescription Intake"))
    story.append(body("How prescriptions enter our pharmacy management system - from electronic prescriptions to walk-in paper scripts."))
    story.append(hr())

    # 1A
    story.append(subsection("1A. Electronic Prescriptions (eRx via SureScripts)"))
    story.append(body("A doctor's office sends an e-prescription through SureScripts. It hits our webhook and the system automatically:"))
    story.append(numbered(1, "<b>Parses</b> the incoming NCPDP SCRIPT message (NEWRX, RXCHG, CANRX, RXREN)"))
    story.append(numbered(2, "<b>Matches</b> the data to our records:"))
    story.append(bullet("<b>Patient</b>: By name + DOB (exact match first, then fuzzy)"))
    story.append(bullet("<b>Prescriber</b>: By NPI, then DEA, then name"))
    story.append(bullet("<b>Drug</b>: By NDC (exact), then name search, then formula matching"))
    story.append(numbered(3, "<b>Scores confidence</b>: Each match gets a score (Exact = 1.0, Probable = 0.8-0.95, Possible = 0.6-0.8)"))
    story.append(numbered(4, "<b>Routes the prescription</b>:"))
    story.append(bullet("If ALL matches are exact (100% confidence) - auto-creates the prescription with status <b>intake</b> and assigns an RX number"))
    story.append(bullet("If ANY match is uncertain - creates an <b>Intake Queue Item</b> with status <b>pending</b> for manual review"))
    story.append(Spacer(1, 6))
    story.append(body("<b>What the tech sees:</b> The Intake queue on the dashboard shows a count. They click in and see all pending e-prescriptions. For uncertain matches, they pick from candidate matches (radio buttons), then click 'Process' to create the prescription."))

    # 1B
    story.append(subsection("1B. Prescriber Portal Orders"))
    story.append(body("Doctors and clinics can submit orders directly through our prescriber portal:"))
    story.append(numbered(1, "Doctor logs into the prescriber portal"))
    story.append(numbered(2, "Fills out the order form: patient type, patient info, formula selection, quantity, days supply, directions, refills, priority, shipping method"))
    story.append(numbered(3, "Submits - creates an intake queue item that flows into the same processing pipeline"))

    # 1C
    story.append(subsection("1C. Manual Entry (Walk-ins, Phone, Fax, Written Rx)"))
    story.append(body("For paper prescriptions or phone orders:"))
    story.append(numbered(1, "Tech goes to <b>Prescriptions - New Prescription</b>"))
    story.append(numbered(2, "Fills out the form: Patient (search by name/MRN), Prescriber (search by name/NPI), Drug (item or compound formula), Details (source, priority, quantity, SIG, DAW, refills, dates), Notes"))
    story.append(numbered(3, "Clicks 'Create' - system generates an RX number, creates the prescription with status <b>intake</b>"))

    # 1D
    story.append(subsection("1D. Refill Requests"))
    story.append(body("Patients can request refills via phone, portal, or IVR. These appear in the Refills queue:"))
    story.append(bullet("<b>Approve</b>: Creates a new fill automatically, decrements refills remaining"))
    story.append(bullet("<b>Reject</b>: Must provide a reason (no refills left, expired, prescriber denied, etc.)"))
    story.append(bullet("Batch processing available for bulk approvals"))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SECTION 2: QUEUE WORKFLOW
    # ═══════════════════════════════════════════════════════════════
    story.append(section("2. The Queue Workflow"))
    story.append(body("Once a prescription is in the system, it moves through these queues. Each queue represents a step that a tech or pharmacist must complete."))
    story.append(hr())

    story.append(Paragraph(
        "INTAKE  -->  ADJUDICATING  -->  PRINT  -->  SCAN  -->  VERIFY  -->  WAITING BIN  -->  SOLD",
        styles["QueueFlow"]
    ))

    # Intake
    story.append(subsection("INTAKE (Tech)"))
    story.append(bullet("Review the prescription details, patient info, allergies"))
    story.append(bullet("Confirm everything looks correct"))
    story.append(bullet("Click 'Advance to Adjudicating'"))

    # Adjudicating
    story.append(subsection("ADJUDICATING / SYNC (System + Tech)"))
    story.append(bullet("System builds an NCPDP D.0 claim with the patient's insurance info (BIN, PCN, group, member ID)"))
    story.append(bullet("Submits to the claims switch (Change Healthcare)"))
    story.append(bullet("If <b>PAID</b>: Claim records the copay amount, advances to Print"))
    story.append(bullet("If <b>REJECTED</b>: Goes to Reject queue with rejection codes"))
    story.append(bullet("If insurance issue: May route to Price Check, Prepay, or OK to Charge queues"))

    # Print
    story.append(subsection("PRINT (Tech)"))
    story.append(bullet("Tech sees the label PDF preview"))
    story.append(bullet("Clicks 'Open Label PDF' to print the prescription label on the Zebra printer"))
    story.append(bullet("Confirms label printed, clicks 'Advance to Scan'"))

    # Scan
    story.append(subsection("SCAN (Tech)"))
    story.append(bullet("Tech picks the drug bottle from the shelf"))
    story.append(bullet("Scans the barcode on the bottle with the barcode scanner"))
    story.append(bullet("System compares the scanned NDC to the expected NDC"))
    story.append(Paragraph("\u2022  <b><font color='#16a34a'>GREEN = MATCH</font></b>: NDC confirmed, tech advances to Verify", styles["BulletItem"]))
    story.append(Paragraph("\u2022  <b><font color='#dc2626'>RED = MISMATCH</font></b>: Wrong drug - tech must get the correct bottle", styles["BulletItem"]))
    story.append(Paragraph("\u2022  <b>Cannot advance until scan passes (patient safety)</b>", styles["AlertText"]))

    # Verify
    story.append(subsection("VERIFY (Pharmacist Only)"))
    story.append(body("Pharmacist reviews the full prescription:"))
    story.append(bullet("Drug, strength, dosage form correct?"))
    story.append(bullet("Quantity and days supply appropriate?"))
    story.append(bullet("SIG directions match the prescription?"))
    story.append(bullet("No drug interactions or allergy conflicts?"))
    story.append(bullet("NDC/lot was verified during scan?"))
    story.append(bullet("For controlled substances: PDMP check completed?"))
    story.append(body("Clicks 'Advance to Waiting Bin'. System records <b>verifiedBy</b> and <b>verifiedAt</b>."))

    # Waiting Bin
    story.append(subsection("WAITING BIN (Tech)"))
    story.append(bullet("Prescription placed in the physical bin (location tracked, e.g. 'B-15')"))
    story.append(bullet("Patient notified via SMS that their prescription is ready"))
    story.append(bullet("<font color='#16a34a'><b>Green</b></font>: Less than 7 days  |  <font color='#ca8a04'><b>Yellow</b></font>: 7-14 days  |  <font color='#dc2626'><b>Red</b></font>: Over 14 days"))

    # Sold
    story.append(subsection("SOLD / PICKUP (Tech)"))
    story.append(numbered(1, "Verify patient ID (checkbox)"))
    story.append(numbered(2, "Offer counseling (checkbox)"))
    story.append(numbered(3, "Review allergies (checkbox)"))
    story.append(numbered(4, "If someone else picking up: Record name, relationship, ID"))
    story.append(numbered(5, "Capture patient signature (digital signature pad)"))
    story.append(numbered(6, "Collect copay via POS (cash, credit, debit, check)"))
    story.append(body("Click 'Complete Pickup' - fill status becomes <b>sold/dispensed</b>."))

    # Exception queues table
    story.append(Spacer(1, 10))
    story.append(subsection("Exception Queues"))
    story.append(make_table(
        ["Queue", "What Triggers It", "How to Resolve"],
        [
            ["HOLD", "Tech or pharmacist puts on hold", "Add notes, resolve issue, send back to queue"],
            ["OOS", "Drug not available in inventory", "Order the drug, send back when received"],
            ["REJECT", "Insurance claim rejected", "Fix issue, rebill"],
            ["PRICE CHECK", "Pricing issue needs review", "Verify pricing, send back to Adjudicating"],
            ["PREPAY", "Patient must pay first", "Contact patient, collect payment"],
            ["OK TO CHARGE", "Approved to bill directly", "Process charge, advance to Print"],
            ["DECLINE", "Patient declined to pay", "Cancel or hold prescription"],
            ["OK TO CHARGE CLINIC", "Bill the ordering clinic", "Process clinic charge, advance"],
        ],
        col_widths=[1.2*inch, 2.2*inch, 3.2*inch],
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SECTION 3: COMPOUNDING
    # ═══════════════════════════════════════════════════════════════
    story.append(section("3. Compounding Workflow"))
    story.append(body("The complete process for making custom medications - from formula creation through batch verification."))
    story.append(hr())

    story.append(subsection("Step 1: Create or Select a Formula"))
    story.append(body("Before compounding, you need a formula (recipe). Go to <b>Compounding - Formulas - New Formula</b>:"))
    story.append(bullet("<b>Formula Name</b>: e.g. 'Ketoprofen 10%/Cyclobenzaprine 2%/Lidocaine 5% Cream'"))
    story.append(bullet("<b>Formula Code</b>: e.g. 'KCL-CREAM-1054' (unique identifier)"))
    story.append(bullet("<b>Category</b>: cream, capsule, suspension, solution, etc."))
    story.append(bullet("<b>Sterile</b>: Yes/No (sterile compounds have stricter requirements)"))
    story.append(bullet("<b>Default BUD</b>: Number of days (e.g. 180)"))
    story.append(bullet("<b>Storage Conditions</b>: Room temp, refrigerate, freeze"))

    story.append(subsection("Step 2: Add Formula Version with Ingredients and Steps"))
    story.append(body("Each formula can have multiple versions (recipe improvements). A version includes:"))
    story.append(make_table(
        ["Ingredient", "Quantity", "Unit", "Active?"],
        [
            ["Ketoprofen powder", "10.0", "g", "Yes"],
            ["Cyclobenzaprine HCl", "2.0", "g", "Yes"],
            ["Lidocaine", "5.0", "g", "Yes"],
            ["Pentravan cream base", "81.0", "g", "No"],
        ],
        col_widths=[2.5*inch, 1.2*inch, 1*inch, 1*inch],
    ))

    story.append(subsection("Step 3: Create a Batch"))
    story.append(bullet("Select the formula (search by name or code)"))
    story.append(bullet("Enter quantity to prepare (e.g. 120 grams)"))
    story.append(bullet("Set the Beyond-Use Date"))
    story.append(bullet("Record environmental conditions (temperature, humidity)"))
    story.append(bullet("Click 'Create Batch' - batch number auto-generated, status = 'In Progress'"))

    story.append(subsection("Step 4: Weigh Ingredients"))
    story.append(numbered(1, "Select the <b>lot</b> to pull from (system shows available lots sorted by expiration - FIFO)"))
    story.append(numbered(2, "Record the <b>actual quantity weighed</b> (what the scale reads)"))
    story.append(numbered(3, "System logs: which lot was used, actual vs expected quantity, who weighed it, when"))
    story.append(numbered(4, "Inventory is decremented from that lot automatically"))

    story.append(subsection("Step 5: QA Checks"))
    story.append(bullet("<b>Check type</b>: Appearance, pH, clarity, consistency, color, odor, weight variation"))
    story.append(bullet("<b>Expected value</b>: What it should be (e.g. 'pH 5.5-6.5')"))
    story.append(bullet("<b>Actual value</b>: What was measured"))
    story.append(bullet("<b>Result</b>: Pass or Fail"))

    story.append(subsection("Step 6: Sign-Off and Verify"))
    story.append(numbered(1, "<b>Compounder sign-off</b>: Tech who made it confirms complete - status = 'Completed'"))
    story.append(numbered(2, "<b>Pharmacist verification</b>: RPh reviews batch record, QA results, signs off - status = 'Verified'"))
    story.append(numbered(3, "<b>Release</b>: Once both signatures are in, batch can be released for dispensing"))

    story.append(subsection("Step 7: Print Batch Record and Labels"))
    story.append(bullet("<b>Batch Record PDF</b>: Complete documentation (ingredients, weights, QA, signatures) for compliance"))
    story.append(bullet("<b>Compound Label</b>: Patient info, RX number, formula name, SIG, BUD date, lot numbers"))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SECTION 4: BILLING
    # ═══════════════════════════════════════════════════════════════
    story.append(section("4. Billing Workflow"))
    story.append(body("How we charge for prescriptions - insurance claims, direct billing to clinics, and patient copays."))
    story.append(hr())

    story.append(subsection("4A. Insurance Claims (Most Prescriptions)"))
    story.append(numbered(1, "System auto-builds an NCPDP D.0 claim: BIN, PCN, Group, Member ID, NDC, quantity, days supply, pricing, prescriber NPI"))
    story.append(numbered(2, "Claim submits to the switch vendor (Change Healthcare)"))
    story.append(numbered(3, "Response: <b>PAID</b> (records copay, advances) | <b>REJECTED</b> (goes to Reject queue) | <b>PENDED</b> (stays in Adjudicating)"))
    story.append(numbered(4, "<b>Rejection Resolution</b>: View code (e.g. '15 = Refill Too Soon'), fix the issue, rebill"))
    story.append(numbered(5, "<b>Multi-Insurance</b>: If primary rejects/partially pays, submit to secondary"))

    story.append(subsection("4B. Direct Billing to Clinics/Doctors"))
    story.append(body("For clinics ordering compounds and wanting direct billing:"))
    story.append(bullet("Each clinic has a <b>Charge Account</b> with balance and credit limit"))
    story.append(bullet("Charges applied when prescriptions are filled"))
    story.append(bullet("Billing team manages: outstanding balances, payments, statements"))
    story.append(bullet("<b>AR Aging Report</b>: 0-30, 31-60, 61-90, 90+ day buckets"))

    story.append(subsection("4C. Direct Fees"))
    story.append(body("For services not tied to a prescription: consultation fees, delivery charges, compound preparation fees, admin fees."))

    story.append(subsection("4D. POS (Point of Sale) for Copay Collection"))
    story.append(numbered(1, "POS screen shows the copay amount"))
    story.append(numbered(2, "Tech selects payment method: cash, credit, debit, check"))
    story.append(numbered(3, "Processes payment, receipt generated"))
    story.append(numbered(4, "Transaction logged to POS session"))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SECTION 5: SHIPPING
    # ═══════════════════════════════════════════════════════════════
    story.append(section("5. Shipping Workflow"))
    story.append(body("Getting prescriptions to patients who selected delivery."))
    story.append(hr())

    story.append(subsection("5A. Creating a Shipment"))
    story.append(bullet("<b>Patient</b>: Select from list"))
    story.append(bullet("<b>Carrier</b>: FedEx, UPS, USPS, courier"))
    story.append(bullet("<b>Service Level</b>: Standard, priority, overnight, same-day"))
    story.append(bullet("<b>Weight</b>: Package weight in ounces"))
    story.append(bullet("<b>Cold Chain Required</b>: Yes/No (for refrigerated compounds)"))
    story.append(bullet("<b>Signature Required</b>: Yes/No (for controlled substances)"))

    story.append(subsection("5B. Packing and Shipping"))
    story.append(numbered(1, "<b>Packing List</b>: System generates a list of all items in the shipment"))
    story.append(numbered(2, "<b>Shipping Label</b>: Generated through carrier API with pharmacy return address and patient delivery address"))
    story.append(numbered(3, "<b>Mark as Shipped</b>: Enter tracking number, confirm ship date"))
    story.append(numbered(4, "Patient receives SMS/email with tracking info"))

    story.append(subsection("5C. Delivery Confirmation"))
    story.append(bullet("Track shipment status via carrier API"))
    story.append(bullet("When delivered: status = 'Delivered', timestamp recorded"))
    story.append(bullet("If signature required, carrier confirms signature captured"))

    story.append(subsection("5D. Label Types"))
    story.append(make_table(
        ["Label Type", "Used For", "Generated At"],
        [
            ["Rx Label", "Prescription vial/container", "/api/labels/print/{fillId}"],
            ["Compound Label", "Compound medication", "/api/labels/compound?fillId={id}"],
            ["Batch Record", "Compounding documentation", "/api/labels/batch?batchId={id}"],
            ["Shipping Label", "Outbound packages", "Carrier API integration"],
            ["Packing Slip", "Inside the package", "Generated with shipment"],
        ],
        col_widths=[1.5*inch, 2*inch, 2.8*inch],
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # SECTION 6: DAILY OPERATIONS
    # ═══════════════════════════════════════════════════════════════
    story.append(section("6. Daily Operations Summary"))
    story.append(hr())

    story.append(subsection("Morning Opening"))
    story.append(numbered(1, "Check dashboard for overnight eRx arrivals (Intake count)"))
    story.append(numbered(2, "Open POS register session"))
    story.append(numbered(3, "Review any holds or rejected claims from previous day"))
    story.append(numbered(4, "Check low stock alerts and expiring lots"))

    story.append(subsection("Throughout the Day"))
    story.append(bullet("<b>Intake Tech</b>: Processes incoming eRx and manual prescriptions"))
    story.append(bullet("<b>Fill Tech</b>: Prints labels, fills prescriptions, scans barcodes"))
    story.append(bullet("<b>Pharmacist</b>: Verifies fills, reviews DUR alerts, counsels patients"))
    story.append(bullet("<b>Compounding Tech</b>: Weighs ingredients, performs QA checks"))
    story.append(bullet("<b>Billing</b>: Resolves rejected claims, processes charge account payments"))
    story.append(bullet("<b>Shipping</b>: Packs orders, generates shipping labels, confirms deliveries"))
    story.append(bullet("<b>Pickup</b>: Processes patient pickups with ID verification and signature"))

    story.append(subsection("End of Day"))
    story.append(numbered(1, "Close POS register session (balance drawer)"))
    story.append(numbered(2, "Review waiting bin for overdue items (>14 days)"))
    story.append(numbered(3, "Check that all compounding batches have been verified"))
    story.append(numbered(4, "Review shipping - all orders shipped?"))
    story.append(numbered(5, "Check queue counts - anything stuck?"))

    # ═══════════════════════════════════════════════════════════════
    # SECTION 7: ROLES
    # ═══════════════════════════════════════════════════════════════
    story.append(Spacer(1, 20))
    story.append(section("7. Roles and Responsibilities"))
    story.append(hr())

    story.append(make_table(
        ["Role", "What They Do", "Key Screens"],
        [
            ["Pharmacy Technician", "Process intake, fill Rx, print/scan, compound, ship", "Queue, Intake, Compounding, Shipping"],
            ["Pharmacist (RPh)", "Verify fills, DUR review, counsel patients, sign off batches", "Queue (Verify), Compounding, Pickup"],
            ["Billing Specialist", "Submit claims, resolve rejections, manage charge accounts", "Billing, Claims, AR Aging, Direct Fees"],
            ["Shipping Clerk", "Pack orders, print shipping labels, track deliveries", "Shipping, Packing Lists"],
            ["Admin / Manager", "System settings, user management, reporting, audit logs", "Settings, Users, Analytics, Compliance"],
        ],
        col_widths=[1.5*inch, 2.5*inch, 2.5*inch],
    ))

    # ─── Build ─────────────────────────────────────────────────────
    doc.build(story)
    print(f"PDF generated: {OUTPUT_PATH}")
    return OUTPUT_PATH


if __name__ == "__main__":
    build_pdf()
