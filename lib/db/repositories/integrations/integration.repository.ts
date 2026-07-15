import { createAdminClient } from "@/lib/supabase/admin";

export class IntegrationRepository {
  static async listConfiguredVoiceProviders(userId: string): Promise<string[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("workspace_voice_connections")
      .select(
        "twilio_account_sid, twilio_phone_number, elevenlabs_api_key, elevenlabs_voice_id",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    const providers: string[] = [];
    if (data?.elevenlabs_api_key && data?.elevenlabs_voice_id)
      providers.push("elevenlabs");
    if (data?.twilio_account_sid && data?.twilio_phone_number)
      providers.push("twilio");
    return providers;
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
