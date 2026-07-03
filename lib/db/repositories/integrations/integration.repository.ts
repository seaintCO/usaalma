import { createClient } from "@/lib/supabase/server";

export class IntegrationRepository {
  static async listConnected(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("oauth_connections")
      .select("provider, connected, metadata")
      .eq("user_id", userId)
      .eq("connected", true);

    return data ?? [];
  }
}
