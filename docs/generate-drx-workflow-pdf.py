"""
Generate DRX Pharmacy System Workflow Guide PDF
Pure DRX operations document — no BNDS PMS references.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    HRFlowable,
)
import os

# ─── Colors ────────────────────────────────────────────────────────
DRX_BLUE = HexColor("#1e40af")
DRX_BLUE_LIGHT = HexColor("#dbeafe")
DRX_BLUE_DARK = HexColor("#1e3a8a")
DARK_TEXT = HexColor("#1a1a1a")
MEDIUM_TEXT = HexColor("#4a4a4a")
LIGHT_TEXT = HexColor("#6b6b6b")
BORDER_COLOR = HexColor("#d0d0d0")
BG_LIGHT = HexColor("#f8f9fc")
RED_ALERT = HexColor("#dc2626")
GREEN_OK = HexColor("#16a34a")

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "DRX-Pharmacy-System-Guide.pdf")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", fontName="Helvetica-Bold", fontSize=30, leading=36, textColor=DRX_BLUE, alignment=TA_CENTER, spaceAfter=12))
styles.add(ParagraphStyle(name="CoverSubtitle", fontName="Helvetica", fontSize=14, leading=18, textColor=MEDIUM_TEXT, alignment=TA_CENTER, spaceAfter=6))
styles.add(ParagraphStyle(name="SectionTitle", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=DRX_BLUE, spaceBefore=24, spaceAfter=10))
styles.add(ParagraphStyle(name="SubSection", fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=DRX_BLUE_DARK, spaceBefore=16, spaceAfter=6))
styles.add(ParagraphStyle(name="BodyText2", fontName="Helvetica", fontSize=10, leading=14, textColor=DARK_TEXT, alignment=TA_JUSTIFY, spaceAfter=6))
styles.add(ParagraphStyle(name="BulletItem", fontName="Helvetica", fontSize=10, leading=14, textColor=DARK_TEXT, leftIndent=20, spaceAfter=3, bulletIndent=8))
styles.add(ParagraphStyle(name="NumberItem", fontName="Helvetica", fontSize=10, leading=14, textColor=DARK_TEXT, leftIndent=20, spaceAfter=3))
styles.add(ParagraphStyle(name="QueueFlow", fontName="Courier-Bold", fontSize=10, leading=14, textColor=DRX_BLUE, alignment=TA_CENTER, spaceBefore=8, spaceAfter=8, backColor=DRX_BLUE_LIGHT, borderWidth=1, borderColor=DRX_BLUE, borderPadding=8))
styles.add(ParagraphStyle(name="TOCEntry", fontName="Helvetica", fontSize=11, leading=18, textColor=DARK_TEXT, leftIndent=10))
styles.add(ParagraphStyle(name="TOCTitle", fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=DRX_BLUE, spaceBefore=20, spaceAfter=12))
styles.add(ParagraphStyle(name="AlertText", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=RED_ALERT, leftIndent=10))
styles.add(ParagraphStyle(name="TableCell", fontName="Helvetica", fontSize=9, leading=12, textColor=DARK_TEXT))
styles.add(ParagraphStyle(name="TableHeader", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=white))

def hr():
    return HRFlowable(width="100%", thickness=1, color=DRX_BLUE, spaceBefore=4, spaceAfter=8)

def section(t):
    return Paragraph(t, styles["SectionTitle"])

def subsection(t):
    return Paragraph(t, styles["SubSection"])

def body(t):
    return Paragraph(t, styles["BodyText2"])

def bullet(t):
    return Paragraph(f"\u2022  {t}", styles["BulletItem"])

def numbered(n, t):
    return Paragraph(f"<b>{n}.</b>  {t}", styles["NumberItem"])

def make_table(headers, rows, col_widths=None):
    hc = [Paragraph(h, styles["TableHeader"]) for h in headers]
    data = [hc] + [[Paragraph(str(c), styles["TableCell"]) for c in r] for r in rows]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DRX_BLUE),
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


def build_pdf():
    doc = SimpleDocTemplate(OUTPUT_PATH, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch, leftMargin=0.75*inch, rightMargin=0.75*inch, title="DRX Pharmacy System - Workflow Guide", author="Boudreaux's New Drug Store")
    story = []

    # ═══ COVER PAGE ═══
    story.append(Spacer(1, 2*inch))
    story.append(HRFlowable(width="60%", thickness=3, color=DRX_BLUE, spaceBefore=0, spaceAfter=20))
    story.append(Paragraph("DRX", styles["CoverTitle"]))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Pharmacy Management System", ParagraphStyle("cs2", parent=styles["CoverSubtitle"], fontSize=18, textColor=DRX_BLUE_DARK)))
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="60%", thickness=3, color=DRX_BLUE, spaceBefore=0, spaceAfter=20))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Complete Workflow and Operations Guide", styles["CoverSubtitle"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("How DRX Handles Prescriptions, Queues, Billing,<br/>Compounding, Labels, and Dispensing", ParagraphStyle("co", parent=styles["CoverSubtitle"], fontSize=10, textColor=LIGHT_TEXT)))
    story.append(Spacer(1, 1.5*inch))
    story.append(Paragraph("CONFIDENTIAL - INTERNAL USE ONLY", ParagraphStyle("cf", parent=styles["CoverSubtitle"], fontSize=9, textColor=LIGHT_TEXT)))
    story.append(PageBreak())

    # ═══ TOC ═══
    story.append(Paragraph("Table of Contents", styles["TOCTitle"]))
    story.append(hr())
    for item in [
        "1. DRX System Overview",
        "2. Technology Partners and Integrations",
        "3. The Prescription Lifecycle in DRX",
        "4. DRX Queue System",
        "5. Custom Queues and Fill Tags",
        "6. Patient Records",
        "7. Drug Catalog and Inventory",
        "8. Prescriber Management",
        "9. Insurance Claims and Adjudication",
        "10. Label Templates and Printing",
        "11. Compounding in DRX",
        "12. Refills and Renewals",
        "13. Reporting and Administration",
    ]:
        story.append(Paragraph(item, styles["TOCEntry"]))
    story.append(PageBreak())

    # ═══ 1: OVERVIEW ═══
    story.append(section("1. DRX System Overview"))
    story.append(body("DRX is a cloud-hosted pharmacy management system that handles the full prescription lifecycle from e-prescribing intake through dispensing. It manages patients, prescribers, drug inventory, insurance claims, label printing, and workflow queues."))
    story.append(hr())

    story.append(subsection("Core Capabilities"))
    story.append(bullet("<b>Prescription Processing</b>: Receives e-prescriptions via SureScripts, manages the full fill workflow"))
    story.append(bullet("<b>Queue-Based Workflow</b>: 9 standard queues + custom tag-based queues route prescriptions through each processing step"))
    story.append(bullet("<b>Insurance Adjudication</b>: Real-time NCPDP D.0 claims submitted to PBMs during the Adjudicating step"))
    story.append(bullet("<b>Patient Management</b>: Complete patient records with demographics, allergies, insurance, addresses, phone numbers"))
    story.append(bullet("<b>Drug Catalog</b>: NDC-based item catalog with pricing (AWP, acquisition cost), DEA scheduling, lot-level inventory"))
    story.append(bullet("<b>Label Printing</b>: Template-based label system with 83+ templates covering Rx labels, batch records, packing slips, receipts"))
    story.append(bullet("<b>Compounding</b>: Batch tracking for compound prescriptions"))
    story.append(bullet("<b>Reporting</b>: Daily summaries, register receipts, DEA logs"))

    story.append(subsection("System Architecture"))
    story.append(bullet("Cloud-hosted SaaS platform (drxapp.com)"))
    story.append(bullet("Web-based interface for all pharmacy workstations"))
    story.append(bullet("External REST API (v1) for third-party integrations"))
    story.append(bullet("SureScripts certified for e-prescribing (NEWRX, RXCHG, CANRX, RXREN)"))
    story.append(bullet("NCPDP D.0 compliant for insurance claim transactions"))

    story.append(PageBreak())

    # ═══ 2: TECHNOLOGY PARTNERS & INTEGRATIONS ═══
    story.append(section("2. Technology Partners and Integrations"))
    story.append(body("DRX relies on a network of third-party companies, services, and hardware integrations to deliver its full pharmacy workflow. These are the companies and platforms that power DRX behind the scenes."))
    story.append(hr())

    story.append(subsection("E-Prescribing and Prescription Networks"))
    story.append(make_table(
        ["Company", "Role", "What It Does"],
        [
            ["SureScripts", "E-Prescribing Network", "The national e-prescribing network that connects DRX to prescriber EHR systems. Routes NEWRX, RXCHG, CANRX, and RXREN messages. Also handles EPCS (Electronic Prescribing for Controlled Substances) with DEA-compliant two-factor authentication."],
            ["CoverMyMeds", "Prior Authorization", "Automates the prior authorization process when insurance requires approval before dispensing. Connects pharmacies, prescribers, and payers to resolve PA requests electronically instead of by phone/fax."],
        ],
        col_widths=[1.3*inch, 1.3*inch, 3.6*inch],
    ))

    story.append(subsection("Insurance Claims and Billing"))
    story.append(make_table(
        ["Company", "Role", "What It Does"],
        [
            ["Change Healthcare", "Claims Switch / Clearinghouse", "Transmits NCPDP D.0 pharmacy claims between DRX and PBMs (pharmacy benefit managers) in real-time. Handles claim submission (B1), reversals (B2), rebills (B3), eligibility checks (E1), and prior auth transactions (PA). Acts as the intermediary for all insurance billing."],
            ["Rx Linc", "Claims Intelligence", "Secondary claims processing platform that converts prescription data into actionable intelligence. Provides real-time coverage verification, multi-network PBM search, and benefit details to reduce claim rejections."],
            ["Docstation", "Clinical Services Billing", "Billing software that helps pharmacies bill for clinical services (MTM, immunizations, point-of-care testing) beyond traditional prescription dispensing. Streamlines clinical revenue streams."],
        ],
        col_widths=[1.3*inch, 1.3*inch, 3.6*inch],
    ))

    story.append(subsection("Pharmacy Automation and Hardware"))
    story.append(make_table(
        ["Company", "Product", "What It Does"],
        [
            ["Eyecon", "Pill Counting System", "Automated prescription counting using visual recognition technology with 99.99% accuracy. The camera-based system counts pills on a tray and feeds the count directly into DRX, eliminating manual counting errors."],
            ["ScriptPro", "Robotic Dispensing", "Robotic vial-filling automation. Robots store high-volume medications and automatically count, fill, cap, and label vials. Reduces staff burden on repetitive dispensing tasks."],
            ["RxSafe", "Vial Filling / Will Call", "RxSafe 1800 for automated vial filling and RapidPakRx for compliance packaging (blister packs). Integrates with DRX for prescription data and verification."],
            ["Parata", "Adherence Packaging", "Pharmacy automation portfolio focused on medication adherence packaging (pouch packaging, blister cards). Used for long-term care and med-sync programs."],
            ["Yuyama", "Pharmacy Automation", "Japanese-manufactured pharmacy automation systems including tablet counters, packaging machines, and dispensing robots. Improves operational efficiency for high-volume pharmacies."],
            ["PickPoint", "Will Call / Kiosks", "Automated will-call bag storage and retrieval system. Patients scan or provide info at a kiosk, and the system retrieves their prescription bag automatically. Also offers remote dispensing kiosks (PickPoint RDS)."],
            ["Sartorius / Ohaus", "Precision Scales", "Laboratory-grade scales integrated with DRX for compounding. Weights are read directly into the batch record for ingredient weighing verification."],
            ["Verifone", "Payment Terminals", "Point-of-sale payment processing hardware. Handles credit, debit, FSA, and HSA card payments at the pharmacy counter. Integrates with DRX POS module."],
        ],
        col_widths=[1.1*inch, 1.2*inch, 3.9*inch],
    ))

    story.append(PageBreak())

    story.append(subsection("Inventory Management"))
    story.append(make_table(
        ["Company", "Product", "What It Does"],
        [
            ["Datarithm", "Inventory Optimization", "Cloud-based inventory management that uses algorithms to optimize prescription drug ordering. Analyzes dispensing patterns, wholesaler deals, and return opportunities to maximize pharmacy profitability and minimize dead stock."],
            ["Cardinal Health", "Inventory Manager", "Web-based inventory visibility and control system from one of the largest pharmaceutical wholesalers. Provides real-time stock levels, automated ordering, and supply chain management integrated with DRX."],
        ],
        col_widths=[1.3*inch, 1.3*inch, 3.6*inch],
    ))

    story.append(subsection("Business Intelligence and Analytics"))
    story.append(make_table(
        ["Company", "Product", "What It Does"],
        [
            ["FDS (MyDataMart)", "Business Intelligence", "Data analytics platform providing business intelligence and clinical empowerment tools. Supports value-based pharmacy care with reporting on dispensing trends, financial performance, and clinical outcomes."],
            ["FDS Amplicare / EnlivenHealth", "Patient Engagement", "Software products strengthening pharmacy health and patient outcomes. Includes personalized IVR (powered by Twilio), patient outreach campaigns, medication adherence programs, and clinical service identification."],
        ],
        col_widths=[1.3*inch, 1.3*inch, 3.6*inch],
    ))

    story.append(subsection("Workflow Automation and Integration"))
    story.append(make_table(
        ["Company", "Product", "What It Does"],
        [
            ["Keragon", "No-Code Automation", "HIPAA-compliant no-code automation platform that connects DRX to other tools like EHRs, scheduling systems, and forms. Enables custom workflows without programming — for example, auto-creating tasks when an eRx arrives or sending notifications on claim rejections."],
            ["XchangePoint", "Data Exchange", "Pharmacy data exchange software that facilitates transferring prescription and patient data between systems, wholesalers, and partners."],
        ],
        col_widths=[1.3*inch, 1.3*inch, 3.6*inch],
    ))

    story.append(subsection("Long-Term Care and Specialty"))
    story.append(make_table(
        ["Company", "Product", "What It Does"],
        [
            ["ECP123", "Assisted Living Software", "Manages the full prospect-to-billing workflow for assisted living facilities. Integrates with DRX for medication management, MAR (Medication Administration Records), and facility billing."],
            ["CS Manager (Apex)", "Controlled Substance Management", "Specialized software for DEA-compliant controlled substance tracking, perpetual inventory, and regulatory reporting. Manages Schedule II-V dispensing logs and reconciliation."],
            ["Inventory Assistant (Apex)", "Inventory Tools", "Additional inventory management tools from Apex Custom Software for specialized inventory tracking beyond DRX's built-in capabilities."],
        ],
        col_widths=[1.3*inch, 1.3*inch, 3.6*inch],
    ))

    story.append(subsection("Prescription Drug Monitoring (PDMP)"))
    story.append(body("DRX integrates with state Prescription Drug Monitoring Programs through <b>Bamboo Health</b> (formerly Appriss Health), which operates <b>PMP InterConnect</b> — the national network connecting over 90% of state PDMPs. When dispensing controlled substances (Schedule II-V), pharmacists can query the PDMP directly from DRX to check a patient's controlled substance history across all pharmacies in the state."))

    story.append(subsection("Other Infrastructure"))
    story.append(bullet("<b>DRX Built-in IVR</b>: DRX includes its own integrated phone system using WebRTC technology with IVR (Interactive Voice Response) for automated refill requests, prescription status inquiries, and outbound patient notification calls. Unlimited phone lines included."))
    story.append(bullet("<b>DRX Mobile App</b>: Custom-branded iOS and Android apps for patients with prescription refill ordering, profile access, and pharmacy communication."))
    story.append(bullet("<b>DRX Website Integration</b>: Built-in website hosting or integration widgets for online refill requests."))
    story.append(bullet("<b>Upper Cumberland Label</b>: Prescription label stock supplier for thermal label printers."))
    story.append(bullet("<b>R.C. Smith</b>: Service provider for pharmacy equipment and technology implementation."))

    story.append(PageBreak())

    # ═══ 3: PRESCRIPTION LIFECYCLE ═══
    story.append(section("3. The Prescription Lifecycle in DRX"))
    story.append(body("Every prescription follows this workflow from the moment it enters DRX until the patient picks it up. Each step is a queue that technicians and pharmacists work through sequentially."))
    story.append(hr())

    story.append(Paragraph("Pre-Check --> Adjudicating --> Print --> Scan --> Verify --> Waiting Bin --> Sold", styles["QueueFlow"]))

    story.append(subsection("How Prescriptions Enter DRX"))
    story.append(body("Prescriptions can enter the system through several channels:"))
    story.append(bullet("<b>E-Prescribing (SureScripts)</b>: The most common method. A prescriber's EHR sends an NCPDP SCRIPT NEWRX message to DRX. DRX automatically matches the patient, prescriber, and drug to existing records."))
    story.append(bullet("<b>Manual Entry</b>: A technician types in a prescription from a paper script, phone call, or fax. They search for the patient, prescriber, and drug, then enter quantity, days supply, SIG directions, refills, and DAW code."))
    story.append(bullet("<b>Transfer In</b>: A prescription transferred from another pharmacy. The tech enters it manually with the transfer details."))
    story.append(bullet("<b>Renewal/Refill</b>: When a patient requests a refill on an existing Rx. If refills remain, DRX creates a new fill automatically."))

    story.append(subsection("Pre-Check"))
    story.append(body("The first queue. The technician reviews the incoming prescription for accuracy:"))
    story.append(numbered(1, "Verify patient identity (name, DOB, address, insurance)"))
    story.append(numbered(2, "Confirm prescriber information (NPI, DEA for controlled substances)"))
    story.append(numbered(3, "Verify drug, strength, quantity, and directions"))
    story.append(numbered(4, "Check for Drug Utilization Review (DUR) alerts: interactions, allergies, duplicates"))
    story.append(numbered(5, "Verify insurance eligibility"))
    story.append(body("Once confirmed, the tech advances the fill to <b>Adjudicating</b>."))

    story.append(subsection("Adjudicating"))
    story.append(body("DRX submits an insurance claim to the patient's PBM (Pharmacy Benefit Manager) in real-time using the NCPDP D.0 standard:"))
    story.append(bullet("Claim includes: BIN, PCN, Group Number, Member ID, NDC, quantity dispensed, days supply, date of service, ingredient cost, dispensing fee, prescriber NPI, pharmacy NPI"))
    story.append(bullet("The PBM responds within seconds with one of three results:"))
    story.append(Paragraph("\u2022  <b><font color='#16a34a'>PAID</font></b>: Claim accepted. DRX records the amount allowed, amount paid, and patient copay. Fill advances to Print.", styles["BulletItem"]))
    story.append(Paragraph("\u2022  <b><font color='#dc2626'>REJECTED</font></b>: Claim denied with NCPDP rejection codes. Fill moves to the Rejected queue for resolution.", styles["BulletItem"]))
    story.append(bullet("<b>PENDED</b>: Insurer needs additional time to process. Fill stays in Adjudicating until a response arrives."))
    story.append(body("If there's a pricing issue, the fill may be routed to a custom queue (Price Check, Prepay, etc.) instead of advancing."))

    story.append(subsection("Print"))
    story.append(body("The prescription label is generated and printed:"))
    story.append(numbered(1, "DRX selects the appropriate label template (typically the primary Rx Label template)"))
    story.append(numbered(2, "Template variables are populated with patient, drug, prescriber, and fill data"))
    story.append(numbered(3, "Label is sent to the pharmacy's label printer (e.g., Zebra thermal printer)"))
    story.append(numbered(4, "Tech confirms the label printed correctly"))
    story.append(numbered(5, "Fill advances to <b>Scan</b>"))
    story.append(body("DRX label templates use a coordinate-based element system. The standard Rx label template contains ~94 elements including text fields, barcodes (Code128), QR codes, and conditional sections."))

    story.append(subsection("Scan"))
    story.append(body("This is a <b>critical patient safety step</b>. The technician picks the drug from the shelf and scans its barcode:"))
    story.append(numbered(1, "Tech locates the correct drug bottle/package"))
    story.append(numbered(2, "Scans the manufacturer's barcode with a handheld scanner"))
    story.append(numbered(3, "DRX extracts the NDC (National Drug Code) from the scanned barcode"))
    story.append(numbered(4, "Compares the scanned NDC against the expected NDC on the prescription"))
    story.append(Paragraph("\u2022  <b><font color='#16a34a'>MATCH</font></b>: Correct drug confirmed. Fill advances to Verify.", styles["BulletItem"]))
    story.append(Paragraph("\u2022  <b><font color='#dc2626'>MISMATCH</font></b>: Wrong drug detected. The system blocks advancement. The tech must get the correct product.", styles["AlertText"]))
    story.append(body("This step prevents dispensing errors by ensuring the physical product matches the prescription."))

    story.append(PageBreak())

    story.append(subsection("Verify"))
    story.append(body("The pharmacist performs final clinical verification before the prescription can be dispensed. This step <b>requires a licensed pharmacist</b> and cannot be performed by a technician."))
    story.append(body("The pharmacist reviews:"))
    story.append(bullet("Drug name, strength, and dosage form are correct"))
    story.append(bullet("Quantity dispensed and days supply are appropriate"))
    story.append(bullet("SIG (directions) match the prescriber's intent"))
    story.append(bullet("No unresolved drug interactions or allergy conflicts"))
    story.append(bullet("The physical product was verified during the scan step"))
    story.append(bullet("For <b>controlled substances</b> (DEA Schedule II-V): PDMP (Prescription Drug Monitoring Program) check has been completed"))
    story.append(body("The pharmacist signs off with their credentials. DRX records <b>who verified</b> and <b>when</b> for the audit trail. The fill advances to <b>Waiting Bin</b>."))

    story.append(subsection("Waiting Bin"))
    story.append(body("The verified prescription is placed in a physical will-call bin for patient pickup:"))
    story.append(bullet("DRX tracks the <b>bin location</b> (e.g., 'B-15') in the will_call_location field"))
    story.append(bullet("Patient is notified their prescription is ready (phone, SMS, or automated call)"))
    story.append(bullet("Prescriptions are aged and tracked:"))
    story.append(bullet("<font color='#16a34a'><b>0-7 days</b></font>: Normal — awaiting pickup"))
    story.append(bullet("<font color='#ca8a04'><b>7-14 days</b></font>: Overdue — follow up with patient"))
    story.append(bullet("<font color='#dc2626'><b>14+ days</b></font>: Return to stock candidate"))
    story.append(body("If unclaimed after the pharmacy's return-to-stock period, the prescription may be reversed and inventory restocked."))

    story.append(subsection("Sold (Dispensed)"))
    story.append(body("The final step. The patient arrives to pick up their prescription:"))
    story.append(numbered(1, "Tech verifies patient identity"))
    story.append(numbered(2, "Offers pharmacist counseling (required by law for new medications)"))
    story.append(numbered(3, "Collects copay payment (cash, credit, debit)"))
    story.append(numbered(4, "Patient signs for receipt (and for controlled substances)"))
    story.append(numbered(5, "DRX marks the fill as <b>Sold</b> with a dispensedAt timestamp"))
    story.append(body("Sold is a <b>terminal state</b> — the prescription is complete. DRX records first_sold_on and last_sold_on timestamps for audit purposes."))

    story.append(PageBreak())

    # ═══ 4: QUEUE SYSTEM ═══
    story.append(section("4. DRX Queue System"))
    story.append(body("DRX organizes all prescription processing into status-based queues. Each fill has exactly one status at any time, and that status determines which queue it appears in."))
    story.append(hr())

    story.append(subsection("Standard Queues"))
    story.append(make_table(
        ["Status", "Queue Name", "Worked By", "Purpose"],
        [
            ["Pre-Check", "Intake", "Technician", "Review incoming Rx, validate patient/prescriber/drug data"],
            ["Adjudicating", "Sync / Billing", "System + Tech", "Insurance claim submission and response processing"],
            ["Rejected", "Rejected Claims", "Tech / Billing", "Claim rejected by insurance, needs correction and rebill"],
            ["Print", "Print Queue", "Technician", "Generate and print the prescription label"],
            ["Scan", "Scan / Verification", "Technician", "Scan drug barcode to verify NDC match"],
            ["Verify", "Pharmacist Review", "Pharmacist", "Final clinical review and RPh sign-off"],
            ["OOS", "Out of Stock", "Technician", "Drug not available, needs ordering from supplier"],
            ["Hold", "On Hold", "Tech / RPh", "Prescription held for any reason (clinical, insurance, patient request)"],
            ["Waiting Bin", "Will Call", "Technician", "Filled and verified, waiting for patient pickup"],
            ["Sold", "Dispensed", "System", "Picked up by patient (terminal state)"],
        ],
        col_widths=[0.9*inch, 1.1*inch, 0.9*inch, 3.3*inch],
    ))

    story.append(subsection("Exception Handling"))
    story.append(body("When a prescription can't follow the happy path, DRX routes it to an exception queue:"))
    story.append(bullet("<b>Hold</b>: Used for any situation requiring a pause — waiting for prescriber callback, patient question, clinical concern, insurance issue. The tech or pharmacist adds notes explaining why. The fill can be returned to any active queue once the issue is resolved."))
    story.append(bullet("<b>OOS (Out of Stock)</b>: The drug isn't available in the pharmacy's inventory. The fill stays here until the item is received from the supplier. Once restocked, it returns to the workflow."))
    story.append(bullet("<b>Rejected</b>: Insurance claim was denied. The billing team reviews the NCPDP rejection codes, corrects the issue (wrong member ID, needs prior auth, etc.), and resubmits the claim."))

    story.append(subsection("Queue Counts"))
    story.append(body("DRX provides real-time queue counts that display on the pharmacy dashboard. Each count represents the number of fills currently in that status. Techs and pharmacists use these counts to prioritize their work — processing the highest-count queues first during busy periods."))

    story.append(PageBreak())

    # ═══ 5: CUSTOM QUEUES ═══
    story.append(section("5. Custom Queues and Fill Tags"))
    story.append(body("Beyond the standard status-based queues, DRX supports custom workflow queues using a <b>fill tag</b> system. Tags are attached to fills as additional routing markers."))
    story.append(hr())

    story.append(subsection("How Fill Tags Work"))
    story.append(numbered(1, "Tags are defined in DRX admin settings (e.g., 'price check', 'prepay')"))
    story.append(numbered(2, "When a fill needs special handling, a tag is attached to it"))
    story.append(numbered(3, "Tagged fills appear in their respective custom queue on the dashboard"))
    story.append(numbered(4, "The tech resolves the issue, then the tag may be removed and the fill returns to the standard workflow"))
    story.append(body("A fill can have multiple tags simultaneously. Tags are independent of the fill's primary status."))

    story.append(subsection("Boudreaux's Custom Queues"))
    story.append(make_table(
        ["Queue / Tag", "Purpose", "When It's Used", "Resolution"],
        [
            ["Price Check", "Pricing needs manual review", "Unusual pricing, discount questions, contract pricing", "Verify correct pricing, adjust if needed, return to Adjudicating"],
            ["Prepay", "Patient must pay before processing", "Cash-pay patients, high-cost compounds, no insurance on file", "Contact patient, collect payment upfront"],
            ["OK to Charge", "Approved to bill patient directly", "After prepay collected, or charge account approved", "Apply charge, advance to Print"],
            ["Decline", "Patient declined to pay", "Patient refused copay or cash price", "Cancel prescription or place on Hold"],
            ["OK to Charge Clinic", "Bill the ordering clinic/facility", "Clinic-ordered compounds, institutional billing", "Process charge to clinic account, advance"],
            ["Mochi", "Custom internal workflow", "Pharmacy-specific routing rules", "Process per internal procedures"],
        ],
        col_widths=[1.2*inch, 1.3*inch, 1.8*inch, 2*inch],
    ))

    story.append(PageBreak())

    # ═══ 6: PATIENTS ═══
    story.append(section("6. Patient Records"))
    story.append(body("DRX maintains comprehensive patient records that are referenced throughout the prescription lifecycle."))
    story.append(hr())

    story.append(subsection("Patient Demographics"))
    story.append(bullet("<b>Name</b>: first_name, middle_initial, last_name"))
    story.append(bullet("<b>Identity</b>: date_of_birth, gender, race, primary_language"))
    story.append(bullet("<b>Contact</b>: email, delivery_method (pickup/delivery/mail)"))
    story.append(bullet("<b>Status</b>: active/inactive, deceased flag"))
    story.append(bullet("<b>Facility</b>: facility_id and custom_status_id for institutional (nursing home/LTC) patients"))
    story.append(bullet("<b>Primary Care</b>: primary_care_doctor_id links to prescriber record"))

    story.append(subsection("Phone Numbers"))
    story.append(body("Each patient can have multiple phone numbers, each with:"))
    story.append(bullet("Phone number, phone type (home, cell, work, fax)"))
    story.append(bullet("use_for_notification flag (for automated calls/SMS)"))

    story.append(subsection("Addresses"))
    story.append(body("Multiple addresses supported:"))
    story.append(bullet("street, line_two, city, state, zip_code"))
    story.append(bullet("type_ field (home, work, shipping, billing)"))

    story.append(subsection("Allergies"))
    story.append(body("Patient allergies are tracked using DAM (Drug Allergy Module) codes:"))
    story.append(bullet("<b>dam_concept_id</b>: Standardized allergy code"))
    story.append(bullet("<b>concept_description</b>: Human-readable allergy name"))
    story.append(bullet("Allergies are checked during DUR at Pre-Check and Verify steps"))

    story.append(subsection("Insurance (Third Parties)"))
    story.append(body("Each patient can have multiple insurance plans on file:"))
    story.append(bullet("<b>Identifiers</b>: bin_number, pcn, group_number, cardholder_id"))
    story.append(bullet("<b>Relationship</b>: relationship_code (self, spouse, child, etc.)"))
    story.append(bullet("<b>Plan name</b>: name field for display purposes"))
    story.append(bullet("Plans are prioritized (primary, secondary, tertiary) for claim submission order"))

    story.append(PageBreak())

    # ═══ 7: DRUG CATALOG ═══
    story.append(section("7. Drug Catalog and Inventory"))
    story.append(hr())

    story.append(subsection("Item (Drug) Records"))
    story.append(body("Every drug in DRX is an 'item' identified by its NDC (National Drug Code)."))
    story.append(make_table(
        ["Category", "Fields", "Purpose"],
        [
            ["Identity", "ndc, name, print_name, generic_name, brand_name, manufacturer, gcn", "Drug identification and label printing"],
            ["Dosage", "strength, dosage_form, dosage_form_description, route_of_administration, unit_of_measure", "Clinical information for prescribing and dispensing"],
            ["Pricing", "awp, unit_cost, rdc_net_cost, retail_cost, nadac_per_unit", "Billing calculations and claim submission"],
            ["Inventory", "stock_size, min_inventory (reorder point), max_inventory (reorder quantity)", "Automated reorder alerts"],
            ["Classification", "dea_schedule (0-5), compounding_chemical, otc_indicator, refrigerated, generic", "Regulatory compliance and storage requirements"],
            ["Status", "active (boolean)", "Whether the item is currently stocked"],
        ],
        col_widths=[1*inch, 2.8*inch, 2.5*inch],
    ))

    story.append(subsection("DEA Schedule Classification"))
    story.append(make_table(
        ["Schedule", "Control Level", "Examples", "Requirements"],
        [
            ["0", "Non-controlled", "Amoxicillin, Lisinopril", "Standard dispensing"],
            ["II", "High potential for abuse", "Oxycodone, Adderall, Fentanyl", "No refills, PDMP check, DEA 222 for ordering"],
            ["III", "Moderate potential", "Tylenol w/ Codeine, Testosterone", "Up to 5 refills in 6 months, PDMP check"],
            ["IV", "Lower potential", "Xanax, Ambien, Tramadol", "Up to 5 refills in 6 months, PDMP check"],
            ["V", "Lowest potential", "Robitussin AC, Lyrica", "State-dependent restrictions"],
        ],
        col_widths=[0.7*inch, 1.3*inch, 2*inch, 2.3*inch],
    ))

    story.append(subsection("Inventory Management"))
    story.append(body("DRX tracks inventory at the lot level:"))
    story.append(bullet("<b>Lot records</b>: item_id, lot_number, quantity_on_hand, quantity_received, unit_cost, expiration_date, date_received, status"))
    story.append(bullet("<b>Auto-decrement</b>: When a fill is dispensed, the lot quantity decreases"))
    story.append(bullet("<b>Reorder alerts</b>: When quantity_on_hand falls below min_inventory, the item appears in the reorder queue"))
    story.append(bullet("<b>Expiration tracking</b>: Lots approaching expiration are flagged for FIFO (first-in, first-out) dispensing"))

    story.append(PageBreak())

    # ═══ 8: PRESCRIBERS ═══
    story.append(section("8. Prescriber Management"))
    story.append(hr())
    story.append(body("DRX maintains a directory of all prescribers (doctors, nurse practitioners, physician assistants) who write prescriptions for the pharmacy's patients."))

    story.append(subsection("Prescriber Record Fields"))
    story.append(bullet("<b>Name</b>: first_name, last_name"))
    story.append(bullet("<b>Identifiers</b>: NPI (National Provider Identifier, required), DEA number, DEA suffix, SPI (State Provider ID), state_license"))
    story.append(bullet("<b>Contact</b>: phone_numbers[], fax_number, email, website"))
    story.append(bullet("<b>Practice</b>: practice_location, prescriber_type, addresses[]"))
    story.append(body("The NPI is the primary identifier used for insurance claims, eRx matching, and PDMP queries. The DEA number is required for controlled substance prescriptions."))

    # ═══ 9: CLAIMS ═══
    story.append(section("9. Insurance Claims and Adjudication"))
    story.append(hr())
    story.append(body("DRX handles real-time insurance claim processing using the NCPDP D.0 standard. Claims are submitted during the Adjudicating queue step."))

    story.append(subsection("Claim Structure"))
    story.append(body("Each claim contains:"))
    story.append(bullet("<b>Patient insurance info</b>: BIN, PCN, Group Number, Member ID, Person Code"))
    story.append(bullet("<b>Drug info</b>: NDC, quantity dispensed, days supply, date of service"))
    story.append(bullet("<b>Pricing</b>: ingredient cost, dispensing fee, usual and customary charge, copay amount"))
    story.append(bullet("<b>Prescriber</b>: NPI"))
    story.append(bullet("<b>Pharmacy</b>: NPI, NCPDP number"))
    story.append(bullet("<b>DAW code</b>: Dispense As Written code (0=substitution allowed, 1=brand required, etc.)"))

    story.append(subsection("Claim Transaction Types"))
    story.append(make_table(
        ["Type", "Code", "When Used"],
        [
            ["New Claim (Billing)", "B1", "Initial claim submission for a new fill"],
            ["Reversal", "B2", "Cancel a previously paid claim (e.g., patient returns medication)"],
            ["Rebill", "B3", "Resubmit after correcting a rejection (new insurance, override code, etc.)"],
            ["Eligibility", "E1", "Verify patient insurance eligibility before filling"],
            ["Prior Authorization", "PA", "Request prior authorization for non-formulary or restricted drugs"],
        ],
        col_widths=[1.8*inch, 0.6*inch, 3.8*inch],
    ))

    story.append(subsection("Common NCPDP Rejection Codes"))
    story.append(make_table(
        ["Code", "Meaning", "Typical Resolution"],
        [
            ["01", "Product/Service Not Covered", "Check formulary, try therapeutic alternative, or bill cash"],
            ["02", "Invalid/Expired Member ID", "Verify insurance card with patient, correct member ID"],
            ["03", "Invalid Cardholder", "Verify cardholder name and relationship code"],
            ["05", "Quantity Exceeds Maximum", "Reduce quantity or obtain quantity limit override"],
            ["06", "Compound Not Covered", "Bill individual ingredients or switch to commercial product"],
            ["07", "Invalid Days Supply", "Correct days supply to match plan limits"],
            ["08", "Duplicate Claim", "Claim already on file; reverse first if rebilling"],
            ["14", "Prior Authorization Required", "Initiate PA with prescriber, submit PA number when approved"],
            ["15", "Refill Too Soon", "Check days supply vs fill date; patient may need to wait"],
            ["25", "Patient Not Eligible", "Verify coverage dates, check for plan termination"],
        ],
        col_widths=[0.5*inch, 1.8*inch, 3.9*inch],
    ))

    story.append(PageBreak())

    # ═══ 10: LABELS ═══
    story.append(section("10. Label Templates and Printing"))
    story.append(hr())
    story.append(body("DRX uses a powerful template-based label system. Templates define the layout of every printed document the pharmacy produces."))

    story.append(subsection("Template Types"))
    story.append(make_table(
        ["Type", "Description", "Typical Use"],
        [
            ["Rx Label", "Primary prescription label", "Applied to every dispensed vial, bottle, tube, or container"],
            ["Package Label", "Shipping/mailing label", "Address label for mail-order and delivery prescriptions"],
            ["Batch Record", "Compounding documentation", "Full ingredient list, weights, QA checks, and signatures"],
            ["MAR", "Medication Administration Record", "For nursing homes and long-term care facilities"],
            ["Packing List", "Shipment contents list", "Enclosed in packages showing items, quantities, instructions"],
            ["Daily Summary", "End-of-day report", "Production totals, queue counts, revenue summary"],
            ["Register Receipt", "POS transaction receipt", "Patient payment confirmation with amounts and Rx details"],
            ["Sub Template", "Reusable label component", "Embedded within other templates for shared sections"],
        ],
        col_widths=[1.2*inch, 1.8*inch, 3.2*inch],
    ))

    story.append(subsection("How Templates Work"))
    story.append(body("Each template consists of a page definition and a list of positioned elements:"))
    story.append(bullet("<b>Page</b>: Width, height (in inches), margins, orientation"))
    story.append(bullet("<b>Elements</b>: Each element has x/y position, width, height, and a variable key (elementData) that maps to prescription data"))
    story.append(body("Example: The primary Rx Label template (#94) is defined as 4 inches x 8 inches (portrait) with a -90 degree rotation, rendering as 8 x 4 inches (landscape) on the Zebra label printer. It contains <b>94 elements</b> including:"))
    story.append(bullet("Patient name, address, phone"))
    story.append(bullet("Drug name, strength, NDC, quantity, directions (SIG)"))
    story.append(bullet("Prescriber name, DEA, NPI, address"))
    story.append(bullet("RX number, fill date, refills remaining, copay"))
    story.append(bullet("Code128 barcodes (fill ID, item ID, prescription ID)"))
    story.append(bullet("Auxiliary warning labels (e.g., 'FOR EXTERNAL USE ONLY', 'KEEP REFRIGERATED')"))
    story.append(bullet("Pharmacist initials, pharmacy toll-free number"))

    story.append(subsection("Template Variable System"))
    story.append(body("Variables use dot-notation keys that are resolved from fill data at print time:"))
    story.append(bullet("<b>patient.first_name</b>, <b>patient.last_name</b>, <b>patient.date_of_birth</b>"))
    story.append(bullet("<b>item.print_name</b>, <b>item.ndcFormatted</b>, <b>item.manufacturer</b>"))
    story.append(bullet("<b>prescription.sig_translated</b> (full directions)"))
    story.append(bullet("<b>prescription.doctor.first_name</b>, <b>prescription.doctor.npi</b>"))
    story.append(bullet("<b>fill_date</b>, <b>dispensed_quantity</b>, <b>copay</b>"))
    story.append(bullet("Pipe-separated composite keys: <b>patient.first_name|patient.last_name</b>"))
    story.append(body("Templates also support conditional rendering — elements can show/hide based on data values (e.g., the 'NO PAID CLAIM' watermark only appears when no insurance claim is on file)."))

    story.append(PageBreak())

    # ═══ 11: COMPOUNDING ═══
    story.append(section("11. Compounding in DRX"))
    story.append(hr())
    story.append(body("DRX supports compound prescriptions through batch tracking. When a prescription is for a compounded medication rather than a commercial product, the workflow includes additional compounding steps."))

    story.append(subsection("Compound Prescription Flow"))
    story.append(numbered(1, "Prescription is received for a compound (formula-based rather than NDC-based)"))
    story.append(numbered(2, "The compound formula defines the ingredients, quantities, and procedures"))
    story.append(numbered(3, "A batch is created linking the formula to the specific fill"))
    story.append(numbered(4, "Each ingredient is weighed from a specific inventory lot (FIFO)"))
    story.append(numbered(5, "Quality assurance checks are performed (appearance, pH, weight, etc.)"))
    story.append(numbered(6, "The compounder signs off and a pharmacist verifies the batch"))
    story.append(numbered(7, "The compound label is generated with patient info, formula name, BUD date, and lot numbers"))
    story.append(numbered(8, "The fill continues through Scan, Verify, and Waiting Bin like any other prescription"))

    story.append(subsection("Compound-Specific Data"))
    story.append(bullet("<b>Formula ID</b>: Links to the master compounding formula"))
    story.append(bullet("<b>Batch ID</b>: Unique identifier for the specific batch"))
    story.append(bullet("<b>Batch Expiration (BUD)</b>: Beyond-Use Date per USP guidelines"))
    story.append(bullet("<b>Ingredient lots</b>: Which specific lots were used for each ingredient"))
    story.append(bullet("<b>Manufacturer</b>: Displayed as 'COMPOUNDED IN-HOUSE' on labels"))
    story.append(body("When a fill is for a compound, DRX stores compound_batch.id, compound_batch.compound_formula_id, and compound_batch.expiration_date on the fill record. These flow through to the label template for printing."))

    # ═══ 12: REFILLS ═══
    story.append(section("12. Refills and Renewals"))
    story.append(hr())

    story.append(subsection("Refill Processing"))
    story.append(body("When a patient has refills remaining on an existing prescription:"))
    story.append(numbered(1, "Patient requests a refill (phone, online portal, in-person, or automated IVR)"))
    story.append(numbered(2, "DRX creates a new fill on the existing prescription with the next fill number"))
    story.append(numbered(3, "Refills remaining count decrements"))
    story.append(numbered(4, "The new fill enters the queue at Pre-Check and follows the standard workflow"))
    story.append(body("DRX tracks: total_qty_remaining, refills (authorized), and each individual fill with its fill number (refill field)."))

    story.append(subsection("Renewal Requests"))
    story.append(body("When refills are exhausted but the patient still needs the medication:"))
    story.append(numbered(1, "Pharmacy generates a renewal request to the prescriber via SureScripts (RXREN message)"))
    story.append(numbered(2, "Prescriber reviews and responds: approve (new Rx), deny, or modify"))
    story.append(numbered(3, "If approved, a new prescription is created in DRX with fresh refill count"))
    story.append(numbered(4, "If denied, the patient is notified and may need to see the prescriber"))

    story.append(subsection("Transfer Requests"))
    story.append(body("A prescription can be transferred to/from another pharmacy:"))
    story.append(bullet("<b>Transfer Out</b>: Patient requests Rx be sent to another pharmacy. DRX records the transfer and inactivates the Rx locally."))
    story.append(bullet("<b>Transfer In</b>: Another pharmacy sends an Rx to be filled here. The tech enters it manually with transfer details."))
    story.append(bullet("Controlled substance transfers have additional restrictions (one transfer only for C-III through C-V, no transfers for C-II)"))

    story.append(PageBreak())

    # ═══ 13: REPORTING ═══
    story.append(section("13. Reporting and Administration"))
    story.append(hr())
    story.append(body("DRX provides several reporting and administrative tools for pharmacy management."))

    story.append(subsection("Standard Reports"))
    story.append(bullet("<b>Daily Summary</b>: Prescription counts by status, revenue totals, queue activity"))
    story.append(bullet("<b>DEA Controlled Substance Log</b>: All Schedule II-V dispensing with perpetual inventory"))
    story.append(bullet("<b>Refill Report</b>: Pending refill requests, approved/denied history"))
    story.append(bullet("<b>Inventory Reports</b>: Low stock items, expiring lots, reorder needs"))
    story.append(bullet("<b>Claims Reports</b>: Rejection rates, outstanding receivables, payer mix"))

    story.append(subsection("Administration"))
    story.append(bullet("<b>User Management</b>: Staff accounts with role-based permissions (pharmacist, technician, admin)"))
    story.append(bullet("<b>Location Settings</b>: Pharmacy info (NPI, NCPDP, DEA), API configuration, printer setup"))
    story.append(bullet("<b>Template Management</b>: Label template editor for customizing print layouts"))
    story.append(bullet("<b>Insurance Plans</b>: Third-party plan directory (BIN, PCN numbers) for claim routing"))

    story.append(subsection("Audit Trail"))
    story.append(body("DRX maintains timestamps on all records (created_at, updated_at) and tracks key workflow events:"))
    story.append(bullet("Fill status changes with timestamps"))
    story.append(bullet("Pharmacist verification records (who verified, when)"))
    story.append(bullet("Claim submission and adjudication timestamps"))
    story.append(bullet("Dispensing records (first_sold_on, last_sold_on)"))

    # ─── Build ─────────────────────────────────────────────────────
    doc.build(story)
    print(f"PDF generated: {OUTPUT_PATH}")
    return OUTPUT_PATH


if __name__ == "__main__":
    build_pdf()
