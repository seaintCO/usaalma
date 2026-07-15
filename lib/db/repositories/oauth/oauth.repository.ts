import type { MarketplaceConnectionRecord } from "@/lib/platform/marketplace/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type GoogleWorkspaceConnection = {
  id: string;
  user_id: string;
  provider: "google_workspace";
  connected: boolean;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  scopes: string | null;
  metadata: Record<string, unknown> | null;
  connection_status: "connected" | "reconnect_required" | "disconnected";
  provider_account_email: string | null;
  provider_account_id: string | null;
};

export class OAuthRepository {
  static async listConnectionStates(
    userId: string,
  ): Promise<MarketplaceConnectionRecord[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("oauth_connections")
      .select(
        "provider, connected, metadata, connection_status, expires_at, refresh_token, provider_account_email, scopes",
      )
      .eq("user_id", userId);

    if (error) throw error;
    return (data ?? []).map(
      (connection: {
        provider: string;
        connected: boolean;
        metadata: unknown;
        connection_status: string | null;
        expires_at: string | null;
        refresh_token: string | null;
        provider_account_email: string | null;
        scopes: string | null;
      }) => {
        const metadata =
          connection.metadata && typeof connection.metadata === "object"
            ? (connection.metadata as Record<string, unknown>)
            : {};
        const metadataStatus =
          typeof metadata.status === "string" ? metadata.status : null;
        return {
          provider: connection.provider,
          connected: connection.connected,
          status: connection.connection_status ?? metadataStatus,
          isMock: metadataStatus === "mock_connected",
          expiresAt: connection.expires_at,
          hasRefreshToken: Boolean(connection.refresh_token),
          providerAccountEmail: connection.provider_account_email,
          grantedScopes: connection.scopes?.split(/\s+/).filter(Boolean) ?? [],
        };
      },
    );
  }

  static async list(userId: string) {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from("oauth_connections")
      .select("id, provider, scopes, metadata, connected, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return data ?? [];
  }

  static async mockConnect(userId: string, provider: string) {
    const supabase = createAdminClient();

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

  static async getGoogleWorkspaceConnection(userId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("oauth_connections")
      .select(
        "id, user_id, provider, connected, access_token, refresh_token, expires_at, scopes, metadata, connection_status, provider_account_email, provider_account_id",
      )
      .eq("user_id", userId)
      .eq("provider", "google_workspace")
      .maybeSingle();
    if (error) throw error;
    return data as GoogleWorkspaceConnection | null;
  }

  static async saveGoogleWorkspaceConnection(input: {
    userId: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
    scopes: string | null;
    accountEmail: string;
    accountId: string;
  }) {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("oauth_connections")
      .upsert(
        {
          user_id: input.userId,
          provider: "google_workspace",
          connected: true,
          access_token: input.accessToken,
          refresh_token: input.refreshToken,
          expires_at: input.expiresAt,
          scopes: input.scopes,
          provider_account_email: input.accountEmail,
          provider_account_id: input.accountId,
          connected_at: now,
          disconnected_at: null,
          connection_status: "connected",
          connection_error: null,
          metadata: { encrypted: true, connection_kind: "google_workspace" },
        },
        { onConflict: "user_id,provider" },
      )
      .select(
        "id, provider, connected, connection_status, provider_account_email",
      )
      .single();
    if (error) throw error;
    return data;
  }

  static async markGoogleWorkspaceRefresh(input: {
    userId: string;
    accessToken: string;
    expiresAt: string | null;
  }) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("oauth_connections")
      .update({
        access_token: input.accessToken,
        expires_at: input.expiresAt,
        last_refreshed_at: new Date().toISOString(),
        connected: true,
        connection_status: "connected",
        connection_error: null,
      })
      .eq("user_id", input.userId)
      .eq("provider", "google_workspace");
    if (error) throw error;
  }

  static async markGoogleWorkspaceReconnectRequired(
    userId: string,
    reason: string,
  ) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("oauth_connections")
      .update({
        connected: false,
        connection_status: "reconnect_required",
        connection_error: reason.slice(0, 160),
      })
      .eq("user_id", userId)
      .eq("provider", "google_workspace");
    if (error) throw error;
  }

  static async disconnectGoogleWorkspace(userId: string) {
    const connection = await this.getGoogleWorkspaceConnection(userId);
    if (!connection) return null;
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("oauth_connections")
      .update({
        connected: false,
        connection_status: "disconnected",
        access_token: null,
        refresh_token: null,
        expires_at: null,
        disconnected_at: new Date().toISOString(),
        connection_error: null,
      })
      .eq("id", connection.id)
      .eq("user_id", userId);
    if (error) throw error;
    return connection;
  }
}
