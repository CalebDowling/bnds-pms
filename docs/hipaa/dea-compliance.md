# DEA Compliance Documentation
## Boudreaux's New Drug Store — PMS

**Last Updated:** March 2026

---

## Applicable Regulations
- 21 CFR Part 1304 — Records and Reports of Registrants
- 21 CFR Part 1306 — Prescriptions
- 21 CFR Part 1311 — Electronic Prescribing of Controlled Substances (EPCS)

## Controlled Substance Tracking

### Schedule Classification
The system tracks controlled substances via the `isControlled` flag and schedule indicator on the Item model. All Schedule II-V items are flagged during inventory setup.

### DEA Log
- **Location:** `/compliance/dea-log`
- **Data Captured:** Drug name, schedule, quantity dispensed, patient, prescriber DEA#, date filled
- **Reporting:** Daily and date-range reports with export to CSV/PDF
- **Integrity:** All dispensing events logged to audit trail with tamper-evident hash chain

### Inventory Reconciliation
- Physical inventory count required for Schedule II substances
- System tracks on-hand quantity per lot
- Discrepancy detection: alerts when physical count differs from system count
- **DEA Form 106:** Required for theft/loss — generated manually (to be automated)

### Biennial Inventory
- Complete inventory of all controlled substances required every 2 years
- System supports export of current C-II through C-V inventory with lot detail

## Electronic Prescribing (EPCS)

### Current Status
- SureScripts integration receives electronic prescriptions
- EPCS signature verification: **In Development** (stubbed in `src/lib/erx/`)
- Requires: FIPS 201 identity proofing + two-factor authentication for prescribers

### Requirements for Full EPCS Compliance
1. [ ] Identity proofing vendor integration (e.g., Exostar, IdenTrust)
2. [ ] Two-factor authentication for prescriber portal
3. [ ] Digital signature validation on received EPCS prescriptions
4. [ ] Audit trail for all EPCS transactions

## CSOS (Controlled Substance Ordering System)

### Current Status: **Not Implemented**
- CSOS is required for electronic ordering of Schedule II substances from wholesalers
- Requires DEA-issued digital certificate (CSOS certificate)
- **Action Items:**
  1. [ ] Apply for CSOS certificate from DEA
  2. [ ] Implement CSOS digital signature module
  3. [ ] Integrate with wholesaler ordering system

## PDMP Reporting

### Louisiana PMP
- **Integration:** `src/lib/integrations/pdmp.ts` via PMP InterConnect (Bamboo Health)
- **Query capability:** Real-time patient history lookup for controlled substances
- **Risk analysis:** Automated flags for multiple prescribers, pharmacies, overlapping fills, early refills
- **Requirements:**
  1. [ ] Complete PMP InterConnect enrollment
  2. [ ] Obtain API credentials from Louisiana Board of Pharmacy
  3. [ ] Enable mandatory PDMP check before dispensing Schedule II-V

## Record Retention
- Controlled substance records: **Minimum 2 years** (federal), **5 years** (Louisiana)
- System uses soft deletes — no controlled substance records are permanently deleted
- Audit logs retained for 7 years (HIPAA alignment)

## Reporting Schedule
- **Daily:** DEA log reviewed by pharmacist-in-charge
- **Monthly:** Controlled substance inventory reconciliation
- **Biennially:** Complete biennial inventory
- **As needed:** DEA Form 106 (theft/loss), DEA Form 222 (C-II ordering)
