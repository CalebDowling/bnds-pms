-- Migration: Billing infrastructure & analytics
-- Date: 2026-03-14
-- Changes:
--   1. Add NCPDP provider ID to stores
--   2. Add help_desk_phone and submission_format to third_party_plans
--   3. Add notes column to claims
--   4. Create claim_status_logs table for audit trail
--   5. Add depleted status support to item_lots (no schema change needed)

-- 1. Store: add NCPDP provider ID
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ncpdp_id VARCHAR(10);

-- 2. Third Party Plans: add help desk phone and submission format
ALTER TABLE third_party_plans ADD COLUMN IF NOT EXISTS help_desk_phone VARCHAR(20);
ALTER TABLE third_party_plans ADD COLUMN IF NOT EXISTS submission_format VARCHAR(30);

-- 3. Claims: add notes
ALTER TABLE claims ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Claim Status Logs (audit trail)
CREATE TABLE IF NOT EXISTS claim_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id),
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_status_logs_claim_id ON claim_status_logs(claim_id);
