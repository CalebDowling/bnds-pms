# BNDS PMS Complete Workflow Guide

> How every process works in our pharmacy management system — from prescription intake through dispensing, compounding, billing, and shipping.

---

## 1. PRESCRIPTION INTAKE — How Prescriptions Enter the System

### 1A. Electronic Prescriptions (eRx via SureScripts)

A doctor's office sends an e-prescription through SureScripts. It hits our webhook endpoint and the system automatically:

1. **Parses** the incoming NCPDP SCRIPT message (NEWRX, RXCHG, CANRX, RXREN)
2. **Matches** the data to our records:
   - **Patient**: By name + DOB (exact match first, then fuzzy)
   - **Prescriber**: By NPI, then DEA, then name
   - **Drug**: By NDC (exact), then name search, then formula matching
3. **Scores confidence**: Each match gets a score (Exact = 1.0, Probable = 0.8-0.95, Possible = 0.6-0.8)
4. **Routes the prescription**:
   - If ALL matches are exact (100% confidence) → auto-creates the prescription with status `intake` and assigns an RX number
   - If ANY match is uncertain → creates an **Intake Queue Item** with status `pending` for manual review

**What the tech sees**: The Intake queue on the dashboard shows a count. They click into it and see all pending e-prescriptions with the parsed patient, prescriber, and drug info. For uncertain matches, they pick from candidate matches (radio buttons), then click "Process" to create the prescription.

### 1B. Prescriber Portal Orders

Doctors and clinics can also submit orders directly through our prescriber portal:

1. Doctor logs into the prescriber portal at `/prescriber/portal`
2. Fills out the order form:
   - Patient type (human or animal)
   - Patient info (name, DOB, gender, phone)
   - Formula selection (searchable dropdown of our compounds)
   - Quantity, days supply, directions, refills (0-11)
   - Priority (normal, urgent, STAT)
   - Shipping method (to office, to patient, or pharmacy pickup)
3. Submits → creates an intake queue item that flows into the same processing pipeline

### 1C. Manual Entry (Walk-ins, Phone, Fax, Written Rx)

For paper prescriptions or phone orders:

1. Tech goes to **Prescriptions → New Prescription**
2. Fills out the form:
   - **Patient**: Search by name or MRN, select from results
   - **Prescriber**: Search by name or NPI
   - **Drug**: Toggle between regular item or compound formula, search and select
   - **Details**: Source (written/phone/fax), priority, quantity, days supply, SIG directions (with SIG code picker), DAW code, refills, dates
   - **Notes**: Prescriber notes and internal notes
3. Clicks "Create" → system generates an RX number, creates the prescription with status `intake`

### 1D. Refill Requests

Patients can request refills (via phone, portal, or IVR). These appear in the **Refills** queue:

1. Tech sees pending refill requests with patient name, RX number, drug, last fill date, refills remaining
2. **Approve**: Creates a new fill automatically (next fill number, same quantity/days supply), decrements refills remaining
3. **Reject**: Must provide a reason (no refills left, expired, prescriber denied, etc.)
4. Batch processing available for bulk approvals

---

## 2. THE QUEUE WORKFLOW — Processing a Prescription

Once a prescription is in the system, it moves through these queues. Each queue represents a step that a tech or pharmacist must complete.

### Queue Flow (Happy Path):

```
INTAKE → ADJUDICATING → PRINT → SCAN → VERIFY → WAITING BIN → SOLD
```

### Step-by-Step:

**INTAKE** (Tech)
- Review the prescription details, patient info, allergies
- Confirm everything looks correct
- Click "Advance to Adjudicating"

**ADJUDICATING / SYNC** (System + Tech)
- System builds an NCPDP D.0 claim with the patient's insurance info (BIN, PCN, group, member ID)
- Submits to the claims switch (Change Healthcare)
- If **PAID**: Claim records the copay amount, advances to Print
- If **REJECTED**: Goes to Reject queue with rejection codes (Tech resolves — see Billing section)
- If insurance issue: May route to Price Check, Prepay, or OK to Charge queues

**PRINT** (Tech)
- Tech sees the label PDF preview
- Clicks "Open Label PDF" to print the prescription label on the Zebra printer
- Confirms label printed, clicks "Advance to Scan"

