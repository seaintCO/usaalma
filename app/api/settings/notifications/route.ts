import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  const { data, error } = await (
    await createClient()
  )
    .from("alma_notifications")
    .select("id,title,body,read,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  return error
    ? NextResponse.json(
        { ok: false, error: "notifications_unavailable" },
        { status: 503 },
      )
    : NextResponse.json({ ok: true, notifications: data ?? [] });
}
