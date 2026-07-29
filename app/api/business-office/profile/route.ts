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
    completeOnboarding?: boolean;
  };
  if (
    !body.operatingMode ||
    !MODES.has(body.operatingMode) ||
    !body.language ||
    !LANGUAGES.has(body.language)
  ) {
    return NextResponse.json(
      { error: { code: "invalid_business_profile" } },
      { status: 400 },
    );
  }

  const supabase = await createClient();
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
  return NextResponse.json({ ok: true });
}
