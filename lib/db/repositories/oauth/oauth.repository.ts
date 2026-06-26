import { createClient } from "@/lib/supabase/server";

export class OAuthRepository {
  static async list(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("oauth_connections")
      .select("id, provider, scopes, metadata, connected, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending:false });

    return data ?? [];
  }

  static async mockConnect(userId:string, provider:string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("oauth_connections")
      .upsert({
        user_id:userId,
        provider,
        connected:true,
        metadata:{ status:"mock_connected" },
      })
      .select("id, provider, connected, metadata")
      .single();

    if (error) throw error;

    return data;
  }
}