**SCAN** (Tech)
- Tech picks the drug bottle from the shelf
- Scans the barcode on the bottle with the barcode scanner
- System compares the scanned NDC to the expected NDC on the prescription
- **GREEN = MATCH**: NDC confirmed, tech advances to Verify
- **RED = MISMATCH**: Wrong drug — tech must get the correct bottle
- Cannot advance until scan passes (patient safety)

**VERIFY** (Pharmacist Only)
- Pharmacist reviews the full prescription:
  - Drug, strength, dosage form correct?
  - Quantity and days supply appropriate?
  - SIG directions match the prescription?
  - No drug interactions or allergy conflicts?
  - NDC/lot was verified during scan?
  - For controlled substances: PDMP check completed?
- Clicks "Advance to Waiting Bin"
- System records verifiedBy (pharmacist ID) and verifiedAt (timestamp)

**WAITING BIN** (Tech)
- Prescription is placed in the physical bin (location tracked, e.g. "B-15")
- Patient is notified via SMS that their prescription is ready
- Bin items are color-coded by age:
  - **Green**: Less than 7 days
  - **Yellow**: 7-14 days
  - **Red**: Over 14 days (needs follow-up)

**SOLD / PICKUP** (Tech)
- Patient arrives, tech pulls from bin
- Pickup process:
  1. Verify patient ID (checkbox)
  2. Offer counseling (checkbox)
  3. Review allergies (checkbox)
  4. If someone else is picking up: Record their name, relationship, ID type/number
  5. Capture patient signature (digital signature pad)
  6. Collect copay via POS (cash, credit, debit, check)
- Click "Complete Pickup" → fill status becomes `sold`/`dispensed`

### Exception Queues:

| Queue | What Triggers It | How to Resolve |
|-------|-----------------|----------------|
| **HOLD** | Tech or pharmacist puts on hold for any reason | Add notes explaining why, resolve the issue, send back to appropriate queue |
| **OOS** (Out of Stock) | Drug not available in inventory | Order the drug, once received send back to queue |
| **REJECT** | Insurance claim rejected | Fix the issue (wrong member ID, prior auth needed, etc.), rebill |
| **PRICE CHECK** | Pricing issue needs review | Verify pricing, adjust if needed, send back to Adjudicating |
| **PREPAY** | Patient must pay before processing | Contact patient, collect payment, advance to OK to Charge |
| **OK TO CHARGE** | Approved to bill patient/clinic directly | Process charge, advance to Print |
| **DECLINE** | Patient declined to pay | Cancel or hold prescription |
| **OK TO CHARGE CLINIC** | Bill the ordering clinic instead of patient | Process clinic charge, advance |

### Processing Screen (for every queue step):

When a tech/pharmacist clicks "Process Fill" on any queue item, they see:

- **Left side**: Patient info (name, DOB, phone, insurance), Drug info (name, NDC, quantity, SIG), Allergy warnings (red banner if allergies exist)
- **Center**: Status-specific panel (Scan input, Verify checklist, Print button, etc.)
- **Right sidebar**: Prescriber info, fill details (dates, who filled/verified), full activity log with every status change

---

## 3. COMPOUNDING WORKFLOW — Making Custom Medications

### Step 1: Create or Select a Formula

Before you can compound, you need a formula (recipe). Go to **Compounding → Formulas → New Formula**:

- **Formula Name**: e.g. "Ketoprofen 10%/Cyclobenzaprine 2%/Lidocaine 5% Cream"
- **Formula Code**: e.g. "KCL-CREAM-1054" (unique identifier)
- **Category**: cream, capsule, suspension, solution, etc.
- **Dosage Form**: cream, ointment, gel, capsule, liquid, etc.
- **Route**: topical, oral, ophthalmic, etc.
- **Sterile**: Yes/No (sterile compounds have stricter requirements)
- **Default BUD (Beyond Use Date)**: Number of days (e.g. 180)
- **Storage Conditions**: Room temp, refrigerate, freeze

### Step 2: Add Formula Version with Ingredients and Steps

Each formula can have multiple versions (recipe improvements). A version includes:

**Ingredients** (Bill of Materials):
| Ingredient | Quantity | Unit | Active? |
|-----------|----------|------|---------|
| Ketoprofen powder | 10.0 | g | Yes |
| Cyclobenzaprine HCl | 2.0 | g | Yes |
| Lidocaine | 5.0 | g | Yes |
| Pentravan cream base | 81.0 | g | No |

