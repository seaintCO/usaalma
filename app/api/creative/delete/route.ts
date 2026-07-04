import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ success:false, error:"Missing id" }, { status:400 });
  }

  const supabase = await createClient();

  const { error:dbError } = await supabase
    .from("creative_assets")
    .update({ deleted_at:new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (dbError) {
    return NextResponse.json({ success:false, error:dbError.message }, { status:500 });
  }

  return NextResponse.json({ success:true });
}
