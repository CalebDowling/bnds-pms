-- ============================================================================
-- Restore keragon_config table
-- ============================================================================
-- The keragon_config table referenced by the keragon_dispatch() function
-- was dropped at some point, leaving 9 INSERT/UPDATE triggers that errored
-- with: relation "keragon_config" does not exist.
--
-- Symptom: every patient/prescription/fill/claim/batch write failed with
-- "Invalid `prisma...` invocation" until this was restored.
--
-- This recreates the same schema and seed rows from
-- 20260327_keragon_db_webhooks.sql, all rows inactive (is_active=false)
-- so triggers no-op until a webhook URL is filled in.
--
-- Applied 2026-04-26.
-- ============================================================================

CREATE TABLE IF NOT EXISTS keragon_config (
  id            SERIAL PRIMARY KEY,
  event_name    TEXT UNIQUE NOT NULL,
  webhook_url   TEXT,
  description   TEXT,
  is_active     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

INSERT INTO keragon_config (event_name, description) VALUES
  ('patient.created',      'New patient registered'),
  ('patient.updated',      'Patient record modified'),
  ('rx.new',               'New prescription entered'),
  ('rx.fill.created',      'Prescription fill record created'),
  ('rx.fill.verified',     'Fill verified by pharmacist'),
  ('rx.dispensed',         'Prescription dispensed to patient'),
  ('claim.submitted',      'Insurance claim submitted'),
  ('claim.paid',           'Claim adjudicated — paid'),
  ('claim.rejected',       'Claim adjudicated — rejected'),
  ('batch.created',        'Compounding batch initiated'),
  ('batch.completed',      'Compounding batch completed QA'),
  ('inventory.low',        'Item below reorder point')
ON CONFLICT (event_name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_keragon_config_event
  ON keragon_config (event_name)
  WHERE is_active = true;
