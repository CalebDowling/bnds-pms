-- ============================================================================
-- Postgres SEQUENCE for Rx number allocation
-- ============================================================================
-- Replaces the "read MAX(rx_number) + 1, retry on P2002" pattern in
-- createPrescription with an atomic sequence-backed allocator. The MAX+retry
-- approach was correct under low concurrency but had two failure modes the
-- pharmacy hit during the 04/26 stress test:
--
--   1. Concurrent inserts both read the same MAX, both try to create
--      the same rxNumber — one succeeds, the other retries (handled).
--   2. The retry re-reads MAX, gets the same value, and loops until it
--      times out — the local-increment fallback masks this but it still
--      wastes connections during traffic spikes.
--
-- A SEQUENCE handed out by Postgres is atomic by construction and
-- collision-free, even at thousands of allocations per second.
--
-- This migration is idempotent and safe to re-run:
--   - The sequence is created only if it doesn't already exist.
--   - The starting value is computed from MAX(rx_number) + 1 of existing
--     rows, with a floor of 100001 (matching the previous nextRxNumberSeed
--     fallback). Numeric extraction strips any non-digit garbage so legacy
--     rows with a "RX-" prefix are still read correctly.
-- ============================================================================

DO $$
DECLARE
  next_seed BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'rx_number_seq' AND relkind = 'S') THEN
    -- Compute the starting value from existing rows so the sequence picks
    -- up where the MAX+1 logic left off. NULLIF + REGEXP_REPLACE strips
    -- any non-digit characters defensively (legacy seed rows had a
    -- "RX-XXXXX" format in some test datasets).
    SELECT COALESCE(
      MAX(NULLIF(REGEXP_REPLACE(rx_number, '[^0-9]', '', 'g'), '')::BIGINT),
      100000
    ) + 1
    INTO next_seed
    FROM prescriptions;

    -- Floor at 100001 so a brand-new database without any prescriptions
    -- still starts in a reasonable range (matches the pre-sequence behavior).
    IF next_seed < 100001 THEN
      next_seed := 100001;
    END IF;

    -- Create the sequence with the computed start value.
    EXECUTE format(
      'CREATE SEQUENCE rx_number_seq START WITH %s INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE',
      next_seed
    );
  END IF;
END $$;

-- Defensive: even if the sequence already existed (e.g. created by hand on
-- a developer machine), make sure its current value is at least
-- MAX(rx_number) + 1 so the next nextval() can't collide with existing rows.
DO $$
DECLARE
  current_max BIGINT;
  seq_last BIGINT;
BEGIN
  SELECT COALESCE(
    MAX(NULLIF(REGEXP_REPLACE(rx_number, '[^0-9]', '', 'g'), '')::BIGINT),
    0
  )
  INTO current_max
  FROM prescriptions;

  SELECT last_value INTO seq_last FROM rx_number_seq;

  IF current_max >= seq_last THEN
    PERFORM setval('rx_number_seq', current_max + 1, false);
  END IF;
END $$;

COMMENT ON SEQUENCE rx_number_seq IS
  'Atomic allocator for Prescription.rx_number. Used by createPrescription via SELECT nextval(''rx_number_seq''). Replaces the MAX+1+retry pattern with a Postgres-managed counter that is collision-free under arbitrary concurrency.';
