# Workflow Guide Review — Triage

**Source:** `BNDS_PMS_Complete_Workflow_Guide (1).pdf` — annotated by **Alexis Nguyen** (DRX user / pharmacist), reviewed by Caleb Dowling, 2026-04-23.

29 highlight/comment pairs (58 annotations total). Raw extract preserved at `docs/Workflow_Guide_Annotations.txt`.

This doc triages every item into one of four buckets:

- **DONE** — change applied in this commit
- **SCHEMA** — needs a Prisma migration before code change (queued for follow-up)
- **DESIGN** — bigger feature; needs Alexis/Caleb signoff on UX before build
- **CLARIFY** — ambiguous; pinging Alexis for follow-up before action

---

## Section 1 — Intake & Fill Process

### 1.1 Order of intake processing
> Alexis: "Doesn't matter much: Everything in intake is typed on time it comes in unless there is a Waiter in the lobby."
> Caleb: "I agree."

**Status:** No change. Current behavior already FIFO with priority override (Normal/Urgent/STAT).

### 1.2 Pre-check before Print
> Alexis: "Before print it is moved into Precheck. Then once prechecked must be in Print to be able to be charged."
> Caleb: "Is this a process just because of DRX? Like, is this something that you guys do that can be change this way in the new PMS?"

**Status:** **CLARIFY** — need Alexis to confirm whether Precheck is a DRX-only artifact or a real workflow stage. If real, we'd add `precheck` between `adjudicating` and `print` in `src/lib/workflow/fill-status.ts` (currently there's no precheck stage).

### 1.3 Generate Rx from patient profile
> Alexis: "In DRX there is an option to generate a prescription under pt profile. I use this majority of the time unless pt is new. It generates a prescription based on the entries. In which it eliminates the scanning in by clerk and typing by tech. It moves straight into Precheck."

**Status:** **DESIGN** — major time-saver. Proposed feature: **"Quick Rx" button** on the patient profile page that opens a pre-filled new-Rx form using:
- Last prescriber used
- Last medication used (or any from history with one click)
- Same SIG/quantity/days-supply as the most recent fill

This skips re-typing patient demographics and lets a familiar Rx get to print in 2 clicks instead of a full intake form. Will spec this separately.

### 1.4 Tagging Rx with charge-to / ship-to / pickup-vs-delivery
> Alexis: "The technician must type and analyze the prescription to ensure that it includes all the correct things. They must also be able to tag the prescriptions based on where it is being charged and shipped to. May also be picked up or delivered. The delivery must be noted in the profile and shown on the prescription label."

**Status:** **DESIGN** — Intake form needs explicit tags for:
1. **Pickup vs. Delivery vs. Ship** (currently inferred, not enforced)
2. **Charge-to** (patient / clinic / direct-pay / insurance)
3. **Delivery method must propagate to the printed label** — verify label template includes a "DELIVERY" stripe at the top when method ≠ pickup.

### 1.5 Clerk scan-in step
> Alexis: "It is scanned in by clerk."

**Status:** Informational. No change.

### 1.6 IVR / Patient Portal
> Alexis: "Via phone system I think. I'm not sure what IVR in DRX comes from."
> Caleb: "The Patient Portal will be a new feature that we would have to give the patients to get refills online."

**Status:** Roadmap. IVR is Twilio-based in current PMS; Patient Portal is a separate buildout (Phase 3+).

---

## Section 1.5 — Scan & Verify

### 2.1 Scan queue requires NDC scan
> Alexis: "Once label is printed it is moved to scan queue. In scan the tech must scan the NDC/Batch number to be able to move it to verify for the pharmacist."

**Status:** **DESIGN** — the scan-queue UI in `src/app/(dashboard)/queue/page.tsx` and the underlying `advanceFillStatus()` in `src/lib/workflow/fill-status.ts` currently allow manual advance from `scan` → `verify` without an actual barcode scan event. Need to:
1. Add a `barcodeScannedAt` and `barcodeMatched` columns to `prescription_fills`.
2. Block `advanceFillStatus(scan → verify)` unless `barcodeMatched === true`.
3. Surface a dedicated Scan Station UI that listens for keyboard-wedge input.

### 2.2 Equivalent-NDC auto-swap with re-adjudication
> Alexis: "This must be done in the system to verify it is correct before reaching pharmacist. If there is an equivalent NDC that it can be changed to it may prompt it to readjudicate the claim and switched manually by system."

