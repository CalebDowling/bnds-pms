-- ============================================================================
-- Performance indexes (from audit)
-- ============================================================================
-- Added after a performance audit identified these WHERE/ORDER BY patterns
-- being executed without index support, causing sequential scans on large
-- tables (patients, prescriptions, prescription_fills, claims, items).
-- ============================================================================

-- patients: searches by (last_name, first_name) and by status
CREATE INDEX IF NOT EXISTS "patients_last_name_first_name_idx" ON "patients" ("last_name", "first_name");
CREATE INDEX IF NOT EXISTS "patients_status_idx" ON "patients" ("status");

-- prescriptions: queue filtering by (status, date_received) + prescriber lookup
CREATE INDEX IF NOT EXISTS "prescriptions_status_date_received_idx" ON "prescriptions" ("status", "date_received" DESC);
CREATE INDEX IF NOT EXISTS "prescriptions_prescriber_id_idx" ON "prescriptions" ("prescriber_id");

-- prescription_fills: status + time filters, prescription lookup, claim join, dispensing reports
CREATE INDEX IF NOT EXISTS "prescription_fills_status_created_at_idx" ON "prescription_fills" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "prescription_fills_prescription_id_idx" ON "prescription_fills" ("prescription_id");
CREATE INDEX IF NOT EXISTS "prescription_fills_filled_at_idx" ON "prescription_fills" ("filled_at" DESC);
CREATE INDEX IF NOT EXISTS "prescription_fills_dispensed_at_idx" ON "prescription_fills" ("dispensed_at" DESC);
CREATE INDEX IF NOT EXISTS "prescription_fills_claim_id_idx" ON "prescription_fills" ("claim_id");

-- items: inventory search by name, active filter
CREATE INDEX IF NOT EXISTS "items_name_idx" ON "items" ("name");
CREATE INDEX IF NOT EXISTS "items_is_active_idx" ON "items" ("is_active");

-- claims: status + time filter, insurance lookup, submission sort
CREATE INDEX IF NOT EXISTS "claims_status_created_at_idx" ON "claims" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "claims_insurance_id_idx" ON "claims" ("insurance_id");
CREATE INDEX IF NOT EXISTS "claims_submitted_at_idx" ON "claims" ("submitted_at" DESC);
