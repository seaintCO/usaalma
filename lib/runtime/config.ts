import "server-only";

export * from "./readiness";
import { assertRuntimeConfig } from "./readiness";

function envValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getSupabasePublicConfig() {
  assertRuntimeConfig("supabase-public");
  return {
    url: envValue("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: envValue("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getSupabaseServiceRoleConfig() {
  assertRuntimeConfig("supabase-service-role");
  return {
    url: envValue("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: envValue("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
