import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleConfig } from "@/lib/runtime/config";

export function createAdminClient() {
  const config = getSupabaseServiceRoleConfig();
  return createClient(config.url, config.serviceRoleKey);
}
