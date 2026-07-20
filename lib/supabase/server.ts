import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleConfig,
} from "@/lib/runtime/config";

export async function createClient() {
  const requestHeaders = await headers();
  if (
    process.env.CHAT_RUN_WORKER_SECRET &&
    requestHeaders.get("x-chat-run-worker-secret") ===
      process.env.CHAT_RUN_WORKER_SECRET
  ) {
    const config = getSupabaseServiceRoleConfig();
    return createAdminClient(config.url, config.serviceRoleKey);
  }
  const cookieStore = await cookies();
  const config = getSupabasePublicConfig();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });
}
