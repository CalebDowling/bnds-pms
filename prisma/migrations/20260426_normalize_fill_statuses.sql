-- ============================================================================
-- Normalize prescription_fills.status values
-- ============================================================================
-- Earlier versions of the DRX sync wrote fill statuses verbatim from DRX
-- ("Print", "Verify", "Waiting Bin", etc.) but the queue lookup in
-- lib/workflow/fill-status.ts expects canonical lowercase snake_case
-- ("print", "verify", "waiting_bin").
--
-- That mismatch is why the dashboard queue page showed counts but no fills
-- — the badge query worked but the table query came up empty.
--
-- Applied 2026-04-26 alongside the DRX mothball commit. Idempotent — safe
-- to re-run.
-- ============================================================================

UPDATE prescription_fills SET status = 'sold'         WHERE status = 'Sold';
UPDATE prescription_fills SET status = 'hold'         WHERE status = 'Hold';
UPDATE prescription_fills SET status = 'waiting_bin'  WHERE status = 'Waiting Bin';
UPDATE prescription_fills SET status = 'verify'       WHERE status = 'Verify';
UPDATE prescription_fills SET status = 'print'        WHERE status = 'Print';
UPDATE prescription_fills SET status = 'scan'         WHERE status = 'Scan';