**Status:** **DESIGN** — high value. Proposed flow:
- When the technician scans a stock NDC that doesn't match the labeled NDC, the system queries the FDB/Medi-Span equivalent table.
- If an equivalent (same generic, same strength, different manufacturer) is found, prompt: "Switch to NDC X and re-bill?"
- On confirm, update the fill's NDC, regenerate the label, and re-submit the claim.

### 2.3 Backtag on hard-copy Rx
> Alexis: "is for the backtag on hard copy prescriptions that are brought in for our records."
> Caleb: "I do not follow.."

**Status:** **CLARIFY** — need Alexis to define "backtag." Likely a label that gets affixed to the paper Rx for filing. If so, we'd add a "Print Backtag" button that prints a small thermal label with Rx number, date, patient, and a barcode for quick re-lookup.

---

## Section 1.6 — Pickup / POS / Copay

### 3.1 Compounds are prepaid; copay flow doesn't fit
> Alexis: "Majority of our prescriptions are compounds so it is already paid for before being made. Rx must have been flipped back to print by clerk or billing for the cycle to start. Something to note. Copays are normally for retail prescriptions. Hopefully we can create a better system for this??"
> Caleb: "To me there is definitely a better way that we can do this. I can take out the Copay process. Do you have any ideas on what we can do to build this better for that process?"

**Status:** **DESIGN** — split the flow into two tracks:
- **Compound track:** Rx enters in `prepay` status. When patient pays (Stripe / Square / cash), it advances to `print`. No copay collection at pickup.
- **Retail track:** Existing flow (intake → adjudicate → print → ... → POS copay at pickup).

The status machine already has `prepay` → `ok_to_charge` → `print`. We need:
1. A clear "Compound vs. Retail" toggle on Rx intake (or auto-detected from the medication).
2. A `payment_intent_id` field on `prescription_fills` linking to the Stripe charge.
3. A simplified pickup screen that just confirms identity for compounds (no card swipe).

### 3.2 Pharmacist-Rejected queue (separate from Print)
> Alexis: "I wonder if there's a queue that can be made for rejected rx by rph.. It can get lost in print with our high volume!"
> Caleb: "This is why I got you to look at this!!! that is a great idea. I will make a note and get it on the roadmap. Could you give me a very brief explanation on how you think we can make that Queue be the most efficient?"

**Status:** **DONE** (status added) — Added new fill status `rph_rejected` plus queue key in:
- `src/lib/workflow/fill-status.ts` — new status with reject-red color, isException=true
- `src/app/(dashboard)/queue/constants.ts` — new label "Rejected by RPh"
- `src/components/dashboard/QueueBar.tsx` — new pill
- `src/components/dashboard/QueueOverview.tsx` — under "Attention Needed"

