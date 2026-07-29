import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

const MODES = new Set(["business", "creator", "both"]);
const LANGUAGES = new Set(["en", "es"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized" } },
      { status: 401 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_profiles")
    .select("operating_mode,preferred_language,onboarding_completed_at")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: { code: "business_profile_unavailable" } },
      { status: 503 },
    );
  }
  return NextResponse.json({ profile: data ?? null });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized" } },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    operatingMode?: string;
    language?: string;
    businessName?: string;
    industry?: string;
    completeOnboarding?: boolean;
  };
  const businessName = body.businessName?.trim() ?? "";
  const industry = body.industry?.trim() ?? "";
  if (
    !body.operatingMode ||
    !MODES.has(body.operatingMode) ||
    !body.language ||
    !LANGUAGES.has(body.language) ||
    businessName.length > 120 ||
    industry.length > 120
  ) {
    return NextResponse.json(
      { error: { code: "invalid_business_profile" } },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: workspace, error: workspaceReadError } = await supabase
    .from("workspaces")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (workspaceReadError) {
    return NextResponse.json(
      { error: { code: "workspace_unavailable" } },
      { status: 503 },
    );
  }

  let workspaceId = workspace?.id ?? null;
  if (!workspaceId && businessName) {
    const { data: createdWorkspace, error: workspaceCreateError } =
      await supabase
        .from("workspaces")
        .insert({
          owner_id: user.id,
          name: businessName,
          type: body.operatingMode,
        })
        .select("id")
        .single();
    if (workspaceCreateError || !createdWorkspace?.id) {
      return NextResponse.json(
        { error: { code: "workspace_create_failed" } },
        { status: 503 },
      );
    }
    workspaceId = createdWorkspace.id;
    const { error: membershipError } = await supabase
      .from("workspace_members")
      .upsert(
        {
          workspace_id: workspaceId,
          user_id: user.id,
          role: "owner",
        },
        { onConflict: "workspace_id,user_id" },
      );
    if (membershipError) {
      return NextResponse.json(
        { error: { code: "workspace_membership_failed" } },
        { status: 503 },
      );
    }
  } else if (workspaceId && businessName && workspace?.name !== businessName) {
    const { error: workspaceUpdateError } = await supabase
      .from("workspaces")
      .update({ name: businessName })
      .eq("id", workspaceId)
      .eq("owner_id", user.id);
    if (workspaceUpdateError) {
      return NextResponse.json(
        { error: { code: "workspace_update_failed" } },
        { status: 503 },
      );
    }
  }

  const { data: existing, error: readError } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .maybeSingle();
  if (readError) {
    return NextResponse.json(
      { error: { code: "business_profile_unavailable" } },
      { status: 503 },
    );
  }

  const values = {
    operating_mode: body.operatingMode,
    preferred_language: body.language,
    ...(businessName
      ? {
          display_name: businessName,
          legal_name: businessName,
        }
      : {}),
    ...(industry ? { industry } : {}),
    ...(body.completeOnboarding
      ? { onboarding_completed_at: new Date().toISOString() }
      : {}),
  };
  const operation = existing?.id
    ? supabase
        .from("business_profiles")
        .update(values)
        .eq("id", existing.id)
        .eq("user_id", user.id)
    : supabase.from("business_profiles").insert({
        ...values,
        user_id: user.id,
        workspace_id: null,
      });
  const { error } = await operation;
  if (error) {
    return NextResponse.json(
      { error: { code: "business_profile_save_failed" } },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, workspaceId });
}
