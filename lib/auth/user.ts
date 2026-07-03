import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/config/demo";

export async function getCurrentUser() {
  if (isDemoMode()) {
    return {
      id: "00000000-0000-0000-0000-000000000000",
      email: "demo@alma.local",
    } as any;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return data.user;
}
