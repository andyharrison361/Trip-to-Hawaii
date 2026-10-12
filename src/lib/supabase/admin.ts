import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "@/lib/env";

/**
 * Privileged client that bypasses row-level security. Only use it on the server,
 * for work that isn't tied to a browser session (API tokens, scheduled jobs),
 * and always scope queries to a household explicitly.
 */
export function createAdminClient() {
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
