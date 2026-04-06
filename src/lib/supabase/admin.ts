import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin client — uses the service role key.
 * This client bypasses Row Level Security and can manage auth users.
 * Only use in server-side code (server actions, API routes).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
