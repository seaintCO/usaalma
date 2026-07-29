import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

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
    .select("onboarding_completed_at")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({
      completed: false,
      activationRequired: true,
    });
  }

  return NextResponse.json({
    completed: Boolean(data?.onboarding_completed_at),
    activationRequired: false,
  });
}