**Compounding Steps** (Procedure):
1. Weigh all active ingredients (5 min, pharmacist required)
2. Levigate active powders with small amount of base (10 min)
3. Incorporate levigated mixture into remaining base (10 min)
4. Mix thoroughly until uniform consistency (15 min)
5. Perform QA checks (5 min, pharmacist required)
6. Package into appropriate container and label (5 min)

### Step 3: Create a Batch

When a prescription comes in for a compound, go to **Compounding → Batches → New Batch**:

- Select the formula (search by name or code)
- Enter quantity to prepare (e.g. 120 grams)
- Set the Beyond-Use Date
- Record environmental conditions (temperature, humidity)
- Click "Create Batch" → batch number auto-generated, status = "In Progress"

### Step 4: Weigh Ingredients

On the batch detail page, each ingredient has a weighing form:

1. Select the **lot** to pull from (system shows available lots sorted by expiration — FIFO)
2. Record the **actual quantity weighed** (what the scale reads)
3. System logs: which lot was used, actual vs expected quantity, who weighed it, when
4. Inventory is decremented from that lot automatically

### Step 5: QA Checks

For each required quality check:
- **Check type**: Appearance, pH, clarity, consistency, color, odor, weight variation, etc.
- **Expected value**: What it should be (e.g. "pH 5.5-6.5")
- **Actual value**: What was measured
- **Result**: Pass or Fail
- **Notes**: Any observations

### Step 6: Sign-Off and Verify

Two signatures required:
1. **Compounder sign-off**: The tech who made it confirms it's complete → status = "Completed"
2. **Pharmacist verification**: RPh reviews the batch record, QA results, and signs off → status = "Verified"
3. **Release**: Once both signatures are in, batch can be released for dispensing

### Step 7: Print Batch Record and Labels

- **Batch Record PDF**: Complete documentation of the batch (ingredients, weights, QA, signatures) for compliance files
- **Compound Label**: Generated for the specific prescription/fill with patient info, RX number, formula name, SIG, BUD date, lot numbers
- Labels are generated at `/api/labels/compound?fillId={id}` or via the DRX template system

---

## 4. BILLING WORKFLOW — How We Charge

### 4A. Insurance Claims (Most Prescriptions)

**Automatic flow for insured patients:**

1. When a fill moves to Adjudicating, the system auto-builds an NCPDP D.0 claim:
   - Patient's insurance: BIN, PCN, Group Number, Member ID
   - Drug: NDC, quantity, days supply, date of service
   - Pricing: Ingredient cost + dispensing fee = usual & customary charge
   - Prescriber: NPI
   - Pharmacy: NPI

2. Claim submits to the switch vendor (Change Healthcare)

3. **Response comes back**:
   - **PAID**: Records amount allowed, amount paid, patient copay. Fill advances to Print.
   - **REJECTED**: Records rejection codes and messages. Fill goes to Reject queue.
   - **PENDED**: Insurer needs time. Stays in Adjudicating.

4. **Rejection Resolution** (Billing team):
   - View rejection code and explanation (e.g. "15 = Refill Too Soon", "14 = Prior Auth Required")
   - Fix the issue:
     - Wrong member ID → correct and rebill
     - Prior auth needed → initiate PA request to prescriber
     - Quantity too high → adjust and rebill
     - Not covered → check secondary insurance or switch to cash price
   - Submit corrected claim (B3 rebill transaction)

5. **Multi-Insurance**: If primary rejects/partially pays, system can submit to secondary insurance with coordination of benefits

### 4B. Direct Billing to Clinics/Doctors (Charge Accounts)

For clinics that order compounds and want to be billed directly:

1. Each clinic/prescriber has a **Charge Account** with:
   - Account type (prescriber or facility)
   - Balance and credit limit
   - Transaction history

2. When a prescription is filled for a clinic patient:
   - Charge is applied to the clinic's account
   - Transaction logged with: amount, fill reference, date

3. **Billing team** manages charge accounts:
   - View outstanding balances
   - Record payments when received
   - Send statements/invoices
   - AR aging report shows overdue amounts (30/60/90+ days)

### 4C. Direct Fees

For services not tied to a specific prescription:
- Consultation fees
- Delivery charges
- Compound preparation fees
- Admin fees

Managed in **Billing → Direct Fees** with fee type, amount, and description.

### 4D. AR Aging Report

