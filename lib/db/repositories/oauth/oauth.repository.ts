import { createClient } from "@/lib/supabase/server";
import type { MarketplaceConnectionRecord } from "@/lib/platform/marketplace/types";

export class OAuthRepository {
  static async listConnectionStates(
    userId: string,
  ): Promise<MarketplaceConnectionRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("oauth_connections")
      .select("provider, connected, metadata")
      .eq("user_id", userId);

    if (error) throw error;
    return (data ?? []).map(
      (connection: {
        provider: string;
        connected: boolean;
        metadata: unknown;
      }) => {
        const metadata =
          connection.metadata && typeof connection.metadata === "object"
            ? (connection.metadata as Record<string, unknown>)
            : {};
        const status =
          typeof metadata.status === "string" ? metadata.status : null;
        return {
          provider: connection.provider,
          connected: connection.connected,
          status,
          isMock: status === "mock_connected",
        };
      },
    );
  }

  static async list(userId: string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("oauth_connections")
      .select("id, provider, scopes, metadata, connected, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return data ?? [];
  }

  static async mockConnect(userId: string, provider: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("oauth_connections")
      .upsert({
        user_id: userId,
        provider,
        connected: true,
        metadata: { status: "mock_connected" },
      })
      .select("id, provider, connected, metadata")
      .single();

    if (error) throw error;

    return data;
  }
}
