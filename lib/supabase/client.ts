import { createBrowserClient } from "@supabase/ssr";
import { getPublicRuntimeConfig } from "@/lib/runtime/publicConfig";

export function createClient() {
  const config = getPublicRuntimeConfig();
  return createBrowserClient(config.supabaseUrl, config.supabaseAnonKey);
}
