import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const supabase = await createClient();

  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!admin) return NextResponse.json({ error:"Forbidden" }, { status:403 });

  const { data } = await supabase
    .from("call_logs")
    .select("*")
    .order("created_at", { ascending:false });

  return NextResponse.json(data ?? []);
}
