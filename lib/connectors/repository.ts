import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";
import {
  CONNECTOR_DEFINITIONS,
  getMissingConnectorEnv,
  hasServerSupabaseSecret,
} from "./config";
import type {
  ConnectorProvider,
  ConnectorStatus,
  ConnectorSummary,
  EmailConnectorProvider,
} from "./types";

type ProviderConnectionRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  provider: ConnectorProvider;
  provider_account_id: string | null;
  provider_account_email: string | null;
  provider_account_name: string | null;
  connection_status: ConnectorStatus;
  granted_scopes: string[] | null;
  access_token_expires_at: string | null;
  has_refresh_token: boolean;
  last_successful_refresh_at: string | null;
  last_successful_action_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
};

type ProviderSecretRow = {
  connection_id: string;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  scope: string | null;
  expires_at: string | null;
};

export class ConnectorConfigurationError extends Error {
  constructor(
    message: string,
    public readonly missing: string[] = [],
  ) {
    super(message);
    this.name = "ConnectorConfigurationError";
  }
}

function assertServerConfigured(provider?: ConnectorProvider) {
  const missing = provider
    ? getMissingConnectorEnv(provider)
    : hasServerSupabaseSecret()
      ? []
      : ["SUPABASE_SERVICE_ROLE_KEY"];
  if (missing.length) {
    throw new ConnectorConfigurationError(
      "Server configuration required.",
      missing,
    );
  }
}

function admin() {
  assertServerConfigured();
  return createAdminClient();
}

function safeDecrypt(value: string | null) {
  if (!value) return "";
  return decryptSecret(value);
}

function summaryFor(
  provider: ConnectorProvider,
  row: ProviderConnectionRow | null,
): ConnectorSummary {
  const definition = CONNECTOR_DEFINITIONS[provider];
  const missing = getMissingConnectorEnv(provider);
  const configurationBlocked = definition.operational && missing.length > 0;
  return {
    provider,
    name: definition.name,
    status: configurationBlocked
      ? "configuration_required"
      : (row?.connection_status ?? "not_connected"),
    connectedEmail: row?.provider_account_email ?? null,
    connectedName: row?.provider_account_name ?? null,
    providerAccountId: row?.provider_account_id ?? null,
    metadata: row
      ? {
          scopes: row.granted_scopes ?? [],
          expiresAt: row.access_token_expires_at ?? null,
        }
      : null,
    lastSuccessfulUse: row?.last_successful_action_at ?? null,
    lastErrorCode: configurationBlocked
      ? "server_configuration_required"
      : (row?.last_error_code ?? null),
    lastErrorMessage: configurationBlocked
      ? `Missing ${missing.join(", ")}.`
      : (row?.last_error_message ?? null),
    canConnect: definition.operational,
    canDisconnect: Boolean(row && row.connection_status !== "not_connected"),
  };
}

