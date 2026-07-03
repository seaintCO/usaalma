import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const supabase = await createClient();

  const { data } = await supabase
    .from("alma_site_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending:false });

  return NextResponse.json(data || []);
}
