-- ============================================================================
-- Pharmacist review schema additions
-- ============================================================================
-- Per Alexis Nguyen's review of the Workflow Guide on 2026-04-23, four
-- structural additions are needed to support compounding and prepay flows.
--
-- See docs/Workflow_Review_Triage.md for the full annotation set.
--
-- This migration is non-destructive: every column is nullable or has a
-- default, so existing rows are unaffected.
-- ============================================================================

-- ── Compound batch ingredients ────────────────────────────────────────────
-- (#4.5) Some ingredients (e.g., a buffer used purely for a pH check) shouldn't
-- factor into the BUD calculation since they're consumed in-process and don't
-- end up in the final compound. Default false = behave as before.
--
-- (#4.2) Photo capture for syringes / filters used in IV/sterile preparations,
-- recorded against the ingredient row.
ALTER TABLE batch_ingredients
  ADD COLUMN IF NOT EXISTS exclude_from_bud BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_url        TEXT;

COMMENT ON COLUMN batch_ingredients.exclude_from_bud IS
  'When true, this ingredient is skipped when computing the batch BUD from the earliest-expiring lot. Used for in-process buffers, pH checks, etc.';

COMMENT ON COLUMN batch_ingredients.photo_url IS
  'Supabase Storage URL of a photo taken at the workstation (typically syringes for liquid actives or in-line filters used during compounding).';

-- ── Batch-level structured fields ─────────────────────────────────────────
-- (#4.4) The batch record needs structured fields for vial/capper/stopper lot
-- numbers and the PSI reading from the autoclave / pressure cycle. Previously
-- these were free-text notes; pulling them out lets us search and report.
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS vial_lot     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS capper_lot   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS stopper_lot  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS psi          DECIMAL(6, 2);

COMMENT ON COLUMN batches.vial_lot     IS 'Lot number of the vials used for this batch.';
COMMENT ON COLUMN batches.capper_lot   IS 'Lot number of the cappers (sterile crimped seals) used.';
COMMENT ON COLUMN batches.stopper_lot  IS 'Lot number of the stoppers (rubber closures) used.';
COMMENT ON COLUMN batches.psi          IS 'Autoclave or pressure-cycle PSI reading recorded at the time of the batch.';

-- ── Stripe customer ref on patients ───────────────────────────────────────
-- (#6.1) Compound prescriptions are mostly prepaid. To enable stored-card
-- charges for compound prepay we attach a Stripe Customer ID per patient.
-- We never store actual card numbers — that's Stripe's job — only the
-- customer reference, which is safe in our DB.
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS patient_stripe_customer_idx
  ON patients(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN patients.stripe_customer_id IS
  'Stripe Customer ID (cus_…). Null until the patient has been registered with Stripe for stored payment methods. PaymentMethods themselves are stored at Stripe and never in our DB.';

-- ── New fill statuses are not enum-constrained ────────────────────────────
-- The prescription_fills.status column is plain TEXT (no CHECK constraint),
-- so the new statuses introduced in this round (rph_rejected, compound_qa,
-- telehealth) need no DDL — they're added in the application code at
-- src/lib/workflow/fill-status.ts.