**Billing → AR Aging** shows:
- Total outstanding by age bucket (0-30, 31-60, 61-90, 90+ days)
- Breakdown by insurance company
- Breakdown by patient
- Breakdown by prescriber/clinic
- Status distribution (pending, submitted, pended, partial)

### 4E. POS (Point of Sale) for Copay Collection

When a patient picks up:
1. POS screen shows the copay amount
2. Tech selects payment method: cash, credit, debit, check
3. Processes payment
4. Receipt generated
5. Transaction logged to POS session

POS also tracks:
- Register sessions (open/close with drawer counts)
- Daily revenue totals
- Transaction history searchable by patient or payment method

---

## 5. SHIPPING WORKFLOW — Getting Prescriptions to Patients

### 5A. Creating a Shipment

After a prescription is verified and ready, if the patient selected delivery:

1. Go to **Shipping → New Shipment**
2. Fill out:
   - **Patient**: Select from list
   - **Carrier**: FedEx, UPS, USPS, courier
   - **Service Level**: Standard, priority, overnight, same-day
   - **Weight**: Package weight in ounces
   - **Cold Chain Required**: Yes/No (for refrigerated compounds)
   - **Signature Required**: Yes/No (for controlled substances)
   - **Shipping Address**: Patient's address on file or custom
3. Click "Create Shipment" → status = "Pending"

### 5B. Packing and Shipping

1. **Packing List**: System generates a packing list showing all items in the shipment (fill IDs, quantities, drug names)
2. **Shipping Label**: Generated through carrier API integration with our pharmacy return address, patient delivery address, and tracking barcode
3. **Mark as Shipped**: Enter tracking number, confirm ship date → status = "Shipped"
4. Patient receives SMS/email with tracking info

### 5C. Delivery Confirmation

- Track shipment status via carrier API
- When delivered → status = "Delivered", actualDelivery timestamp recorded
- If signature required, carrier confirms signature captured

### 5D. Label Types Available

| Label Type | Used For | Generated At |
|-----------|----------|-------------|
| **Rx Label** | Prescription vial/container | `/api/labels/print/{fillId}` |
| **Compound Label** | Compound medication | `/api/labels/compound?fillId={id}` |
| **Batch Record** | Compounding documentation | `/api/labels/batch?batchId={id}` |
| **Shipping Label** | Outbound packages | Carrier API integration |
| **Packing Slip** | Inside the package | Generated with shipment |

All labels use the DRX template system with our custom editor. Template #94 is the primary Rx label (4"x8" portrait, renders as 8"x4" landscape on the Zebra ZD421).

---

## 6. DAILY OPERATIONS SUMMARY

### Morning Opening:
1. Check dashboard for overnight eRx arrivals (Intake count)
2. Open POS register session
3. Review any holds or rejected claims from previous day
4. Check low stock alerts and expiring lots

### Throughout the Day:
1. **Intake Tech**: Processes incoming eRx and manual prescriptions
2. **Fill Tech**: Prints labels, fills prescriptions, scans barcodes
3. **Pharmacist**: Verifies fills, reviews DUR alerts, counsels patients
4. **Compounding Tech**: Weighs ingredients, performs QA checks
5. **Billing**: Resolves rejected claims, processes charge account payments
6. **Shipping**: Packs orders, generates shipping labels, confirms deliveries
7. **Pickup**: Processes patient pickups with ID verification and signature

### End of Day:
1. Close POS register session (balance drawer)
2. Review waiting bin for overdue items (>14 days)
3. Check that all compounding batches have been verified
4. Review shipping — all orders shipped?
5. Check queue counts — anything stuck?

---

## 7. ROLES AND RESPONSIBILITIES

| Role | What They Do | Key Screens |
|------|-------------|-------------|
| **Pharmacy Technician** | Process intake, fill prescriptions, print/scan, compound, ship | Queue, Intake, Compounding, Shipping |
| **Pharmacist (RPh)** | Verify fills, DUR review, counsel patients, sign off batches | Queue (Verify), Compounding (Sign-off), Pickup |
| **Billing Specialist** | Submit claims, resolve rejections, manage charge accounts | Billing, Claims, AR Aging, Direct Fees |
| **Shipping Clerk** | Pack orders, print shipping labels, track deliveries | Shipping, Packing Lists |
| **Admin/Manager** | System settings, user management, reporting, audit logs | Settings, Users, Analytics, Compliance |
