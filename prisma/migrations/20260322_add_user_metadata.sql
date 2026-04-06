-- Add metadata field to users table for storing TOTP secrets and other user-specific security data
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSON DEFAULT '{}'::json;
