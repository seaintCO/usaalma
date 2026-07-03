import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const supabase = await createClient();

  const { data } = await supabase
    .from("tool_runs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending:false });

  return NextResponse.json(data ?? []);
}
