import { createAdminClient } from "@/lib/supabase/admin";

export class IntegrationRepository {
  static async listConfiguredVoiceProviders(userId: string): Promise<string[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("provider_connections")
      .select("provider,connection_status")
      .eq("user_id", userId)
      .in("provider", ["elevenlabs", "twilio"])
      .eq("connection_status", "connected");

    if (error) throw error;
    return (data ?? []).map((row) => row.provider);
  }

  static async listConnected(userId: string) {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from("oauth_connections")
      .select("provider, connected, metadata")
      .eq("user_id", userId)
      .eq("connected", true);

    return data ?? [];
  }
}
