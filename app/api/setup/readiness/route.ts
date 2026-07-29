import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";
import { OAuthRepository } from "@/lib/db/repositories/oauth/oauth.repository";
import { createClient } from "@/lib/supabase/server";

type SetupStatus = "ready" | "action_required" | "owner_action_required";

function statusForConnection(
  connection:
    | {
        status?: string;
        canConnect?: boolean;
      }
    | undefined,
): SetupStatus {
  if (connection?.status === "connected") return "ready";
  if (
    connection?.status === "configuration_required" ||
    connection?.canConnect === false
  ) {
    return "owner_action_required";
  }
  return "action_required";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }

  const supabase = await createClient();
  const [
    profileResult,
    workspaceResult,
    moneyResult,
    voiceSchemaResult,
    connectorResult,
    stripeResult,
  ] = await Promise.allSettled([
    supabase
      .from("business_profiles")
      .select(
        "operating_mode,display_name,industry,preferred_language,onboarding_completed_at",
      )
      .eq("user_id", user.id)
      .is("workspace_id", null)
      .maybeSingle(),
    supabase
      .from("workspaces")
      .select("id,name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("business_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("voice_agent_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    ConnectorRepository.listSummaries(user.id),
    OAuthRepository.getStripeConnectConnection(user.id),
  ]);

  const profileResponse =
    profileResult.status === "fulfilled" ? profileResult.value : null;
  const workspaceResponse =
    workspaceResult.status === "fulfilled" ? workspaceResult.value : null;
  const moneyResponse =
    moneyResult.status === "fulfilled" ? moneyResult.value : null;
  const voiceSchemaResponse =
    voiceSchemaResult.status === "fulfilled" ? voiceSchemaResult.value : null;
  const connections =
    connectorResult.status === "fulfilled" ? connectorResult.value : [];
  const stripe =
    stripeResult.status === "fulfilled" ? stripeResult.value : null;
  const byProvider = new Map(
    connections.map((connection) => [connection.provider, connection]),
  );

  const moneyReady = Boolean(moneyResponse && !moneyResponse.error);
  const voiceSchemaReady = Boolean(
    voiceSchemaResponse && !voiceSchemaResponse.error,
  );
  const profile = profileResponse?.error
    ? null
    : (profileResponse?.data ?? null);
  const workspace = workspaceResponse?.error
    ? null
    : (workspaceResponse?.data ?? null);

  return NextResponse.json({
    ok: true,
    setup: {
      profile: {
        status:
          profile && workspace
            ? ("ready" as const)
            : ("action_required" as const),
        operatingMode: profile?.operating_mode ?? "business",
        businessName: profile?.display_name ?? workspace?.name ?? "",
        industry: profile?.industry ?? "",
        completed: Boolean(profile?.onboarding_completed_at),
      },
      money: {
        status: moneyReady
          ? ("ready" as const)
          : ("owner_action_required" as const),
      },
      connections: {
        gmail: statusForConnection(byProvider.get("gmail")),
        outlook: statusForConnection(byProvider.get("outlook")),
        quickbooks: statusForConnection(byProvider.get("quickbooks")),
        stripe:
          stripe?.connected && stripe.connection_status === "connected"
            ? ("ready" as const)
            : process.env.STRIPE_CLIENT_ID &&
                process.env.STRIPE_SECRET_KEY &&
                process.env.APP_ENCRYPTION_KEY &&
                process.env.SUPABASE_SERVICE_ROLE_KEY
              ? ("action_required" as const)
              : ("owner_action_required" as const),
        voice: voiceSchemaReady
          ? statusForConnection(byProvider.get("elevenlabs"))
          : ("owner_action_required" as const),
      },
    },
  });
}
