export type PublicRuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Public Supabase configuration is unavailable.");
  }
  return { supabaseUrl, supabaseAnonKey };
}
