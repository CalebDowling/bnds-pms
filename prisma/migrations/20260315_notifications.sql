-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" VARCHAR(30) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB DEFAULT '{}',
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX "idx_notifications_user_unread" ON "notifications" ("user_id", "is_read") WHERE "is_read" = false;
CREATE INDEX "idx_notifications_user_created" ON "notifications" ("user_id", "created_at" DESC);
