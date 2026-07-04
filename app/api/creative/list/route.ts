import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const supabase = await createClient();

  const { data, error: dbError } = await supabase
    .from("creative_assets")
    .select("*")
    .eq("user_id", user.id).is("deleted_at", null).order("created_at", { ascending:false }).limit(60);

  if (dbError) {
    console.error("CREATIVE_LIST_ERROR", dbError);
    return NextResponse.json([]);
  }

  return NextResponse.json(data ?? []);
}