State-machine transition: `verify → rph_rejected` (the pharmacist's reject button now sets this status instead of bouncing back to `scan`/`print`). From `rph_rejected` the tech can route to: `print` (re-fill), `scan` (re-scan only), `hold`, or `cancelled`.

**Awaiting Alexis on:** what info should the row show by default (rejection reason, who rejected, stale-time)?

### 3.3 Bin-location alphabetical buckets
> Alexis: "Would be ideal if the pharmacy can do this. Currently is just by last name in yellow bins.. (A-H and so on)"
> Caleb: "Yeah, this is one of those features that I have in place but it will not be fully used until we figure out a situation like that inside the physical location. It will not be a required field within the verified prescription, so it should not cause any issues."

**Status:** Acknowledged. The `binLocation` field on `prescription_fills` is already optional. When the pharmacy moves to bin-location-based storage we'll add an auto-assignment rule (last name [A-H] → bin block A, etc.).

---

## Section 2 — Compounding

### 4.1 Lab manager creates most formulas
> Alexis: "Lab manager: Amanda is able to as well. Actually she creates majority of formulas."
> Caleb: "Got it, making a note of that. Should just be a permission change."

**Status:** **DESIGN** — confirm that the `formulas:write` permission can be granted to the "Lab Manager" role independently of the Pharmacist role. Then assign Amanda the Lab Manager role.

### 4.2 Photo capture for syringes/filters
> Alexis: "The syringes of liquids must be pictured. Also the filters must be pictured."
> Caleb: "Got it, adding to my notes."

**Status:** **SCHEMA** — needs schema additions:
- `BatchIngredient.photoUrl` (Supabase Storage reference)
- A new mobile-friendly photo capture screen for the compounding workstation

### 4.3 Print formula for RPh review
> Alexis: "Must be able to print for rph to review."

**Status:** **DESIGN** — add a "Print Formula" button on the formula detail page that generates a PDF MFR (Master Formula Record) for paper review.

### 4.4 Free-text notes + structured lots (vials, cappers, stoppers, PSI)
> Alexis: "There must be a notes section to record the lots of the vials, cappers, stoppers. Also to note PSI and such things (can show you in DRX)"
> Caleb: "Yes, I would like to see and also even add a screenshot of this to my notes too."

**Status:** **SCHEMA** — needs:
- `Batch.vialLot`, `Batch.capperLot`, `Batch.stopperLot` (string)
- `Batch.psi` (decimal)
- (existing `Batch.notes` already covers free-text)

### 4.5 Exclude ingredient from BUD calc
> Alexis: "Add a section on each ingredient to be able to exclude BUD from final compound. Some formulas are used within formulas for PH checks etc (but doesn't count for BUD)"
> Caleb: "Roger that."

**Status:** **SCHEMA** — needs `BatchIngredient.excludeFromBud` boolean. The BUD calculation in the QA step would then skip these ingredients when computing the earliest-expiring lot.

### 4.6 Batch label fields: drop Storage and Lot, add NDC
> Alexis: "Storage and Lot do not need to be on label for batch containers."
> Caleb: "Is the green area false then?"
> Alexis (later): "Also NDC of drug"

**Status:** **DONE** — updated docs/generate-workflow-guide.js section 7.5 to drop "storage conditions" and "lot info" from the batch label spec, and added "NDC of drug" to the field list. Actual label template change tracked under SCHEMA below.

### 4.7 BUD already assigned at QA
> Alexis: "BUD is already assigned."

**Status:** Doc copy fix — section 2.3 step 3 ("The pharmacist assigns or confirms the Beyond-Use Date") will be reworded to "confirms (or adjusts) the auto-assigned BUD". **DONE** in workflow-guide regen script.

---

## Section 4 — Reports & Analytics

### 5.1 Pharmacist + Shipper KPIs
> Alexis: "KPIs for pharmacist & Shippers?"
> Caleb: "Yes, this will be a feature and be able to be filtered, pulled, and extracted whenever and whoever needed."

**Status:** **DESIGN** — extend the Reports page with:
- **Pharmacist KPI panel:** verifications/day, average verify-time, reject rate, top 5 reject reasons.
- **Shipper KPI panel:** shipments/day, packed→shipped lag, on-time delivery rate, returns rate.

### 5.2 Typed-Rx count in tech productivity
> Alexis: "Should also include how many rx were typed."

**Status:** **DESIGN** — Technician Productivity report currently counts "fills." Extend to count `intake → adjudicating` transitions per user (= "Rx typed").

---

## Section 5 — Insurance & POS

### 6.1 Stored card on patient profile (compound prepay)
> Alexis: "Add option on pt profile to store card so it can be charged for compounds since a lot of pts are prepaying for their medications before hand."

**Status:** **DESIGN** — proposed via Stripe Customer + PaymentMethod (PCI-compliant). Add `stripeCustomerId` to `Patient`. Store payment methods via Stripe SetupIntents (we never touch card numbers). Allow pharmacy staff to charge a saved method for compound prepayment from the patient profile.

> ⚠️ Caleb to confirm Stripe vs. Square. PMS already integrates Stripe per `src/lib/billing/`.

### 6.2 Primary + Secondary insurance
> Alexis: "Add option for multiple plans. Primary and Secondary"

**Status:** **PARTIAL — DB ready, UI missing.** The `PatientInsurance` model already has a `priority` field (`prisma/schema.prisma:332`) so the schema supports any number of plans per patient. The patient profile UI needs:
- "Add Insurance" button can create primary OR secondary
- A second insurance card displayed below the primary
- Claim adjudication needs to submit to primary first, then auto-cascade balance to secondary

### 6.3 Everyone uses POS
> Alexis: "everyone should be able to use POS"

**Status:** **DESIGN** — broaden the `pos:use` permission default from Cashier/Tech to all pharmacy roles (RPh, Lab Manager, Shipper). Will verify the RBAC config.

---

## Section 6 — Queue Stages

### 7.1 Add Lumi Meds (or generic Telehealth) queue
> Alexis: "Add Lumi Meds"
> Caleb: "Got it, what if we did some type of centralized queue for our integrated Telehealths? Maybe called 'Telehealths'? Does it matter what the company is?"

**Status:** **DONE** — added a new `telehealth` queue stage (handled by Tech). Lumi, Mochi, etc. now route to a single queue with a `source` tag so we don't accumulate one queue per integration partner.

### 7.2 OK to Charge owned by Billing
> Alexis: "Billing"

**Status:** **DONE** — already correct in the doc + UI. No code change needed.

### 7.3 Decline queue description fix
> Alexis: "Wrong Description: This is where rx are tagged when payments are declined."

**Status:** **DONE** —
- `src/components/dashboard/QueueBar.tsx`: tooltip updated to "View Payment Declines"
- `src/app/(dashboard)/queue/constants.ts`: `QUEUE_DESCRIPTIONS` map added with the corrected copy
- Workflow guide regen script updated

### 7.4 Mochi queue is actually Compound QA/QC
> Alexis: "This is normally where a rph can go to do the QA/QC of compounds that are finalized by the compounding technicians"
> Caleb: "Okay, I will clarify if that queue is what we are normally doing and not a follow up type of queue."

**Status:** **DONE** — added a new `compound_qa` queue (RPh-handled, post-batch-completion gate before release). The legacy `mochi` status is preserved (some existing fills may still be tagged with it) but no longer surfaced as a top-level queue. The `mochi` slot in the QueueBar is replaced with `compound_qa`.

---

## Section 7 — Compounding (Detailed)

### 8.1 Batch numbering format is too noisy
> Alexis: "Think is is redundant since the BUD is on the rx. Date it was created is in compounding record. Maybe find a different system for batch numbers?? There is a lot of things made in one day."
> Caleb: "The Batching and Compounding Sections in the PMS definitely need to be looked at. I am very unfamiliar with those processes. Do you have any ideas?"

**Status:** **CLARIFY** — pinging Alexis for a preferred format. Options to discuss:
- `<formula-code>-<seq>` (e.g., `T200-0042`) — short, formula-specific
- `<YYMM>-<seq>` (e.g., `2604-0042`) — month-based, low-collision
- `<formula-code>-<YY>-<seq>` (e.g., `T200-26-0042`) — formula + year + seq

---

## Section 8 — Shipping

### 9.1 Carrier options "don't use"
> Alexis: "don't use"
> Caleb: "We do not use the Carrier options?"

**Status:** **CLARIFY** — need Alexis to confirm: does BNDS not use USPS/UPS/FedEx integrations at all (just hand-deliver locally)? Or is one carrier specifically unused? If the answer is "we only use FedEx," we'd remove USPS and UPS from the carrier picker.

---

## Tier-2 Schema Migration Plan (next commit)

A single migration `20260427_pharmacist_review_schema.sql` will add:

```sql
-- Compound batch enhancements (pharmacist review #4.2, #4.4, #4.5)
ALTER TABLE batch_ingredients
  ADD COLUMN exclude_from_bud BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN photo_url        TEXT;

ALTER TABLE batches
  ADD COLUMN vial_lot     VARCHAR(50),
  ADD COLUMN capper_lot   VARCHAR(50),
  ADD COLUMN stopper_lot  VARCHAR(50),
  ADD COLUMN psi          DECIMAL(6, 2);

-- Stripe customer ref for compound prepay (#6.1)
ALTER TABLE patients
  ADD COLUMN stripe_customer_id VARCHAR(50);
CREATE INDEX patient_stripe_customer_idx ON patients(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
```

Will deploy alongside Prisma schema updates and the corresponding UI work.

---

## Action Summary

| Status | Count |
|--------|-------|
| **DONE** (this commit) | 6 |
| **SCHEMA** (next migration) | 4 |
| **DESIGN** (needs spec / signoff) | 12 |
| **CLARIFY** (questions for Alexis) | 4 |
| **Acknowledged / no action** | 3 |

**Questions queued for Alexis:**
1. Is "Precheck" a real workflow stage, or just a DRX artifact?
2. What is "backtag on hard copy"?
3. Preferred batch-number format?
4. Which shipping carriers do you actually use (USPS / UPS / FedEx)?
