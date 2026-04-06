-- ============================================================================
-- Keragon Database Webhooks via pg_net
-- ============================================================================
-- This migration creates PostgreSQL triggers that fire HTTP POST requests
-- to Keragon workflow webhook URLs when key pharmacy events occur.
--
-- Prerequisites:
--   1. pg_net extension must be enabled in Supabase (Dashboard → Extensions)
--   2. Keragon workflow URLs must be set in the keragon_config table below
--
-- How it works:
--   INSERT/UPDATE on a table → trigger function → pg_net.http_post() → Keragon
--
-- To configure:
--   UPDATE keragon_config SET webhook_url = 'https://hooks.keragon.com/wf/...'
--   WHERE event_name = 'rx.new';
--
-- To disable a specific webhook:
--   UPDATE keragon_config SET is_active = false WHERE event_name = 'rx.new';
-- ============================================================================

-- Enable pg_net extension (Supabase built-in for async HTTP from Postgres)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- Configuration table for Keragon webhook URLs
-- ============================================================================
CREATE TABLE IF NOT EXISTS keragon_config (
  id            SERIAL PRIMARY KEY,
  event_name    TEXT UNIQUE NOT NULL,
  webhook_url   TEXT,                    -- Keragon trigger URL (set this per workflow)
  description   TEXT,
  is_active     BOOLEAN DEFAULT false,   -- Only fire when active AND url is set
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed the configuration with all supported events
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

-- ============================================================================
-- Generic dispatch function
-- Looks up the webhook URL from keragon_config and fires via pg_net
-- ============================================================================
CREATE OR REPLACE FUNCTION keragon_dispatch(
  p_event_name TEXT,
  p_payload    JSONB
) RETURNS void AS $$
DECLARE
  v_url TEXT;
  v_active BOOLEAN;
  v_full_payload JSONB;
BEGIN
  -- Look up config
  SELECT webhook_url, is_active
    INTO v_url, v_active
    FROM keragon_config
   WHERE event_name = p_event_name;

  -- Skip if not configured or not active
  IF v_url IS NULL OR v_url = '' OR v_active IS NOT TRUE THEN
    RETURN;
  END IF;

  -- Build full event envelope
  v_full_payload := jsonb_build_object(
    'event',     p_event_name,
    'timestamp', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'eventId',   gen_random_uuid()::text,
    'source',    'supabase-trigger',
    'data',      p_payload
  );

  -- Fire async HTTP POST via pg_net
  PERFORM extensions.http_post(
    url     := v_url,
    body    := v_full_payload::text,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'X-Event-Type',  p_event_name,
      'X-Source',      'bnds-pms-supabase'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Patient created
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_patient_created() RETURNS TRIGGER AS $$
BEGIN
  PERFORM keragon_dispatch('patient.created', jsonb_build_object(
    'patientId',   NEW.id,
    'mrn',         NEW.mrn,
    'firstName',   NEW."firstName",
    'lastName',    NEW."lastName",
    'dateOfBirth', NEW."dateOfBirth",
    'email',       NEW.email
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS keragon_patient_created ON "Patient";
CREATE TRIGGER keragon_patient_created
  AFTER INSERT ON "Patient"
  FOR EACH ROW
  EXECUTE FUNCTION trg_patient_created();

-- ============================================================================
-- TRIGGER: Patient updated
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_patient_updated() RETURNS TRIGGER AS $$
BEGIN
  -- Only fire if meaningful fields changed (not just updatedAt)
  IF NEW."firstName" IS DISTINCT FROM OLD."firstName"
     OR NEW."lastName" IS DISTINCT FROM OLD."lastName"
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW."dateOfBirth" IS DISTINCT FROM OLD."dateOfBirth"
     OR NEW.allergies IS DISTINCT FROM OLD.allergies
  THEN
    PERFORM keragon_dispatch('patient.updated', jsonb_build_object(
      'patientId',   NEW.id,
      'mrn',         NEW.mrn,
      'firstName',   NEW."firstName",
      'lastName',    NEW."lastName"
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS keragon_patient_updated ON "Patient";
CREATE TRIGGER keragon_patient_updated
  AFTER UPDATE ON "Patient"
  FOR EACH ROW
  EXECUTE FUNCTION trg_patient_updated();

-- ============================================================================
-- TRIGGER: New prescription
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_rx_new() RETURNS TRIGGER AS $$
BEGIN
  PERFORM keragon_dispatch('rx.new', jsonb_build_object(
    'prescriptionId', NEW.id,
    'rxNumber',       NEW."rxNumber",
    'patientId',      NEW."patientId",
    'prescriberId',   NEW."prescriberId",
    'quantity',       NEW.quantity,
    'daysSupply',     NEW."daysSupply",
    'refillsAuth',    NEW."refillsAuthorized",
    'status',         NEW.status
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS keragon_rx_new ON "Prescription";
CREATE TRIGGER keragon_rx_new
  AFTER INSERT ON "Prescription"
  FOR EACH ROW
  EXECUTE FUNCTION trg_rx_new();

-- ============================================================================
-- TRIGGER: Prescription fill created
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_fill_created() RETURNS TRIGGER AS $$
BEGIN
  PERFORM keragon_dispatch('rx.fill.created', jsonb_build_object(
    'fillId',          NEW.id,
    'prescriptionId',  NEW."prescriptionId",
    'quantity',        NEW.quantity,
    'status',          NEW.status,
    'fillNumber',      NEW."fillNumber"
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS keragon_fill_created ON "PrescriptionFill";
CREATE TRIGGER keragon_fill_created
  AFTER INSERT ON "PrescriptionFill"
  FOR EACH ROW
  EXECUTE FUNCTION trg_fill_created();

-- ============================================================================
-- TRIGGER: Fill status changed (verified / dispensed)
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_fill_status_changed() RETURNS TRIGGER AS $$
BEGIN
  -- Fire on verification
  IF NEW.status = 'verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    PERFORM keragon_dispatch('rx.fill.verified', jsonb_build_object(
      'fillId',          NEW.id,
      'prescriptionId',  NEW."prescriptionId",
      'verifiedBy',      NEW."verifiedBy",
      'verifiedAt',      NEW."verifiedAt"
    ));
  END IF;

  -- Fire on dispensing
  IF NEW.status = 'dispensed' AND OLD.status IS DISTINCT FROM 'dispensed' THEN
    PERFORM keragon_dispatch('rx.dispensed', jsonb_build_object(
      'fillId',          NEW.id,
      'prescriptionId',  NEW."prescriptionId",
      'quantity',        NEW.quantity,
      'copay',           NEW.copay
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS keragon_fill_status ON "PrescriptionFill";
CREATE TRIGGER keragon_fill_status
  AFTER UPDATE ON "PrescriptionFill"
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION trg_fill_status_changed();

-- ============================================================================
-- TRIGGER: Claim submitted / paid / rejected
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_claim_created() RETURNS TRIGGER AS $$
BEGIN
  PERFORM keragon_dispatch('claim.submitted', jsonb_build_object(
    'claimId',     NEW.id,
    'fillId',      NEW."fillId",
    'insuranceId', NEW."insuranceId",
    'amountBilled', NEW."amountBilled",
    'status',      NEW.status
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS keragon_claim_created ON "Claim";
CREATE TRIGGER keragon_claim_created
  AFTER INSERT ON "Claim"
  FOR EACH ROW
  EXECUTE FUNCTION trg_claim_created();

CREATE OR REPLACE FUNCTION trg_claim_status_changed() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    PERFORM keragon_dispatch('claim.paid', jsonb_build_object(
      'claimId',     NEW.id,
      'fillId',      NEW."fillId",
      'amountPaid',  NEW."amountPaid",
      'copay',       NEW.copay,
      'paidAt',      NEW."paidAt"
    ));
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    PERFORM keragon_dispatch('claim.rejected', jsonb_build_object(
      'claimId',          NEW.id,
      'fillId',           NEW."fillId",
      'rejectionCode',    NEW."rejectionCode",
      'rejectionMessage', NEW."rejectionMessage"
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS keragon_claim_status ON "Claim";
CREATE TRIGGER keragon_claim_status
  AFTER UPDATE ON "Claim"
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION trg_claim_status_changed();

-- ============================================================================
-- TRIGGER: Compounding batch created / completed
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_batch_created() RETURNS TRIGGER AS $$
BEGIN
  PERFORM keragon_dispatch('batch.created', jsonb_build_object(
    'batchId',      NEW.id,
    'batchNumber',  NEW."batchNumber",
    'formulaId',    NEW."formulaId",
    'quantity',     NEW.quantity,
    'status',       NEW.status
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS keragon_batch_created ON "Batch";
CREATE TRIGGER keragon_batch_created
  AFTER INSERT ON "Batch"
  FOR EACH ROW
  EXECUTE FUNCTION trg_batch_created();

CREATE OR REPLACE FUNCTION trg_batch_completed() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    PERFORM keragon_dispatch('batch.completed', jsonb_build_object(
      'batchId',      NEW.id,
      'batchNumber',  NEW."batchNumber",
      'formulaId',    NEW."formulaId",
      'quantity',     NEW.quantity,
      'verifiedBy',   NEW."verifiedBy"
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS keragon_batch_completed ON "Batch";
CREATE TRIGGER keragon_batch_completed
  AFTER UPDATE ON "Batch"
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION trg_batch_completed();

-- ============================================================================
-- Index for keragon_config lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_keragon_config_event
  ON keragon_config (event_name)
  WHERE is_active = true;

-- ============================================================================
-- Helper: Enable a workflow
-- Usage: SELECT keragon_enable('rx.new', 'https://hooks.keragon.com/wf/abc123');
-- ============================================================================
CREATE OR REPLACE FUNCTION keragon_enable(
  p_event TEXT,
  p_url   TEXT
) RETURNS void AS $$
BEGIN
  UPDATE keragon_config
     SET webhook_url = p_url,
         is_active   = true,
         updated_at  = now()
   WHERE event_name = p_event;

  IF NOT FOUND THEN
    INSERT INTO keragon_config (event_name, webhook_url, is_active)
    VALUES (p_event, p_url, true);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper: Disable a workflow
-- Usage: SELECT keragon_disable('rx.new');
-- ============================================================================
CREATE OR REPLACE FUNCTION keragon_disable(p_event TEXT) RETURNS void AS $$
BEGIN
  UPDATE keragon_config
     SET is_active  = false,
         updated_at = now()
   WHERE event_name = p_event;
END;
$$ LANGUAGE plpgsql;
