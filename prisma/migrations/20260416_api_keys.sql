-- ============================================================================
-- Public API Keys + Request Log
-- ============================================================================
-- Adds infrastructure for third-party integrations to authenticate against
-- the /api/v1/* public API surface. Keys are SHA-256 hashed in storage;
-- the full key value is only shown once at creation time.
--
-- Related models in Prisma: ApiKey, ApiRequestLog
-- ============================================================================

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key_prefix"          VARCHAR(32)  NOT NULL UNIQUE,
  "key_hash"            VARCHAR(64)  NOT NULL UNIQUE,
  "label"               VARCHAR(120) NOT NULL,
  "description"         TEXT,
  "environment"         VARCHAR(10)  NOT NULL DEFAULT 'live',
  "scopes"              JSONB        NOT NULL DEFAULT '[]'::jsonb,
  "created_by"          UUID         NOT NULL REFERENCES "users"("id"),
  "revoked_by"          UUID         REFERENCES "users"("id"),
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "expires_at"          TIMESTAMPTZ,
  "last_used_at"        TIMESTAMPTZ,
  "revoked_at"          TIMESTAMPTZ,
  "rate_limit_per_min"  INTEGER,
  "usage_count"         BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "api_keys_key_prefix_idx"  ON "api_keys" ("key_prefix");
CREATE INDEX IF NOT EXISTS "api_keys_key_hash_idx"    ON "api_keys" ("key_hash");
CREATE INDEX IF NOT EXISTS "api_keys_revoked_at_idx"  ON "api_keys" ("revoked_at");
CREATE INDEX IF NOT EXISTS "api_keys_created_by_idx"  ON "api_keys" ("created_by");

COMMENT ON TABLE  "api_keys" IS 'Public API keys for /api/v1/* third-party integrations.';
COMMENT ON COLUMN "api_keys"."key_prefix" IS 'Non-secret prefix shown in UI (e.g. bnds_live_a1b2c3d4).';
COMMENT ON COLUMN "api_keys"."key_hash"   IS 'SHA-256 hex hash of full key. Full key is shown once at creation.';
COMMENT ON COLUMN "api_keys"."scopes"     IS 'JSON array of resource:action scopes, e.g. ["patients:read","prescriptions:read"]. "*:*" = all.';

-- ============================================================================
CREATE TABLE IF NOT EXISTS "api_request_logs" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "api_key_id"     UUID REFERENCES "api_keys"("id") ON DELETE SET NULL,
  "method"         VARCHAR(10)  NOT NULL,
  "path"           VARCHAR(255) NOT NULL,
  "status_code"    INTEGER      NOT NULL,
  "duration_ms"    INTEGER      NOT NULL,
  "ip_address"     VARCHAR(64),
  "user_agent"     VARCHAR(500),
  "request_body"   JSONB,
  "error_message"  TEXT,
  "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "api_request_logs_api_key_id_created_at_idx" ON "api_request_logs" ("api_key_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "api_request_logs_path_idx"                  ON "api_request_logs" ("path");
CREATE INDEX IF NOT EXISTS "api_request_logs_status_code_idx"           ON "api_request_logs" ("status_code");
CREATE INDEX IF NOT EXISTS "api_request_logs_created_at_idx"            ON "api_request_logs" ("created_at" DESC);

COMMENT ON TABLE "api_request_logs" IS 'Per-request log for /api/v1/* public API calls. Used for analytics, abuse detection, and audit.';