export class ConnectorRepository {
  static async resolveDefaultWorkspaceId(userId: string) {
    const supabase = admin();
    const { data: owned, error: ownerError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (ownerError) throw ownerError;
    if (owned?.id) return owned.id as string;

    const { data: member, error: memberError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (memberError) throw memberError;
    return (member?.workspace_id as string | undefined) ?? null;
  }

  static async listSummaries(userId: string) {
    let workspaceId: string | null = null;
    try {
      workspaceId = await this.resolveDefaultWorkspaceId(userId);
    } catch (error) {
      if (error instanceof ConnectorConfigurationError) {
        return Object.keys(CONNECTOR_DEFINITIONS).map((provider) =>
          summaryFor(provider as ConnectorProvider, null),
        );
      }
      throw error;
    }
    if (!workspaceId) {
      return Object.keys(CONNECTOR_DEFINITIONS).map((provider) => ({
        ...summaryFor(provider as ConnectorProvider, null),
        status: "configuration_required" as const,
        lastErrorCode: "workspace_required",
        lastErrorMessage: "Create or select a workspace before connecting.",
      }));
    }
    const supabase = admin();
    const { data, error } = await supabase
      .from("provider_connections")
      .select(
        "id,user_id,workspace_id,provider,provider_account_id,provider_account_email,provider_account_name,connection_status,granted_scopes,access_token_expires_at,has_refresh_token,last_successful_refresh_at,last_successful_action_at,last_error_code,last_error_message",
      )
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    const rows = new Map(
      ((data ?? []) as ProviderConnectionRow[]).map((row) => [
        row.provider,
        row,
      ]),
    );
    return Object.keys(CONNECTOR_DEFINITIONS).map((provider) =>
      summaryFor(
        provider as ConnectorProvider,
        rows.get(provider as ConnectorProvider) ?? null,
      ),
    );
  }

  static async saveOAuthConnection(input: {
    userId: string;
    workspaceId: string;
    provider: EmailConnectorProvider;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
    scopes: string[];
    providerAccountId: string;
    providerAccountEmail: string;
    providerAccountName: string | null;
    metadata?: Record<string, unknown>;
  }) {
    assertServerConfigured(input.provider);
    const supabase = admin();
    const now = new Date().toISOString();
    const { data: connection, error } = await supabase
      .from("provider_connections")
      .upsert(
        {
          user_id: input.userId,
          workspace_id: input.workspaceId,
          provider: input.provider,
          provider_account_id: input.providerAccountId,
          provider_account_email: input.providerAccountEmail,
          provider_account_name: input.providerAccountName,
          connection_status: "connected",
          granted_scopes: input.scopes,
          access_token_expires_at: input.expiresAt,
          has_refresh_token: Boolean(input.refreshToken),
          connected_by_user_id: input.userId,
          connected_at: now,
          disconnected_at: null,
          revoked_at: null,
          last_error_code: null,
          last_error_message: null,
          provider_metadata: input.metadata ?? {},
        },
        { onConflict: "workspace_id,provider" },
      )
      .select("id")
      .single();
    if (error) throw error;

    const { error: secretError } = await supabase
      .from("provider_connection_secrets")
      .upsert(
        {
          connection_id: connection.id,
          user_id: input.userId,
          workspace_id: input.workspaceId,
          provider: input.provider,
          encrypted_access_token: encryptSecret(input.accessToken),
          encrypted_refresh_token: input.refreshToken
            ? encryptSecret(input.refreshToken)
            : null,
          scope: input.scopes.join(" "),
          expires_at: input.expiresAt,
          provider_metadata: { encrypted: true },
          token_version: 1,
        },
        { onConflict: "connection_id" },
      );
    if (secretError) throw secretError;
    return connection.id as string;
  }

  static async saveWhatsAppConnection(input: {
    userId: string;
    workspaceId: string;
    accessToken: string;
    expiresAt: string | null;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string | null;
    businessName: string | null;
    metadata?: Record<string, unknown>;
  }) {
    assertServerConfigured("whatsapp_business");
    const supabase = admin();
    const now = new Date().toISOString();
    const { data: connection, error } = await supabase
      .from("provider_connections")
      .upsert(
        {
          user_id: input.userId,
          workspace_id: input.workspaceId,
          provider: "whatsapp_business",
          provider_account_id: input.phoneNumberId,
          provider_account_email: input.displayPhoneNumber,
          provider_account_name: input.businessName,
          connection_status: "connected",
          granted_scopes: [
            "whatsapp_business_management",
            "whatsapp_business_messaging",
          ],
          access_token_expires_at: input.expiresAt,
          has_refresh_token: false,
          connected_by_user_id: input.userId,
          connected_at: now,
          disconnected_at: null,
          revoked_at: null,
          last_error_code: null,
          last_error_message: null,
          provider_metadata: {
            ...(input.metadata ?? {}),
            wabaId: input.wabaId,
            phoneNumberId: input.phoneNumberId,
          },
        },
        { onConflict: "workspace_id,provider" },
      )
      .select("id")
      .single();
    if (error) throw error;

    const { error: secretError } = await supabase
      .from("provider_connection_secrets")
      .upsert(
        {
          connection_id: connection.id,
          user_id: input.userId,
          workspace_id: input.workspaceId,
          provider: "whatsapp_business",
          encrypted_access_token: encryptSecret(input.accessToken),
          encrypted_refresh_token: null,
          scope: "whatsapp_business_management whatsapp_business_messaging",
          expires_at: input.expiresAt,
          provider_metadata: {
            encrypted: true,
            wabaId: input.wabaId,
            phoneNumberId: input.phoneNumberId,
          },
          token_version: 1,
        },
        { onConflict: "connection_id" },
      );
    if (secretError) throw secretError;
    return connection.id as string;
  }

  static async getConnectedWhatsAppConnection(input: {
    userId: string;
    workspaceId: string;
  }) {
    assertServerConfigured("whatsapp_business");
    const supabase = admin();
    const { data, error } = await supabase
      .from("provider_connections")
      .select("*")
      .eq("user_id", input.userId)
      .eq("workspace_id", input.workspaceId)
      .eq("provider", "whatsapp_business")
      .eq("connection_status", "connected")
      .maybeSingle();
    if (error) throw error;
    return (data as ProviderConnectionRow | null) ?? null;
  }

  static async getConnectedEmailConnection(input: {
    userId: string;
    workspaceId: string;
    provider?: EmailConnectorProvider | null;
  }) {
    if (input.provider) {
      assertServerConfigured(input.provider);
    } else {
      assertServerConfigured();
    }
    const supabase = admin();
    let query = supabase
      .from("provider_connections")
      .select("*")
      .eq("user_id", input.userId)
      .eq("workspace_id", input.workspaceId)
      .eq("connection_status", "connected");
    if (input.provider) {
      query = query.eq("provider", input.provider);
    } else {
      query = query.in("provider", ["gmail", "outlook"]);
    }
    const { data, error } = await query
      .order("last_successful_action_at", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as ProviderConnectionRow | null) ?? null;
  }

  static async getSecret(connectionId: string) {
    const supabase = admin();
    const { data, error } = await supabase
      .from("provider_connection_secrets")
      .select(
        "connection_id,encrypted_access_token,encrypted_refresh_token,scope,expires_at",
      )
      .eq("connection_id", connectionId)
      .maybeSingle();
    if (error) throw error;
    return (data as ProviderSecretRow | null) ?? null;
  }

  static async readAccessToken(connectionId: string) {
    const secret = await this.getSecret(connectionId);
    return {
      accessToken: safeDecrypt(secret?.encrypted_access_token ?? null),
      refreshToken: safeDecrypt(secret?.encrypted_refresh_token ?? null),
      expiresAt: secret?.expires_at ?? null,
      scope: secret?.scope ?? null,
    };
  }

  static async updateRefreshedToken(input: {
    connectionId: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt: string | null;
  }) {
    const supabase = admin();
    const patch: Record<string, unknown> = {
      encrypted_access_token: encryptSecret(input.accessToken),
      expires_at: input.expiresAt,
    };
    if (input.refreshToken) {
      patch.encrypted_refresh_token = encryptSecret(input.refreshToken);
    }
    const { error: secretError } = await supabase
      .from("provider_connection_secrets")
      .update(patch)
      .eq("connection_id", input.connectionId);
    if (secretError) throw secretError;

    const connectionPatch: Record<string, unknown> = {
      access_token_expires_at: input.expiresAt,
      connection_status: "connected",
      last_successful_refresh_at: new Date().toISOString(),
      last_error_code: null,
      last_error_message: null,
    };
    if (input.refreshToken) connectionPatch.has_refresh_token = true;
    const { error } = await supabase
      .from("provider_connections")
      .update(connectionPatch)
      .eq("id", input.connectionId);
    if (error) throw error;
  }

  static async markConnectionError(input: {
    connectionId: string;
    status: ConnectorStatus;
    code: string;
    message: string;
  }) {
    const supabase = admin();
    const { error } = await supabase
      .from("provider_connections")
      .update({
        connection_status: input.status,
        last_error_code: input.code,
        last_error_message: input.message.slice(0, 240),
      })
      .eq("id", input.connectionId);
    if (error) throw error;
  }

  static async markLastAction(connectionId: string) {
    const supabase = admin();
    const { error } = await supabase
      .from("provider_connections")
      .update({
        last_successful_action_at: new Date().toISOString(),
        last_error_code: null,
        last_error_message: null,
      })
      .eq("id", connectionId);
    if (error) throw error;
  }

  static async disconnect(input: {
    userId: string;
    provider: EmailConnectorProvider;
  }) {
    assertServerConfigured(input.provider);
    const workspaceId = await this.resolveDefaultWorkspaceId(input.userId);
    if (!workspaceId) return null;
    const supabase = admin();
    const { data: connection, error: readError } = await supabase
      .from("provider_connections")
      .select("id")
      .eq("user_id", input.userId)
      .eq("workspace_id", workspaceId)
      .eq("provider", input.provider)
      .maybeSingle();
    if (readError) throw readError;
    if (!connection?.id) return null;
    await supabase
      .from("provider_connection_secrets")
      .delete()
      .eq("connection_id", connection.id);
    const { error } = await supabase
      .from("provider_connections")
      .update({
        connection_status: "disconnected",
        has_refresh_token: false,
        access_token_expires_at: null,
        disconnected_at: new Date().toISOString(),
        revoked_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    if (error) throw error;
    return connection.id as string;
  }

  static async disconnectProvider(input: {
    userId: string;
    provider: ConnectorProvider;
  }) {
    assertServerConfigured(input.provider);
    const workspaceId = await this.resolveDefaultWorkspaceId(input.userId);
    if (!workspaceId) return null;
    const supabase = admin();
    const { data: connection, error: readError } = await supabase
      .from("provider_connections")
      .select("id")
      .eq("user_id", input.userId)
      .eq("workspace_id", workspaceId)
      .eq("provider", input.provider)
      .maybeSingle();
    if (readError) throw readError;
    if (!connection?.id) return null;
    await supabase
      .from("provider_connection_secrets")
      .delete()
      .eq("connection_id", connection.id);
    const { error } = await supabase
      .from("provider_connections")
      .update({
        connection_status: "disconnected",
        has_refresh_token: false,
        access_token_expires_at: null,
        disconnected_at: new Date().toISOString(),
        revoked_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    if (error) throw error;
    return connection.id as string;
  }

  static async createDeliveryRecord(input: {
    userId: string;
    workspaceId: string;
    approvalId: string;
    estimateId: string;
    connectionId: string;
    provider: EmailConnectorProvider;
    recipient: string;
    subject: string;
  }) {
    const supabase = admin();
    const { data: existing, error: existingError } = await supabase
      .from("email_delivery_records")
      .select("*")
      .eq("approval_id", input.approvalId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return existing as {
        id: string;
        status: string;
        provider_message_id: string | null;
      };
    }
    const { data, error } = await supabase
      .from("email_delivery_records")
      .insert({
        user_id: input.userId,
        workspace_id: input.workspaceId,
        approval_id: input.approvalId,
        estimate_id: input.estimateId,
        connection_id: input.connectionId,
        provider: input.provider,
        recipient: input.recipient,
        subject: input.subject,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as {
      id: string;
      status: string;
      provider_message_id: string | null;
    };
  }

  static async completeDelivery(input: {
    deliveryId: string;
    providerMessageId: string;
  }) {
    const supabase = admin();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("email_delivery_records")
      .update({
        status: "sent",
        provider_message_id: input.providerMessageId,
        sent_at: now,
      })
      .eq("id", input.deliveryId);
    if (error) throw error;
    return now;
  }

  static async failDelivery(input: {
    deliveryId: string;
    status: "failed" | "blocked";
    code: string;
    message: string;
  }) {
    const supabase = admin();
    const { error } = await supabase
      .from("email_delivery_records")
      .update({
        status: input.status,
        error_code: input.code,
        error_message: input.message.slice(0, 240),
      })
      .eq("id", input.deliveryId);
    if (error) throw error;
  }
}
