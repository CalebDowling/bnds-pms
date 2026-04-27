-- ============================================================================
-- Foreign-key indexes (perf audit follow-up)
-- ============================================================================
-- The 04/17 perf migration covered WHERE / ORDER BY indexes (status, names,
-- timestamps), but missed the JOIN-side indexes on FK columns. The 04/27
-- audit caught it: with ~239k prescriptions, ~169k patients, and ~162k
-- patient_addresses rows, every patient/Rx detail page was sequential-
-- scanning the join tables.
--
-- pg_stat_statements snapshot before this migration:
--   - patients SELECT          mean 4737 ms, max 8838 ms
--   - prescriptions SELECT     mean 4076 ms, max 12169 ms
--   - patient search           mean 1002 ms × 48 calls
--
-- After:
--   - representative patient detail query: 20 ms (~235x faster)
--
-- All indexes were applied to production via CREATE INDEX CONCURRENTLY
-- before this migration was committed, so this file is a no-op there
-- (IF NOT EXISTS guard). Fresh databases — Vercel preview, local dev,
-- new pharmacy onboarding — pick them up via this migration.
--
-- Note: We use plain CREATE INDEX (not CONCURRENTLY) here because Prisma
-- migrate deploy wraps each migration file in a transaction, and
-- CONCURRENTLY can't run inside one. That's fine for fresh-init since
-- the tables are empty at that point. Production already has them.
-- ============================================================================

-- patient_addresses: every patient detail page joins by patient_id
CREATE INDEX IF NOT EXISTS "patient_addresses_patient_id_idx" ON "patient_addresses" ("patient_id");

-- patient_phone_numbers: same — every detail page joins by patient_id
CREATE INDEX IF NOT EXISTS "patient_phone_numbers_patient_id_idx" ON "patient_phone_numbers" ("patient_id");

-- patient_insurance: queue rows enrich active insurance plan via patient_id
-- + the third_party_plan_id is joined back to plan name in the queue/Rx UI
CREATE INDEX IF NOT EXISTS "patient_insurance_patient_id_idx" ON "patient_insurance" ("patient_id");
CREATE INDEX IF NOT EXISTS "patient_insurance_third_party_plan_id_idx" ON "patient_insurance" ("third_party_plan_id");

-- patient_allergies: every queue row + Rx detail looks up allergies by patient
CREATE INDEX IF NOT EXISTS "patient_allergies_patient_id_idx" ON "patient_allergies" ("patient_id");

-- prescription_status_log: Rx detail page renders the change log; without
-- this index, every render full-scans the entire status-log table.
CREATE INDEX IF NOT EXISTS "prescription_status_log_prescription_id_idx" ON "prescription_status_log" ("prescription_id");

-- prescriptions: missing FK indexes for item / formula / insurance /
-- assignee. Every Rx detail page joins these to render drug name,
-- formula, insurance plan, and assignee.
CREATE INDEX IF NOT EXISTS "prescriptions_item_id_idx" ON "prescriptions" ("item_id");
CREATE INDEX IF NOT EXISTS "prescriptions_formula_id_idx" ON "prescriptions" ("formula_id");
CREATE INDEX IF NOT EXISTS "prescriptions_insurance_id_idx" ON "prescriptions" ("insurance_id");
CREATE INDEX IF NOT EXISTS "prescriptions_assigned_to_idx" ON "prescriptions" ("assigned_to");

-- prescription_fills: missing FK indexes for item / item_lot / batch /
-- filler / verifier. Compounding lookups, batch detail, and "fills by
-- staff" reports all need these.
CREATE INDEX IF NOT EXISTS "prescription_fills_item_id_idx" ON "prescription_fills" ("item_id");
CREATE INDEX IF NOT EXISTS "prescription_fills_item_lot_id_idx" ON "prescription_fills" ("item_lot_id");
CREATE INDEX IF NOT EXISTS "prescription_fills_batch_id_idx" ON "prescription_fills" ("batch_id");
CREATE INDEX IF NOT EXISTS "prescription_fills_filled_by_idx" ON "prescription_fills" ("filled_by");
CREATE INDEX IF NOT EXISTS "prescription_fills_verified_by_idx" ON "prescription_fills" ("verified_by");

-- patients: facility/wing/room joins for LTC reporting + facility filters
CREATE INDEX IF NOT EXISTS "patients_facility_id_idx" ON "patients" ("facility_id");
CREATE INDEX IF NOT EXISTS "patients_wing_id_idx" ON "patients" ("wing_id");
CREATE INDEX IF NOT EXISTS "patients_room_id_idx" ON "patients" ("room_id");
